// Reads the current squad of every club we meet this season from the article of the club on
// the Dutch Wikipedia (#1541), and keeps it in `club_squad_players`, so the name of a player of
// the opponent can be completed and recognised later. One request for the article of each club,
// at most once in seven days; the players with an article get a person, as the players of our
// own squad do. Nothing shows the rows yet, and only the importer asks Wikipedia.
import type { Database } from '@fansite/db/client'
import type { ClubSquadImport } from '@fansite/db/schema'

import { createPersonBook, storePersonNames } from '@fansite/db/persons'
import { clubs, clubSquadImports, clubSquadPlayers, matches } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { rowsByName, shownClubPlayerName } from '@fansite/db/shown-name'
import { and, asc, eq, getTableColumns, isNotNull } from 'drizzle-orm'

import type { Fetcher } from './fetcher.ts'
import type { ClubSquadPlayer } from './read-club-squad.ts'

import { healthAfter, wikipediaOrigin } from './import-matches.ts'
import { aliasMap, personTitleAliases } from './person-names.ts'
import { guessedNameWarnings, lookUpPersonPages, mostFailuresInARow } from './person-pages.ts'
import { readClubSquad } from './read-club-squad.ts'
import { nameKey } from './read-squad.ts'
import { pageUrl } from './read-wikipedia.ts'
import { describeError, printable } from './text.ts'

export type ClubSquadsOptions = {
  clock?: () => Date
  /** The address of the Dutch Wikipedia. */
  origin?: string
}

/** What a run did, for the log. */
export type ClubSquadsReport = {
  /** The clubs whose article was read and whose rows were stored. */
  clubs: number
  /** The rows added, changed and removed, over all clubs. */
  players: { added: number; removed: number; updated: number }
  /** The lines for the warnings, each starting with `Club squads:`. */
  warnings: string[]
}

/** A club is read once in this time. */
export const readClubSquadEvery = 7 * 24 * 60 * 60 * 1000

/** After a read that gave no person to a player with an article, the club waits this long. */
const retryWithoutPersonsAfter = 24 * 60 * 60 * 1000

/**
 * The clubs with an article that we play this season, in a league match or the cup, and that
 * may be read now: those without a row of health, and those whose `retry_at` is over.
 */
export async function clubsToReadSquads(
  db: Pick<Database, 'selectDistinct'>,
  season: string,
  now: Date,
): Promise<{ health: ClubSquadImport | undefined; id: number; name: string; page: string }[]> {
  const rows = await db
    .selectDistinct({ health: clubSquadImports, id: clubs.id, name: clubs.name, page: clubs.wikipediaPage })
    .from(matches)
    .innerJoin(clubs, eq(clubs.id, matches.clubId))
    .leftJoin(clubSquadImports, eq(clubSquadImports.clubId, clubs.id))
    .where(and(eq(matches.season, season), isNotNull(clubs.wikipediaPage)))
    .orderBy(asc(clubs.id))

  return rows.flatMap((row) =>
    row.page === null || (row.health?.retryAt !== null && row.health?.retryAt !== undefined && row.health.retryAt > now)
      ? []
      : [{ health: row.health ?? undefined, id: row.id, name: row.name, page: row.page }],
  )
}

/** The lines for the log: none for a run that read no club and had no warning. */
export function describeClubSquads(report: ClubSquadsReport): string[] {
  const { added, removed, updated } = report.players
  const read =
    report.clubs === 0
      ? []
      : [
          `Club squads: ${report.clubs} ${report.clubs === 1 ? 'club' : 'clubs'} read, ${added} players new, ${updated} updated, ${removed} removed`,
        ]

  return [...report.warnings, ...read]
}

/**
 * Reads the club squads that are due (see `clubsToReadSquads`) and stores them, one club at a
 * time. The rows of a club change only when its article gives a table that can be read: an
 * article without a good Selectie is one line in the log and leaves the rows as they are. A
 * player who is not in the table any more is removed from the rows of the club.
 *
 * Everything goes through the fetcher (our User-Agent, robots.txt, the pause between requests).
 * robots.txt that refuses a request and a server that asks us to wait stop the step at once,
 * and so do `mostFailuresInARow` failed requests in a row. A failing club has its own health,
 * `club_squad_imports`, so the overview of the import shows it. The step never throws for the
 * data; a database failure throws.
 */
