import type { Database } from '@fansite/db/client'
import type { Player } from '@fansite/db/schema'

import { mergePlayerInto } from '@fansite/db/person-merge'
import { createPersonBook, storePersonNames } from '@fansite/db/persons'
import { comparePlayerGoals } from '@fansite/db/player-stat-differences'
import { players, playerSeasonStats, squadImports, wikipediaPages } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { and, eq, ne } from 'drizzle-orm'

import type { Fetcher } from './fetcher.ts'
import type { MatchImportOptions } from './import-matches.ts'
import type { ReadPlayer } from './read-squad.ts'
import type { CompletenessTotals } from './store-completeness.ts'

import { checkSquad } from './check-wikipedia.ts'
import { healthAfter, wikipediaOrigin } from './import-matches.ts'
import { aliasMap, chosenSpelling, personTitleAliases } from './person-names.ts'
import { describePersons, guessedNameWarnings, lookUpPersonPages, mergeListedPersons } from './person-pages.ts'
import { nameKey, readSquad, searchTerm, squadPageTitle } from './read-squad.ts'
import { pageUrl } from './read-wikipedia.ts'
import { describeChange, storeCompleteness } from './store-completeness.ts'
import { describeError, formatTime, printable } from './text.ts'

/** What came of the import of the squad. Like a match report, every result is a value. */
export type SquadReport =
  | {
      /** Nothing changed in the database: the reason says which check failed. */
      kind: 'error'
      message: string
      season: string
    }
  | {
      /** The chance that the list is the whole squad, as a line; absent if not stored. */
      completeness?: string | undefined
      /** How many of the players found have a country, as the table gives it. */
      countries: { known: number; total: number }
      kind: 'imported'
      persons: string[]
      players: { added: number; left: number; unchanged: number; updated: number }
      season: string
      /** What came of the numbers of the players (see `storeStats`). */
      stats: { added: number; unchanged: number; updated: number }
      warnings: string[]
    }
  | {
      /** The import did not ask: it reads Wikipedia once an hour, and the hour is not over. */
      kind: 'postponed'
      retryAt: Date
      season: string
    }
  | {
      kind: 'blocked-by-robots'
      season: string
      url: string
    }
  | {
      kind: 'wait'
      retryAfterSeconds: null | number
      season: string
      url: string
    }

/** Writes a report as a line of text. */
export function formatSquadReport(report: SquadReport): string {
  const head = `Squad ${report.season}`

  switch (report.kind) {
    case 'blocked-by-robots':
      return `${head}: not read, robots.txt does not allow ${report.url}`
    case 'error':
      return `${head}: warning, nothing changed and the last good copy stays: ${printable(report.message)}`
    case 'imported':
      return [
        `${head}: ${report.players.added} new, ${report.players.updated} updated, ${report.players.unchanged} unchanged, ${report.players.left} left the squad`,
        `${head}: numbers of the players: ${report.stats.added} new, ${report.stats.updated} updated, ${report.stats.unchanged} unchanged`,
        `${head}: countries of the players: ${report.countries.known} of ${report.countries.total} have one`,
        ...report.persons.map((line) => `${head}: ${printable(line)}`),
        ...(report.completeness === undefined ? [] : [report.completeness]),
        ...report.warnings.map((warning) => `${head}: warning, ${printable(warning)}`),
      ].join('\n')
    case 'postponed':
      return `${head}: not read, the next time is from ${formatTime(report.retryAt)}`
    case 'wait':
      return `${head}: not read, Wikipedia asks us to wait${report.retryAfterSeconds === null ? '' : ` ${report.retryAfterSeconds} seconds`}`
  }
}

/**
 * Reads the page of the squad of the current season and stores the players of sc Heerenveen
 * with their numbers (appearances, goals and assists), once an hour at most. The squad goes in
 * the database only when the table is found and every check passes (`checkSquad`), and then
 * all at once in one transaction. Otherwise nothing changes: the last good squad stays, and
 * the report says why. A number we cannot read or link to a player is a warning and a skipped
 * row: they never stop the import. A player whose goals in the table differ from the goals in
 * the matches or the match reports is kept for the editors (`player_stat_differences`).
 *
 * It reads the current season only, unless `endedSeason` names the season that has just ended:
 * the hourly import reads that one in July and August, from the same page and with the same
 * checks as when it was the current season (`importEndedSeason`). Its players are never removed
 * for a first read. The rows of any other season are never changed or removed.
 * A player who is no longer in the table is never removed either, since goals point to his row.
 * The one exception is the first good read of a season, which replaces the made-up squad of the
 * seed (see `readAndStore`).
 * It throws when the health in the database can't be written; the data itself fails into an
 * error report.
 */
