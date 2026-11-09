// The hourly import reads the season that has just ended once a week, from 1 July up to and
// including 31 August (#975). A late correction on Wikipedia, such as a scorer or an
// attendance, then comes in without a run of `Import season` by hand. It reads the matches and
// the squad with the commands for a season that is over (`importPastSeason` and
// `importPastSquad`), so with the same checks, and it uses the pause of the season in
// `match_imports.retry_at` and `squad_imports.retry_at`: after a read that came to a verdict,
// the next one is a week later.
import type { Database } from '@fansite/db/client'

import { matchImports, squadImports } from '@fansite/db/schema'
import { eq } from 'drizzle-orm'

import type { Fetcher } from './fetcher.ts'
import type { MatchImportOptions } from './import-matches.ts'

import { formatMatchReport, importPastSeason } from './import-matches.ts'
import { formatPastSquadReport, importPastSquad } from './import-past-squad.ts'
import { describeError } from './text.ts'

/** The time between two reads of the season that has ended: a week. */
export const rereadEveryMs = 7 * 24 * 60 * 60 * 1000

/**
 * The season that has just ended, while the hourly import still reads it: the season before
 * that of the moment, from 1 July up to and including 31 August. Undefined in the other months.
 * The days are those of UTC, like the day a season starts on (`seasonOf`), so the season is
 * never the one before last.
 */
export function endedSeasonOf(moment: Date): string | undefined {
  const month = moment.getUTCMonth()

  if (month !== 6 && month !== 7) {
    return undefined
  }

  const year = moment.getUTCFullYear() - 1

  return `${year}/${String((year + 1) % 100).padStart(2, '0')}`
}

/**
 * Reads the matches and then the squad of the season that has just ended, each once a week at
 * most, and returns the lines to write. Outside July and August, and while the week of a part
 * is not over, it asks nothing and says nothing.
 *
 * A read that fails is a warning in the lines and in the health of that season: it never
 * throws, it stops neither the other part nor the current season, and it counts for no alert.
 * After a read that is stored or that fails, the next one is a week later. When Wikipedia asks
 * us to wait or robots.txt refuses, the shorter pause of the health stays, since nothing was
 * read.
 */
export async function importEndedSeason(
  db: Database,
  fetcher: Fetcher,
  options: MatchImportOptions = {},
): Promise<string[]> {
  const clock = options.clock ?? (() => new Date())
  const season = endedSeasonOf(clock())
  const lines: string[] = []

  if (season === undefined) {
    return lines
  }

  try {
    const [before] = await db.select().from(matchImports).where(eq(matchImports.season, season))

    if (!isPaused(before, clock())) {
      const report = await importPastSeason(db, fetcher, season, options)

      lines.push(formatMatchReport(report))
      if (report.kind === 'imported' || report.kind === 'error') {
        const retryAt = new Date(clock().getTime() + rereadEveryMs)

        // The read wrote the row; the values to insert are there for the types only.
        await db
          .insert(matchImports)
          .values({ lastOutcome: report.kind, retryAt, season })
          .onDuplicateKeyUpdate({ set: { retryAt } })
      }
    }
  } catch (error) {
    lines.push(`Matches ${season}: warning, not imported: ${describeError(error)}`)
  }
  try {
    const [before] = await db.select().from(squadImports).where(eq(squadImports.season, season))

    if (!isPaused(before, clock())) {
      const report = await importPastSquad(db, fetcher, season, options)

      lines.push(formatPastSquadReport(report))
      if (report.kind === 'imported' || report.kind === 'error' || report.kind === 'none') {
        const retryAt = new Date(clock().getTime() + rereadEveryMs)

        // A season without a squad page has no row yet: it gets one, so that it waits a week
        // too.
        await db
          .insert(squadImports)
          .values({ lastOutcome: report.kind === 'error' ? 'error' : 'imported', retryAt, season })
          .onDuplicateKeyUpdate({ set: { retryAt } })
      }
    }
  } catch (error) {
    lines.push(`Squad ${season}: warning, not imported: ${describeError(error)}`)
  }

  return lines
}

/** Whether the pause of a season is not over yet. */
function isPaused(health: undefined | { retryAt: Date | null }, now: Date): boolean {
  return health?.retryAt !== null && health?.retryAt !== undefined && health.retryAt > now
}
