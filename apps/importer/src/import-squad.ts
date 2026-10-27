import type { Database } from '@fansite/db/client'
import type { Player } from '@fansite/db/schema'

import { players, squadImports, wikipediaPages } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { eq } from 'drizzle-orm'

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
  const counts = await db.transaction(async (transaction) => {
    // The first good read of a season replaces what the seed made up, and nothing else: a
    // player from an earlier read stays. A goal of a made-up player loses its link.
    if (firstRead) {
      await transaction.delete(players).where(eq(players.season, season))
    }

    const result = await storePlayers(transaction, season, read.players, now)
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
  const seen = new Set<number>()

  for (const player of found) {
    const before =
      (player.wikipediaPage === null ? undefined : byPage.get(nameKey(player.wikipediaPage))) ??
      byName.get(nameKey(player.name))

    if (before === undefined) {
      counts.added++
      await db.insert(players).values({ ...player, season })

      continue
    }

    seen.add(before.id)

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

  return counts
}