export async function importSquad(
  db: Database,
  fetcher: Fetcher,
  {
    clock = () => new Date(),
    endedSeason,
    origin = wikipediaOrigin,
  }: MatchImportOptions & { endedSeason?: string } = {},
): Promise<SquadReport> {
  const season = endedSeason ?? seasonOf(clock())
  const [before] = await db.select().from(squadImports).where(eq(squadImports.season, season))

  if (before?.retryAt !== null && before?.retryAt !== undefined && before.retryAt > clock()) {
    return { kind: 'postponed', retryAt: before.retryAt, season }
  }

  let report: SquadReport

  try {
    report = await readAndStore(
      db,
      fetcher,
      season,
      origin,
      clock,
      endedSeason === undefined && (before?.lastSuccessAt === null || before?.lastSuccessAt === undefined),
    )
  } catch (error) {
    report = { kind: 'error', message: describeError(error), season }
  }

  const health = healthAfter(before, report, clock())

  if (health !== undefined) {
    await db
      .insert(squadImports)
      .values({ season, ...health })
      .onDuplicateKeyUpdate({ set: health })
  }

  return report
}

/**
 * The players the import of the matches made of a scorer (the source `doelpunten`), by their
 * person. A person with two such rows is left out: nothing says which row is meant.
 */
export function scorersByPerson(rows: readonly Player[]): Map<number, Player> {
  const found = new Map<number, Player>()
  const twice = new Set<number>()

  for (const row of rows) {
    if (row.source === 'doelpunten' && row.personId !== null) {
      if (found.has(row.personId)) {
        twice.add(row.personId)
      }

      found.set(row.personId, row)
    }
  }

  for (const personId of twice) {
    found.delete(personId)
  }

  return found
}

/**
 * Gives the rows of a season that still have a spelling the owner replaced the one that stays
 * (`chosenSpelling`), before the squad is stored: the table is read in that spelling, so a row
 * under the other one would not be found and the player would get a second row. A row keeps
 * its `id`; when the season has a row in the spelling that stays already, the other is merged
 * into it (`mergePlayerInto`). The search term follows when it was the surname of the old
 * name. Returns how many rows changed: a second run finds none. Use the transaction.
 */
export async function storeChosenSpellings(
  db: Pick<Database, 'delete' | 'insert' | 'select' | 'update'>,
  season: string,
): Promise<number> {
  const rows = await db.select().from(players).where(eq(players.season, season))
  const gone = new Set<number>()
  let changed = 0

  for (const row of rows) {
    const chosen = chosenSpelling(row.name, row.wikipediaPage)

    if (chosen.name === row.name && chosen.page === row.wikipediaPage) {
      continue
    }

    const stays = rows.find(
      (one) =>
        one.id !== row.id &&
        !gone.has(one.id) &&
        (nameKey(one.name) === nameKey(chosen.name) ||
          (chosen.page !== null && one.wikipediaPage !== null && nameKey(one.wikipediaPage) === nameKey(chosen.page))),
    )

    if (stays === undefined) {
      // The surname of the old name in the new spelling (`Samardžić`), or the new surname.
      const term =
        chosen.name.length === row.name.length && nameKey(row.name).endsWith(nameKey(row.searchTerm))
          ? chosen.name.slice(-row.searchTerm.length)
          : nameKey(chosen.name).endsWith(` ${nameKey(row.searchTerm)}`)
            ? row.searchTerm
            : searchTerm(chosen.name)

      await db
        .update(players)
        .set({ name: chosen.name, searchTerm: term, wikipediaPage: chosen.page })
        .where(eq(players.id, row.id))
      row.name = chosen.name
      row.wikipediaPage = chosen.page
    } else {
      await mergePlayerInto(db, row.id, stays.id)
      gone.add(row.id)
    }

    changed++
  }

  return changed
}

/**
 * Reads, checks and stores. A database failure throws; `importSquad` turns it into a report.
 */
