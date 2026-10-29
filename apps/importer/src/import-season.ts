// The command that reads a season that is over, `pnpm run import:season 2025/26`, and on the
// host `import.mjs --season 2025/26`. The hourly import reads the current season only; a
// season that is over doesn't change, so this reads it once, by hand. It checks the season
// before it asks Wikipedia for anything or writes anything.
import { connect } from '@fansite/db/client'
import { lockNameFor, withLock } from '@fansite/db/lock'
import { seasonOf } from '@fansite/db/season'

import type { ImportOptions } from './import-feeds.ts'

import { createFetcher } from './fetcher.ts'
import { formatMatchReport, importPastSeason, isPastSeason, wikipediaOrigin } from './import-matches.ts'
import { robotsStoreFor } from './robots-store.ts'
import { describeError } from './text.ts'

/** What the command says when it gets no season or a wrong one. */
export const seasonUsage = 'Usage: pnpm run import:season <season>, for example pnpm run import:season 2025/26'

/**
 * Reads the argument of the command: a season written `2025/26` (the year, a slash and the last
 * two digits of the next year) that is over. Anything else is refused with a sentence that says
 * why.
 */
export function parseSeason(
  argument: string | undefined,
  now: Date,
): { kind: 'refused'; message: string } | { kind: 'season'; season: string } {
  const refuse = (message: string) => ({ kind: 'refused', message: `${message}\n${seasonUsage}` }) as const

  if (argument === undefined || argument === '') {
    return refuse('No season given.')
  }

  const parts = /^(\d{4})\/(\d{2})$/u.exec(argument)

  if (parts === null) {
    return refuse(`'${argument.slice(0, 40)}' is not a season: write the year, a slash and two digits, like 2025/26.`)
  }

  const year = Number(parts[1])

  if (Number(parts[2]) !== (year + 1) % 100) {
    return refuse(`'${argument}' is not a season: the second year must follow the first, like 2025/26.`)
  }
  if (!isPastSeason(argument, now)) {
    const current = seasonOf(now)

    return refuse(
      argument === current
        ? `${argument} is the current season, which the hourly import reads. This command is for a season that is over.`
        : `${argument} has not started yet. This command is for a season that is over.`,
    )
  }

  return { kind: 'season', season: argument }
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
      try {
        return await importPastSeason(db, makeFetcher(robotsStoreFor(db, clock)), parsed.season, { clock, origin })
      } catch (error) {
        return { kind: 'error', message: describeError(error), season: parsed.season } as const
      }
    })

    if (!run.ran) {
      write('An import is still running on this database, so this command does nothing. Try again in a few minutes.')

      return 1
    }

    write(formatMatchReport(run.result))

    return run.result.kind === 'imported' ? 0 : 1
  } finally {
    await close()
  }
}
