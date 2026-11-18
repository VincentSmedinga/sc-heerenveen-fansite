// The command for the final tables of the seasons 1990/91 to 2009/10 (#1402): `pnpm run
// import:tables` reads all of them, `pnpm run import:tables 1998/99` one. The seasons are those
// of the list in `old-standings.ts`. Every season takes the lock of the import and lets it go
// again, so the hourly import can run between two seasons. The seasons share one fetcher, so
// the rules of robots.txt hold over the whole run, and a season that fails does not stop it.
import { connect } from '@fansite/db/client'
import { lockNameFor, withLock } from '@fansite/db/lock'

import type { ImportOptions } from './import-feeds.ts'
import type { OldStandingsReport } from './old-standings.ts'

import { createFetcher } from './fetcher.ts'
import { wikipediaOrigin } from './import-matches.ts'
import { importOldStandings, oldStandingsSeasons } from './old-standings.ts'
import { robotsStoreFor } from './robots-store.ts'
import { describeError } from './text.ts'

/** What the command says when it gets a season that is not in the list. */
export const tablesUsage = `Usage: pnpm run import:tables [<season>], for example pnpm run import:tables 1998/99. Without a season it reads the final tables of ${oldStandingsSeasons[0]} to ${oldStandingsSeasons.at(-1)}.`

/** The line of the log for one season. */
export function formatTableReport(report: OldStandingsReport): string {
  return report.kind === 'error'
    ? `Table ${report.season}: not stored: ${report.message}`
    : [
        `Table ${report.season}: ${report.rows} clubs of the ${report.competition} for ${report.validOn}`,
        ...report.warnings.map((warning) => `  ${warning}`),
      ].join('\n')
}

/**
 * Reads the final tables and writes one line for each, then a summary. Returns the exit code: 0
 * when every season is stored, 1 for a season that is not in the list and when one or more
 * seasons could not be read or stored. Nothing is asked or written for a season that is not in
 * the list.
 */
export async function runTablesImport(
  databaseUrl: string,
  argument: string | undefined,
  {
    clock = () => new Date(),
    makeFetcher = (robots) => createFetcher({ robots }),
    wikipediaOrigin: origin = wikipediaOrigin,
    write = console.log,
  }: ImportOptions = {},
): Promise<number> {
  // The workflow passes an empty word when no season is typed.
  const season = argument === '' ? undefined : argument

  if (season !== undefined && !oldStandingsSeasons.includes(season)) {
    write(`${season} has no final table to read.\n${tablesUsage}`)

    return 1
  }
  if (origin === null) {
    write('There is no Wikipedia to read from.')

    return 1
  }

  const seasons = season === undefined ? oldStandingsSeasons : [season]
  const { close, db, pool } = connect(databaseUrl)
  let stored = 0

  try {
    const fetcher = makeFetcher(robotsStoreFor(db, clock))

    for (const one of seasons) {
      const run = await withLock(pool, lockNameFor(databaseUrl, 'import'), 0, async () => {
        try {
          return await importOldStandings(db, fetcher, one, origin, clock())
        } catch (error) {
          return { kind: 'error', message: describeError(error), season: one } as const
        }
      })

      if (!run.ran) {
        write(`Table ${one}: not read. An import is still running on this database. Try again in a few minutes.`)

        continue
      }

      write(formatTableReport(run.result))
      stored += run.result.kind === 'imported' ? 1 : 0
    }
  } finally {
    await close()
  }

  write(`Tables: ${stored} of ${seasons.length} stored.`)

  return stored === seasons.length ? 0 : 1
}