export async function importClubSquads(
  db: Database,
  fetcher: Fetcher,
  { clock = () => new Date(), origin = wikipediaOrigin }: ClubSquadsOptions = {},
): Promise<ClubSquadsReport> {
  const report: ClubSquadsReport = { clubs: 0, players: { added: 0, removed: 0, updated: 0 }, warnings: [] }
  const todo = await clubsToReadSquads(db, seasonOf(clock()), clock())
  let failuresInARow = 0

  for (const club of todo) {
    const outcome = await fetcher.fetch(pageUrl(origin, club.page))
    const now = clock()
    const name = printable(club.name)

    if (outcome.kind === 'blocked-by-robots') {
      report.warnings.push(
        `Club squads: robots.txt does not allow ${printable(outcome.url)}, so no more clubs are read`,
      )
      await storeHealth(db, club, { kind: 'blocked-by-robots' }, now)

      break
    }
    if (outcome.kind === 'wait') {
      report.warnings.push(
        `Club squads: Wikipedia asks us to wait (${printable(outcome.url)}), so no more clubs are read`,
      )
      await storeHealth(db, club, { kind: 'wait', retryAfterSeconds: outcome.retryAfterSeconds }, now)

      break
    }
    if (outcome.kind === 'error' && !(outcome.reason === 'http-status' && outcome.status === 404)) {
      report.warnings.push(`Club squads: warning, ${name}: ${printable(outcome.message)}, the rows stay`)
      await storeHealth(db, club, { kind: 'error', message: outcome.message }, now)
      failuresInARow++

      if (failuresInARow >= mostFailuresInARow) {
        break
      }

      continue
    }

    failuresInARow = 0

    // A page that is not there, and a page we cannot read, are a line each and no failed read:
    // the rows stay and the club is asked again in a week.
    const read =
      outcome.kind === 'fetched'
        ? readClubSquad(new TextDecoder('utf-8').decode(outcome.body))
        : { kind: 'error' as const, message: 'the article does not exist' }

    if (read.kind === 'error') {
      report.warnings.push(`Club squads: warning, ${name}: ${printable(read.message)}, the rows stay`)
      await storeHealth(db, club, { kind: 'error', message: read.message }, now, now.getTime() + readClubSquadEvery)

      continue
    }

    try {
      const stored = await storeClubSquad(db, fetcher, origin, club, read.players, now)

      report.clubs++
      report.players.added += stored.counts.added
      report.players.removed += stored.counts.removed
      report.players.updated += stored.counts.updated

      const warnings = [...read.warnings, ...stored.warnings]

      report.warnings.push(...warnings.map((warning) => `Club squads: warning, ${name}: ${printable(warning)}`))
      await storeHealth(
        db,
        club,
        { kind: 'imported', warnings },
        now,
        now.getTime() + (stored.withoutPerson > 0 ? retryWithoutPersonsAfter : readClubSquadEvery),
      )
    } catch (error) {
      report.warnings.push(`Club squads: warning, ${name}: not stored: ${describeError(error)}`)
      await storeHealth(db, club, { kind: 'error', message: describeError(error) }, now)
    }
  }

  return report
}

/**
 * Brings the rows of one club in line with the squad we read: a player is known by his name
 * (`nameKey`), a new one is added, a known one changes when his person, number or position
 * differ, and one who is not in the table is removed. `read_at` is the moment of this read on
 * every row that is in it. A person the player had stays when the table no longer links his
 * name. Wikipedia is asked about the titles before the transaction, so no request is made
 * while rows are locked.
 */
async function storeClubSquad(
  db: Database,
  fetcher: Fetcher,
  origin: string,
  club: { id: number },
  found: ClubSquadPlayer[],
  now: Date,
) {
  const lookup = await lookUpPersonPages(
    db,
    fetcher,
    origin,
    found.flatMap((player) => (player.wikipediaPage === null ? [] : [player.wikipediaPage])),
    aliasMap(personTitleAliases),
  )
  const counts = { added: 0, removed: 0, updated: 0 }
  let withoutPerson = 0

  await db.transaction(async (transaction) => {
    const book = await createPersonBook(transaction, {
      aliases: aliasMap(personTitleAliases),
      redirects: lookup.redirects,
    })
    // A row is found by the name of the source and by the name of its person (#1697).
    const rows = await transaction
      .select({ ...getTableColumns(clubSquadPlayers), name: shownClubPlayerName() })
      .from(clubSquadPlayers)
      .where(eq(clubSquadPlayers.clubId, club.id))
    const byName = rowsByName(rows, nameKey)
    const seen = new Set<number>()

    for (const player of found) {
      const personId = player.wikipediaPage === null ? null : await book.resolve(player.wikipediaPage)
      const before = byName.get(nameKey(player.name))

      if (player.wikipediaPage !== null && personId === null) {
        withoutPerson++
      }
      if (before === undefined) {
        counts.added++
        await transaction.insert(clubSquadPlayers).values({
          clubId: club.id,
          personId,
          position: player.position,
          readAt: now,
          shirtNumber: player.shirtNumber,
          sourceName: player.name,
        })

        continue
      }

      seen.add(before.id)

      const wantedPerson = personId ?? before.personId

      if (
        before.personId !== wantedPerson ||
        before.position !== player.position ||
        before.shirtNumber !== player.shirtNumber ||
        before.sourceName !== player.name
      ) {
        counts.updated++
      }

      await transaction
        .update(clubSquadPlayers)
        .set({
          personId: wantedPerson,
          position: player.position,
          readAt: now,
          shirtNumber: player.shirtNumber,
          sourceName: player.name,
        })
        .where(eq(clubSquadPlayers.id, before.id))
    }

    for (const row of rows) {
      if (!seen.has(row.id) && !found.some((player) => nameKey(player.name) === nameKey(row.sourceName))) {
        counts.removed++
        await transaction.delete(clubSquadPlayers).where(eq(clubSquadPlayers.id, row.id))
      }
    }
  })

  const names = await storePersonNames(db, lookup.names)
  const warnings = [...lookup.warnings, ...guessedNameWarnings(names.guessed)]

  if (withoutPerson > 0) {
    warnings.push(
      `${withoutPerson} ${withoutPerson === 1 ? 'player has' : 'players have'} no person yet, so the article is read again tomorrow`,
    )
  }

  return { counts, warnings, withoutPerson }
}

/**
 * Writes the health of a club (`healthAfter`). `retryAt` replaces the time the health rule
 * gives (an hour), for a read that came to an answer.
 */
async function storeHealth(
  db: Database,
  club: { health: ClubSquadImport | undefined; id: number },
  report: Parameters<typeof healthAfter>[1],
  now: Date,
  retryAt?: number,
): Promise<void> {
  const before = club.health === undefined ? undefined : { ...club.health, season: '' }
  const health = healthAfter(before, report, now)

  if (health === undefined) {
    return
  }

  const values = { ...health, ...(retryAt === undefined ? {} : { retryAt: new Date(retryAt) }) }

  await db
    .insert(clubSquadImports)
    .values({ clubId: club.id, ...values })
    .onDuplicateKeyUpdate({ set: values })
}
