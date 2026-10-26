import type { Database } from '@fansite/db/client'
import type { Player } from '@fansite/db/schema'

import { players, squadImports, wikipediaPages } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { and, eq, inArray } from 'drizzle-orm'

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
      players: { added: number; removed: number; unchanged: number; updated: number }
      season: string
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
        `${head}: ${report.players.added} new, ${report.players.updated} updated, ${report.players.unchanged} unchanged, ${report.players.removed} removed`,
        ...report.warnings.map((warning) => `${head}: warning, ${printable(warning)}`),
      ].join('\n')
    case 'postponed':
      return `${head}: not read, the next time is from ${formatTime(report.retryAt)}`
    case 'wait':
      return `${head}: not read, Wikipedia asks us to wait${report.retryAfterSeconds === null ? '' : ` ${report.retryAfterSeconds} seconds`}`
  }
}

/**
 * Reads the page of the squad of the current season and stores the players of sc Heerenveen,
 * once an hour at most. The squad goes in the database only when the table is found and every
 * check passes (`checkSquad`), and then all at once in one transaction. Otherwise nothing
 * changes: the last good squad stays, and the report says why.
 *
 * It reads the current season only. The rows of an earlier season are never changed or removed.
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
    report = await readAndStore(db, fetcher, season, origin, clock)
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
 * Reads, checks and stores. A database failure throws; `importSquad` turns it into a report.
 */
async function readAndStore(
  db: Database,
  fetcher: Fetcher,
  season: string,
  origin: string,
  clock: () => Date,
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
  const counts = await db.transaction(async (transaction) => {
    const result = await storePlayers(transaction, season, read.players)
    const values = { kind: 'squad' as const, readAt: now, season, version: outcome.lastModified }

    await transaction
      .insert(wikipediaPages)
      .values({ title, ...values })
      .onDuplicateKeyUpdate({ set: values })

    return result
  })

  return { kind: 'imported', players: counts, season, warnings: [] }
}

/**
 * Makes the squad of the season in the database the one we found: a player is added when the
 * season has no row with his name, changed when his name, position or number differ, and
 * removed when the table no longer has him. A player that is known keeps his search term, so a
 * correction by hand survives the import. Rows of another season are not touched.
 */
async function storePlayers(
  db: Pick<Database, 'delete' | 'insert' | 'select' | 'update'>,
  season: string,
  found: ReadPlayer[],
) {
  // The database keeps names apart as `nameKey` does, so a name that differs only in an accent
  // is the same player.
  const known = new Map<string, Player>(
    (await db.select().from(players).where(eq(players.season, season))).map((row) => [nameKey(row.name), row]),
  )
  const counts = { added: 0, removed: 0, unchanged: 0, updated: 0 }

  for (const player of found) {
    const before = known.get(nameKey(player.name))

    known.delete(nameKey(player.name))

    if (before === undefined) {
      counts.added++
      await db.insert(players).values({ ...player, season })
    } else if (
      before.name === player.name &&
      before.position === player.position &&
      before.shirtNumber === player.shirtNumber
    ) {
      counts.unchanged++
    } else {
      counts.updated++
      await db
        .update(players)
        .set({ name: player.name, position: player.position, shirtNumber: player.shirtNumber })
        .where(eq(players.id, before.id))
    }
  }

  const gone = [...known.values()].map((row) => row.id)

  if (gone.length > 0) {
    counts.removed = gone.length
    await db.delete(players).where(and(eq(players.season, season), inArray(players.id, gone)))
  }

  return counts
}
