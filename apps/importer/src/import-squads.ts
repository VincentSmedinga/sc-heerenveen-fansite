// The commands that read the squad of a season that is over, `pnpm run import:squad 2007/08`,
// and on the host `import.mjs --squad 2007/08`, and the squads of every season that is over
// from a season on, the oldest first (`pnpm run import:squads 1990/91`, `import.mjs
// --from-squad 1990/91`). The hourly import reads the squad of the current season only. These
// commands check the season before they ask Wikipedia for anything or write anything, take the
// lock of the import, and share one fetcher, as `import:season` and `import:seasons` do.
import { connect } from '@fansite/db/client'
import { lockNameFor, withLock } from '@fansite/db/lock'

import type { ImportOptions } from './import-feeds.ts'
import type { PastSquadReport } from './import-past-squad.ts'

import { createFetcher } from './fetcher.ts'
import { englishWikipediaOrigin, wikipediaOrigin } from './import-matches.ts'
import { formatPastSquadReport, importPastSquad } from './import-past-squad.ts'
import { parseFromSeason, parseSeason } from './import-season.ts'
import { robotsStoreFor } from './robots-store.ts'
import { describeError } from './text.ts'

/** What the command says when it gets no season or a wrong one. */
export const squadUsage = 'Usage: pnpm run import:squad <season>, for example pnpm run import:squad 2007/08'

/** What the command for all seasons says when it gets no season or a wrong one. */
export const fromSquadUsage =
  'Usage: pnpm run import:squads <season>, for example pnpm run import:squads 1990/91, which reads the squad of every season that is over from 1990/91 on'

/** What the command says when a run holds the lock of the import. */
const lockBusy =
  'An import is still running on this database, so this command does nothing. Try again in a few minutes.'

/**
 * Reads the squad of one season that is over from Wikipedia and writes the lines about it. It
 * takes the lock of the import, so it never runs beside a run of cron; when a run holds it,
 * nothing happens and the command says so.
 *
 * Returns the exit code: 0 when the squad is stored or the season has no page, 1 for a refused
 * argument and for a season that could not be read. Nothing is asked or written for a refused
 * argument.
 */
export async function runSquadImport(
  databaseUrl: string,
  argument: string | undefined,
  {
    clock = () => new Date(),
    englishOrigin = englishWikipediaOrigin,
    makeFetcher = (robots) => createFetcher({ robots }),
    wikipediaOrigin: origin = wikipediaOrigin,
    write = console.log,
  }: ImportOptions = {},
): Promise<number> {
  const parsed = parseSeason(argument, clock(), squadUsage)

  if (parsed.kind === 'refused') {
    write(parsed.message)

    return 1
  }
  if (origin === null) {
    write('There is no Wikipedia to read from.')

    return 1
  }

  const { close, db, pool } = connect(databaseUrl)

  try {
    const run = await withLock(pool, lockNameFor(databaseUrl, 'import'), 0, async () => {
      try {
        return await importPastSquad(db, makeFetcher(robotsStoreFor(db, clock)), parsed.season, {
          clock,
          englishOrigin,
          origin,
        })
      } catch (error) {
        return { kind: 'error', message: describeError(error), season: parsed.season } as const
      }
    })

    if (!run.ran) {
      write(lockBusy)

      return 1
    }

    write(formatPastSquadReport(run.result))

    return succeeded(run.result) ? 0 : 1
  } finally {
    await close()
  }
}

/**
 * Reads the squad of every season that is over from the given one on, the oldest first, one at
 * a time, and writes the lines of each, then a summary. Every season takes the lock of the
 * import and lets it go again, so the hourly import can run between two seasons, and a season
 * that finds the lock held is skipped. The seasons share one fetcher, so the rules of
 * robots.txt hold over the whole run. A season that fails is left as it was and does not stop
 * the run; a season without a page is a line in the log and no fault.
 *
 * Returns the exit code: 0 when every season is stored or has no page, 1 for a refused argument
 * and when one or more seasons could not be read. Nothing is asked or written for a refused
 * argument.
 */
export async function runSquadsImport(
  databaseUrl: string,
  argument: string | undefined,
  {
    clock = () => new Date(),
    englishOrigin = englishWikipediaOrigin,
    makeFetcher = (robots) => createFetcher({ robots }),
    wikipediaOrigin: origin = wikipediaOrigin,
    write = console.log,
  }: ImportOptions = {},
): Promise<number> {
  const parsed = parseFromSeason(argument, clock(), fromSquadUsage)

  if (parsed.kind === 'refused') {
    write(parsed.message)

    return 1
  }
  if (origin === null) {
    write('There is no Wikipedia to read from.')

    return 1
  }

  const { close, db, pool } = connect(databaseUrl)
  const failed: { reason: string; season: string }[] = []
  let gaps = 0

  try {
    const fetcher = makeFetcher(robotsStoreFor(db, clock))

    for (const season of parsed.seasons) {
      const run = await withLock(pool, lockNameFor(databaseUrl, 'import'), 0, async () => {
        try {
          return await importPastSquad(db, fetcher, season, { clock, englishOrigin, origin })
        } catch (error) {
          return { kind: 'error', message: describeError(error), season } as const
        }
      })

      if (!run.ran) {
        write(`Squad ${season}: not read. ${lockBusy}`)
        failed.push({ reason: lockBusy, season })

        continue
      }

      const text = formatPastSquadReport(run.result)

      write(text)
      if (run.result.kind === 'none') {
        gaps++
      }
      if (!succeeded(run.result)) {
        failed.push({ reason: text.slice(`Squad ${season}: `.length), season })
      }
    }
  } finally {
    await close()
  }

  write(
    [
      `Squads: ${parsed.seasons.length - failed.length} of ${parsed.seasons.length} read${gaps === 0 ? '' : `, ${gaps} of them without a page`}${failed.length === 0 ? '.' : `, ${failed.length} not read:`}`,
      ...failed.map(({ reason, season }) => `  ${season}: ${reason}`),
    ].join('\n'),
  )

  return failed.length === 0 ? 0 : 1
}

/** Whether a report is no fault: the squad is stored, or the season is a gap in Wikipedia. */
function succeeded(report: PastSquadReport): boolean {
  return report.kind === 'imported' || report.kind === 'none'
}
