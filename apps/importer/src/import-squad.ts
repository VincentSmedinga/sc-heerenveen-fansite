import type { Database } from '@fansite/db/client'
import type { Player } from '@fansite/db/schema'

import { matches, matchGoals, players, playerSeasonStats, squadImports, wikipediaPages } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { and, count, eq, isNotNull } from 'drizzle-orm'

import type { Fetcher } from './fetcher.ts'
import type { MatchImportOptions } from './import-matches.ts'
import type { ReadPlayer } from './read-squad.ts'

import { checkSquad } from './check-wikipedia.ts'
import { healthAfter, wikipediaOrigin } from './import-matches.ts'
import { nameKey, readSquad, squadPageTitle } from './read-squad.ts'
import { pageUrl } from './read-wikipedia.ts'
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
      kind: 'imported'
      players: { added: number; left: number; unchanged: number; updated: number }
      season: string
      /** What came of the numbers of the players (see `storeStats`). */
      stats: { added: number; unchanged: number; updated: number }
      warnings: string[]
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
 * row, and so is a player whose goals in the table differ from the goals in the matches
 * (`goalsWarnings`): they never stop the import.
 *
 * It reads the current season only. The rows of an earlier season are never changed or removed.
 * A player who is no longer in the table is never removed either, since goals point to his row.
 * The one exception is the first good read of a season, which replaces the made-up squad of the
 * seed (see `readAndStore`).
 * It throws when the health in the database can't be written; the data itself fails into an
 * error report.
 */
export async function importSquad(
  db: Database,
  fetcher: Fetcher,
  { clock = () => new Date(), origin = wikipediaOrigin }: MatchImportOptions = {},
): Promise<SquadReport> {
  const season = seasonOf(clock())
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
      before?.lastSuccessAt === null || before?.lastSuccessAt === undefined,
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
 * Compares the goals in the table with the goals of the matches, for each player and
 * competition the table gives numbers for. The goals of the matches are those of ours that the
 * match import linked to the player and that are not own goals. One warning for each
 * difference, with the name, the season, the competition and both numbers. It changes nothing:
 * the table is the source of the numbers we show. A match page that did not name the scorers
 * yet or a table that runs a round behind shows up here, and so does the first run on an empty
 * database, before the match import has linked the goals to the new players (the next run
 * finds them). A season without a match that was played has nothing to compare with and gives
 * no warning.
 */
async function goalsWarnings(
  db: Database,
  season: string,
  found: ReadPlayer[],
  ids: Map<ReadPlayer, null | number>,
): Promise<string[]> {
  const [played] = await db
    .select({ total: count() })
    .from(matches)
    .where(and(eq(matches.season, season), eq(matches.status, 'played')))

  // Without a match that was played there is nothing to compare with, which is no news.
  if (played === undefined || played.total === 0) {
    return []
  }

  const counted = await db
    .select({ competition: matches.competition, goals: count(), playerId: matchGoals.playerId })
    .from(matchGoals)
    .innerJoin(matches, eq(matchGoals.matchId, matches.id))
    .where(
      and(
        eq(matches.season, season),
        eq(matchGoals.ours, true),
        eq(matchGoals.ownGoal, false),
        isNotNull(matchGoals.playerId),
      ),
    )
    .groupBy(matches.competition, matchGoals.playerId)
  const fromMatches = new Map(counted.map((row) => [`${row.playerId}/${row.competition}`, row.goals]))
  const warnings: string[] = []

  for (const player of found) {
    const playerId = ids.get(player) ?? null

    if (playerId === null) {
      continue
    }

    for (const { competition, goals } of player.stats) {
      const matched = fromMatches.get(`${playerId}/${competition}`) ?? 0

      if (matched !== goals) {
        warnings.push(
          `${player.name} (${season}) has ${goals} ${goals === 1 ? 'goal' : 'goals'} in the ${competition} in the squad table and ${matched} in the matches`,
        )
      }
    }
  }

  return warnings
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

  const now = clock()
  const warnings = [...read.warnings]
  const counts = await db.transaction(async (transaction) => {
    // The first good read of a season replaces what the seed made up, and nothing else: a
    // player from an earlier read stays. A goal of a made-up player loses its link.
    if (firstRead) {
      await transaction.delete(players).where(eq(players.season, season))
    }

    const result = await storePlayers(transaction, season, read.players, now)
    const stats = await storeStats(transaction, season, read.players, result.ids, now)

    warnings.push(...stats.warnings)

    const values = { kind: 'squad' as const, readAt: now, season, version: outcome.lastModified }

    await transaction
      .insert(wikipediaPages)
      .values({ title, ...values })
      .onDuplicateKeyUpdate({ set: values })

    return { ids: result.ids, players: result.counts, stats: stats.counts }
  })

  warnings.push(...(await goalsWarnings(db, season, read.players, counts.ids)))

  return { kind: 'imported', players: counts.players, season, stats: counts.stats, warnings }
}

/**
 * Brings the squad of the season in the database up to date with the one we found, and never
 * replaces it, so a player keeps his `id` and the goals that point to it. A player is known by
 * the page his name links to, or else by his name, the way the database keeps names apart
 * (`nameKey`: a name that differs only in an accent is the same player). A player who is not
 * known is added. A known player is changed when his name, page, position or number differ, and
 * is put back in the squad if he had left. A player who is not in the table any more is marked
 * as no longer in the squad, with the moment, and stays. A player who is known keeps his search
 * term, so a correction by hand survives the import. Rows of another season are not touched.
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
) {
  const rows = await db.select().from(players).where(eq(players.season, season))
  const byPage = new Map<string, Player>()
  const byName = new Map<string, Player>()

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
    const before =
      (player.wikipediaPage === null ? undefined : byPage.get(nameKey(player.wikipediaPage))) ??
      byName.get(nameKey(player.name))

    if (before === undefined) {
      counts.added++

      const [{ insertId }] = await db.insert(players).values({ ...player, season })

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
      before.name === player.name &&
      before.position === player.position &&
      before.shirtNumber === player.shirtNumber &&
      before.wikipediaPage === player.wikipediaPage
    ) {
      counts.unchanged++
    } else {
      counts.updated++
      await db
        .update(players)
        .set({
          inSquad: true,
          leftSquadAt: null,
          name: player.name,
          position: player.position,
          shirtNumber: player.shirtNumber,
          wikipediaPage: player.wikipediaPage,
        })
        .where(eq(players.id, before.id))
    }
  }

  for (const row of rows) {
    if (row.inSquad && !seen.has(row.id)) {
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
      } else if (before.appearances === appearances && before.goals === goals && before.assists === assists) {
        counts.unchanged++
      } else {
        counts.updated++
        await db
          .update(playerSeasonStats)
          .set({ appearances, assists, goals, updatedAt: now })
          .where(eq(playerSeasonStats.id, before.id))
      }
    }
  }

  return { counts, warnings }
}
