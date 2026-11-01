// The command that reads a season that is over, `pnpm run import:season 2025/26`, and on the
// host `import.mjs --season 2025/26`. The hourly import reads the current season only; a
// season that is over doesn't change, so this reads it once, by hand. It checks the season
// before it asks Wikipedia for anything or writes anything.
//
// With `--from-season 2020/21` it reads every season that is over from that season on, the
// oldest first, one after the other (`import.mjs --from-season 2020/21` on the host). The loop
// is here and not in the workflow, so it has a test.
import { connect } from '@fansite/db/client'
import { lockNameFor, withLock } from '@fansite/db/lock'
import { seasonOf } from '@fansite/db/season'

import type { ImportOptions } from './import-feeds.ts'

import { createFetcher } from './fetcher.ts'
import {
  formatMatchReport,
  importPastSeason,
  isPastSeason,
  isSeason,
  repairKnownClubs,
  wikipediaOrigin,
} from './import-matches.ts'
import { robotsStoreFor } from './robots-store.ts'
import { describeError } from './text.ts'

/** What the command says when it gets no season or a wrong one. */
export const seasonUsage = 'Usage: pnpm run import:season <season>, for example pnpm run import:season 2025/26'

/** What the command for all seasons says when it gets no season or a wrong one. */
export const fromSeasonUsage =
  'Usage: pnpm run import:seasons <season>, for example pnpm run import:seasons 2020/21, which reads every season that is over from 2020/21 on'

/** What the command says when a run holds the lock of the import. */
const lockBusy =
  'An import is still running on this database, so this command does nothing. Try again in a few minutes.'

type Checked = { kind: 'refused'; message: string } | { kind: 'season'; season: string }

/**
 * Reads the argument of the command for all seasons: the season to start with. The seasons it
 * gives are those from there up to and including the last season that is over, the oldest
 * first. A season that is not one, that has not started yet and the current season (so there is
 * nothing to read) are refused with a sentence that says why.
 */
export function parseFromSeason(
  argument: string | undefined,
  now: Date,
): { kind: 'refused'; message: string } | { kind: 'seasons'; seasons: string[] } {
  const checked = checkSeason(argument)
  const refuse = (message: string) => ({ kind: 'refused', message: `${message}\n${fromSeasonUsage}` }) as const

  if (checked.kind === 'refused') {
    return refuse(checked.message)
  }

  const current = seasonOf(now)

  if (checked.season === current) {
    return refuse(
      `${checked.season} is the current season, which the hourly import reads. There is no season that is over to read from it on.`,
    )
  }
  if (!isPastSeason(checked.season, now)) {
    return refuse(`${checked.season} has not started yet. There is no season that is over to read from it on.`)
  }

  const seasons: string[] = []

  for (let year = Number(checked.season.slice(0, 4)); year < Number(current.slice(0, 4)); year++) {
    seasons.push(`${year}/${String((year + 1) % 100).padStart(2, '0')}`)
  }

  return { kind: 'seasons', seasons }
}

/**
 * Reads the argument of the command: a season written `2025/26` that is over. Anything else is
 * refused with a sentence that says why.
 */
export function parseSeason(
  argument: string | undefined,
  now: Date,
): { kind: 'refused'; message: string } | { kind: 'season'; season: string } {
  const checked = checkSeason(argument)

  if (checked.kind === 'refused') {
    return { kind: 'refused', message: `${checked.message}\n${seasonUsage}` }
  }
  if (!isPastSeason(checked.season, now)) {
    const current = seasonOf(now)

    return {
      kind: 'refused',
      message: `${
        checked.season === current
          ? `${checked.season} is the current season, which the hourly import reads. This command is for a season that is over.`
          : `${checked.season} has not started yet. This command is for a season that is over.`
      }\n${seasonUsage}`,
    }
  }

  return checked
}

/**
 * Reads one season that is over from Wikipedia, with the same fetcher, checks and storage as
 * the hourly import, and writes one line about it. It takes the lock of the import, so it never
 * runs beside a run of cron; when a run holds it, nothing happens and the command says so.
 *
 * Returns the exit code: 0 when the season is stored, 1 for a refused argument and for a season
 * that could not be read or stored. Nothing is asked or written for a refused argument.
 */