async function readAndStore(
  db: Database,
  fetcher: Fetcher,
  season: string,
  origin: string,
  clock: () => Date,
  firstRead: boolean,
): Promise<SquadReport> {
  const title = squadPageTitle(season)
  const outcome = await fetcher.fetch(pageUrl(origin, title))

  switch (outcome.kind) {
    case 'blocked-by-robots':
      return { kind: 'blocked-by-robots', season, url: outcome.url }
    case 'error':
      return { kind: 'error', message: `${title}: ${outcome.message}`, season }
    case 'fetched':
      break
    case 'not-modified':
      return { kind: 'error', message: `${title}: the page answered 304 to a request without conditions`, season }
    case 'wait':
      return { kind: 'wait', retryAfterSeconds: outcome.retryAfterSeconds, season, url: outcome.url }
  }

  const read = readSquad(new TextDecoder('utf-8').decode(outcome.body))

  if (read.kind === 'error') {
    return { kind: 'error', message: `${title}: ${read.message}`, season }
  }

  const problems = checkSquad(read.players)

  if (problems.length > 0) {
    return { kind: 'error', message: `${title}: ${problems.join('; ')}`, season }
  }

  // A player the table still writes in a spelling the owner replaced gets the one that stays,
  // so he is the row of that spelling and no second row.
  for (const player of read.players) {
    const chosen = chosenSpelling(player.name, player.wikipediaPage)

    player.name = chosen.name
    player.wikipediaPage = chosen.page
  }

  const mergedPersons = await mergeListedPersons(db)
  // Wikipedia is asked before the transaction: no request is made while rows are locked.
  const personLookup = await lookUpPersonPages(
    db,
    fetcher,
    origin,
    read.players.flatMap((player) => (player.wikipediaPage === null ? [] : [player.wikipediaPage])),
    aliasMap(personTitleAliases),
  )
  const now = clock()
  const warnings = [...read.warnings, ...mergedPersons, ...personLookup.warnings]
  const counts = await db.transaction(async (transaction) => {
    const personBook = await createPersonBook(transaction, {
      aliases: aliasMap(personTitleAliases),
      redirects: personLookup.redirects,
    })
    // The first good read of a season replaces what the seed made up, and nothing else: a
    // player from an earlier read stays, and so does a player the import of the matches made
    // of a scorer (the source `doelpunten`). A goal of a made-up player loses its link.
    if (firstRead) {
      await transaction.delete(players).where(and(eq(players.season, season), ne(players.source, 'doelpunten')))
    }

    await storeChosenSpellings(transaction, season)

    const result = await storePlayers(transaction, season, read.players, now, personBook)
    const stats = await storeStats(transaction, season, read.players, result.ids, now)

    warnings.push(...stats.warnings)

    const values = { kind: 'squad' as const, readAt: now, season, version: outcome.lastModified }

    await transaction
      .insert(wikipediaPages)
      .values({ title, ...values })
      .onDuplicateKeyUpdate({ set: values })

    return { ids: result.ids, persons: personBook.counts, players: result.counts, stats: stats.counts }
  })

  const personNames = await storePersonNames(db, personLookup.names)

  warnings.push(...guessedNameWarnings(personNames.guessed))

  // The goals of the table against the matches and the match reports: a difference is kept for
  // the editors, once, until they decide or it is gone (#974). A failure to keep it is a
  // warning that undoes nothing.
  try {
    await db.transaction((transaction) => comparePlayerGoals(transaction, season, now))
  } catch (error) {
    warnings.push(`the goals of the table are not compared with the matches and the reports: ${describeError(error)}`)
  }

  // The chance that the list is whole is a result of its own: a failure to store it is a
  // warning and never undoes a squad that is stored.
  let completeness: string | undefined

  try {
    completeness = describeChange(season, await storeCompleteness(db, season, totalsOf(read.players), now))
  } catch (error) {
    warnings.push(`the completeness is not stored: ${describeError(error)}`)
  }

  return {
    completeness,
    countries: {
      known: read.players.filter((player) => player.country !== null).length,
      total: read.players.length,
    },
    kind: 'imported',
    persons: describePersons(personLookup.asked, counts.persons, personNames.counts),
    players: counts.players,
    season,
    stats: counts.stats,
    warnings,
  }
}

/**
 * Brings the squad of the season in the database up to date with the one we found, and never
 * replaces it, so a player keeps his `id` and the goals that point to it. A player is known by
 * the page his name links to, or else by his name, the way the database keeps names apart
 * (`nameKey`: a name that differs only in an accent is the same player). A player the import of
 * the matches made of a scorer (the source `doelpunten`, #1024) is also known by his person,
 * when the table links another title of his page: he gets the row of the table and the source
 * `selectie`, so his goals keep their player. A player who is not known is added. A known
 * player is changed when his name, page, position, number or person differ, and is put back in
 * the squad if he had left. A player who is not in the table any more is marked as no longer
 * in the squad, with the moment, and stays; a scorer who was never in the table has not left
 * it, and stays as he is. A player who is known
 * keeps his search term, so a correction by hand survives the import. Rows of another season
 * are not touched.
 *
 * `left` counts the players who left the squad in this read, not those who were gone already.
 * `ids` gives the row of each player found, or null for one that could not be placed: a row can
 * be claimed by one player of the table only, and a second one that would land on it is left
 * out, so two players never write to the same row.
 */