export async function runSeasonImport(
  databaseUrl: string,
  argument: string | undefined,
  {
    clock = () => new Date(),
    makeFetcher = (robots) => createFetcher({ robots }),
    wikipediaOrigin: origin = wikipediaOrigin,
    write = console.log,
  }: ImportOptions = {},
): Promise<number> {
  const parsed = parseSeason(argument, clock())

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
      // As in the hourly import: the clubs are right before the season is read.
      for (const line of await repairKnownClubs(db, clock)) {
        write(line)
      }

      try {
        return await importPastSeason(db, makeFetcher(robotsStoreFor(db, clock)), parsed.season, { clock, origin })
      } catch (error) {
        return { kind: 'error', message: describeError(error), season: parsed.season } as const
      }
    })

    if (!run.ran) {
      write(lockBusy)

      return 1
    }

    write(formatMatchReport(run.result))

    return run.result.kind === 'imported' ? 0 : 1
  } finally {
    await close()
  }
}

/**
 * Reads every season that is over from the given one on, the oldest first, one at a time, and
 * writes one line for each, then a summary. Every season takes the lock of the import and lets
 * it go again, so the hourly import can run between two seasons, and a season that finds the
 * lock held is skipped. The seasons share one fetcher, so the rules of robots.txt hold over the
 * whole run. A season that fails does not stop the run; the rest is read.
 *
 * Returns the exit code: 0 when every season is stored, 1 for a refused argument and when one
 * or more seasons could not be read or stored. Nothing is asked or written for a refused
 * argument.
 */
export async function runSeasonsImport(
  databaseUrl: string,
  argument: string | undefined,
  {
    clock = () => new Date(),
    makeFetcher = (robots) => createFetcher({ robots }),
    wikipediaOrigin: origin = wikipediaOrigin,
    write = console.log,
  }: ImportOptions = {},
): Promise<number> {
  const parsed = parseFromSeason(argument, clock())

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

  try {
    const fetcher = makeFetcher(robotsStoreFor(db, clock))

    for (const season of parsed.seasons) {
      const run = await withLock(pool, lockNameFor(databaseUrl, 'import'), 0, async () => {
        const lines = await repairKnownClubs(db, clock)

        try {
          return { lines, report: await importPastSeason(db, fetcher, season, { clock, origin }) }
        } catch (error) {
          return { lines, report: { kind: 'error', message: describeError(error), season } as const }
        }
      })

      if (!run.ran) {
        write(`Matches ${season}: not read. ${lockBusy}`)
        failed.push({ reason: lockBusy, season })

        continue
      }

      for (const line of run.result.lines) {
        write(line)
      }

      const text = formatMatchReport(run.result.report)

      write(text)
      if (run.result.report.kind !== 'imported') {
        failed.push({ reason: text.slice(`Matches ${season}: `.length), season })
      }
    }
  } finally {
    await close()
  }

  write(
    [
      `Seasons: ${parsed.seasons.length - failed.length} of ${parsed.seasons.length} read${failed.length === 0 ? '.' : `, ${failed.length} not read:`}`,
      ...failed.map(({ reason, season }) => `  ${season}: ${reason}`),
    ].join('\n'),
  )

  return failed.length === 0 ? 0 : 1
}

/**
 * Checks that an argument is a season, written `2025/26` (the year, a slash and the last two
 * digits of the next year). The reason of a refusal is a sentence that says why.
 */
function checkSeason(argument: string | undefined): Checked {
  if (argument === undefined || argument === '') {
    return { kind: 'refused', message: 'No season given.' }
  }

  // `isSeason` decides what a season is; the checks here only choose the sentence.
  if (!/^\d{4}\/\d{2}$/u.test(argument)) {
    return {
      kind: 'refused',
      message: `'${argument.slice(0, 40)}' is not a season: write the year, a slash and two digits, like 2025/26.`,
    }
  }
  if (!isSeason(argument)) {
    return {
      kind: 'refused',
      message: `'${argument}' is not a season: the second year must follow the first, like 2025/26.`,
    }
  }

  return { kind: 'season', season: argument }
}