async function storePlayers(
  db: Pick<Database, 'insert' | 'select' | 'update'>,
  season: string,
  found: ReadPlayer[],
  now: Date,
  personBook: { resolve: (title: string) => Promise<null | number> },
) {
  const rows = await db.select().from(players).where(eq(players.season, season))
  const byPage = new Map<string, Player>()
  const byName = new Map<string, Player>()
  const scorerOfPerson = scorersByPerson(rows)

  for (const row of rows) {
    byName.set(nameKey(row.name), row)

    if (row.wikipediaPage !== null) {
      byPage.set(nameKey(row.wikipediaPage), row)
    }
  }

  const counts = { added: 0, left: 0, unchanged: 0, updated: 0 }
  const ids = new Map<ReadPlayer, null | number>()
  const seen = new Set<number>()

  for (const player of found) {
    const personId = player.wikipediaPage === null ? null : await personBook.resolve(player.wikipediaPage)
    const before =
      (player.wikipediaPage === null ? undefined : byPage.get(nameKey(player.wikipediaPage))) ??
      byName.get(nameKey(player.name)) ??
      (personId === null ? undefined : scorerOfPerson.get(personId))

    if (before === undefined) {
      counts.added++

      const [{ insertId }] = await db.insert(players).values({ ...player, personId, season, source: 'selectie' })

      ids.set(player, insertId)

      continue
    }
    if (seen.has(before.id)) {
      ids.set(player, null)

      continue
    }

    seen.add(before.id)
    ids.set(player, before.id)

    if (
      before.inSquad &&
      before.source !== 'doelpunten' &&
      before.name === player.name &&
      before.position === player.position &&
      before.shirtNumber === player.shirtNumber &&
      before.country === player.country &&
      before.wikipediaPage === player.wikipediaPage &&
      (personId === null || before.personId === personId)
    ) {
      counts.unchanged++
    } else {
      counts.updated++
      await db
        .update(players)
        .set({
          country: player.country,
          inSquad: true,
          leftSquadAt: null,
          name: player.name,
          personId: personId ?? before.personId,
          position: player.position,
          shirtNumber: player.shirtNumber,
          // A scorer who is in the table now is a player of the table.
          ...(before.source === 'doelpunten' ? { source: 'selectie' as const } : {}),
          wikipediaPage: player.wikipediaPage,
        })
        .where(eq(players.id, before.id))
    }
  }

  for (const row of rows) {
    if (row.inSquad && row.source !== 'doelpunten' && !seen.has(row.id)) {
      counts.left++
      await db.update(players).set({ inSquad: false, leftSquadAt: now }).where(eq(players.id, row.id))
    }
  }

  return { counts, ids }
}

/**
 * Writes the numbers of the players found, one row per player and competition, and never
 * removes one: a player who left the squad keeps his last numbers. Rows with the same numbers
 * stay as they are, so `updated_at` is the moment the numbers last changed. A player without
 * a row to write to (see `storePlayers`) is a warning and a skipped player.
 */
async function storeStats(
  db: Pick<Database, 'insert' | 'select' | 'update'>,
  season: string,
  found: ReadPlayer[],
  ids: Map<ReadPlayer, null | number>,
  now: Date,
) {
  const rows = await db.select().from(playerSeasonStats).where(eq(playerSeasonStats.season, season))
  const known = new Map(rows.map((row) => [`${row.playerId}/${row.competition}`, row]))
  const counts = { added: 0, unchanged: 0, updated: 0 }
  const warnings: string[] = []

  for (const player of found) {
    const playerId = ids.get(player) ?? null

    if (playerId === null) {
      if (player.stats.length > 0) {
        warnings.push(`${player.name}: could not be linked to a player in the squad, so the numbers are skipped`)
      }

      continue
    }

    for (const { appearances, assists, competition, goals } of player.stats) {
      const before = known.get(`${playerId}/${competition}`)

      if (before === undefined) {
        counts.added++
        await db
          .insert(playerSeasonStats)
          .values({ appearances, assists, competition, goals, playerId, season, updatedAt: now })
      } else {
        // The editors took another number of goals over, and the table still says what it said
        // then: their number stays (`player_season_stats.table_goals`).
        const held = before.tableGoals !== null && before.tableGoals === goals
        const wanted = { appearances, assists, goals: held ? before.goals : goals, tableGoals: held ? goals : null }

        if (
          before.appearances === wanted.appearances &&
          before.goals === wanted.goals &&
          before.assists === wanted.assists &&
          before.tableGoals === wanted.tableGoals
        ) {
          counts.unchanged++
        } else {
          counts.updated++
          await db
            .update(playerSeasonStats)
            .set({ ...wanted, updatedAt: now })
            .where(eq(playerSeasonStats.id, before.id))
        }
      }
    }
  }

  return { counts, warnings }
}

/**
 * The sums of the table: the matches and the goals of all players in all competitions, or null
 * when no player has a number.
 */
function totalsOf(found: ReadPlayer[]): CompletenessTotals {
  const stats = found.flatMap((player) => player.stats)

  return {
    goalsTotal: stats.length === 0 ? null : stats.reduce((total, row) => total + row.goals, 0),
    matchesTotal: stats.length === 0 ? null : stats.reduce((total, row) => total + row.appearances, 0),
  }
}
