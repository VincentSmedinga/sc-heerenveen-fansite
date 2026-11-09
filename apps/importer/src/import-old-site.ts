// The command that reads the match data of the old fansite (1990 to 2007) into the database:
// `pnpm run import:old-site`, and on the host `import.mjs --old-site`. It reads the files in
// `apps/importer/data/oude-fansite` (see `old-site-file.ts`) and never the old database, which
// production can't reach, and runs its steps one after the other in a fixed order: a match
// hangs on a club and a goal on a match. Every step writes only what differs from the database
// and says how many rows it made, changed, left as they were and skipped, so a second run
// changes nothing. A step is one entry of `oldSiteSteps`.
//
// The command checks the files before it connects, takes the lock of the import for the whole
// run, and writes a line for each step. With `--dry-run` it does the same inside a transaction
// that it rolls back, so the numbers are what a real run would write, and nothing is written.
import { connect } from '@fansite/db/client'
import { lockNameFor, withLock } from '@fansite/db/lock'
import { existsSync } from 'node:fs'

import type { OldSiteData } from './old-site-file.ts'
import type { OldSiteDatabase, OldSiteStep, OldSiteStepReport } from './old-site-step.ts'

import { buildOldSiteCheck, formatOldSiteCheck } from './old-site-check.ts'
import { importOldSiteClubs, oldSiteClubIds } from './old-site-clubs.ts'
import { importOldSiteCompleteness } from './old-site-completeness.ts'
import { oldSiteDataFolder, readOldSiteData } from './old-site-file.ts'
import { importOldSiteGoals } from './old-site-goals.ts'
import { importOldSiteLineups } from './old-site-lineups.ts'
import { importOldSiteMatches } from './old-site-matches.ts'
import { importOldSitePlayers } from './old-site-players.ts'
import { describeError } from './text.ts'

/** What the command says when a run holds the lock of the import. */
const lockBusy =
  'An import is still running on this database, so this command does nothing. Try again in a few minutes.'

/** What the command says when it gets a wrong argument. */
export const oldSiteUsage = 'Usage: pnpm run import:old-site [--dry-run | --report]'

/** Thrown to roll back the transaction of a dry run; it is no fault. */
class DryRunDone extends Error {}

/** The steps, in the order they run. A step may use what the steps before it wrote. */
export const oldSiteSteps: readonly OldSiteStep[] = [
  { name: 'clubs', run: (db, data) => importOldSiteClubs(db, data.clubs) },
  {
    name: 'matches',
    run: async (db, data) => importOldSiteMatches(db, data.matches, data.clubs, await oldSiteClubIds(db, data.clubs)),
  },
  { name: 'spelers', run: (db, data) => importOldSitePlayers(db, data.matches, data.players) },
  { name: 'doelpunten', run: (db, data) => importOldSiteGoals(db, data.matches, data.players) },
  { name: 'opstellingen', run: (db, data) => importOldSiteLineups(db, data.matches, data.players) },
  { name: 'selecties', run: (db) => importOldSiteCompleteness(db, new Date()) },
]

export type OldSiteImportOptions = {
  /** Shows what the run would do, and writes nothing. */
  dryRun?: boolean
  /** The folder with the files, by default the one next to `import.mjs`. */
  folder?: string | URL
  /** The steps to run. By default `oldSiteSteps`. */
  steps?: readonly OldSiteStep[]
  /** Where the lines go. */
  write?: (line: string) => void
}

export type OldSiteReportOptions = {
  /** The folder with the files, by default the one next to `import.mjs`. */
  folder?: string | URL
  /** The day on the report, as `2026-11-08`. By default today in Amsterdam. */
  today?: string
  /** Where the report goes. */
  write?: (text: string) => void
}

/**
 * Where the files are: next to the bundle `import.mjs` on the host (`data/oude-fansite`, put
 * there by `pnpm --filter site assemble`), else in the repository.
 */
export function defaultOldSiteFolder(): URL {
  const besideBundle = new URL('./data/oude-fansite/', import.meta.url)

  return existsSync(besideBundle) ? besideBundle : oldSiteDataFolder
}

/** The line for the log about one step. */
export function formatStepReport(name: string, report: OldSiteStepReport): string {
  return [
    `Old site, step ${name}: ${report.created} new, ${report.changed} updated, ${report.unchanged} unchanged, ${report.skipped} skipped`,
    ...report.lines.map((line) => `  ${line}`),
  ].join('\n')
}

/**
 * Reads the files and runs the steps, the first one first. The files are read and checked
 * before the command connects, so a file that does not fit stops it before it writes anything.
 * Each step runs in a transaction of its own and the run stops at the first step that fails: a
 * step that is done stays done, and the step that failed leaves nothing behind. With `dryRun`
 * all the steps share one transaction that is rolled back at the end.
 *
 * Returns the exit code: 0 when every step ran, 1 for a wrong argument, files that don't fit, a
 * run that holds the lock and a step that failed.
 */
export async function runOldSiteImport(
  databaseUrl: string,
  {
    dryRun = false,
    folder = defaultOldSiteFolder(),
    steps = oldSiteSteps,
    write = console.log,
  }: OldSiteImportOptions = {},
): Promise<number> {
  let data: OldSiteData

  try {
    data = await readOldSiteData(folder)
  } catch (error) {
    write(`The files of the old fansite can't be used, so nothing was written. ${describeError(error)}`)

    return 1
  }

  const { close, db, pool } = connect(databaseUrl)
  const prefix = dryRun ? 'Dry run, nothing is written. ' : ''

  try {
    const run = await withLock(pool, lockNameFor(databaseUrl, 'import'), 0, async () => {
      if (!dryRun) {
        return runSteps(db, data, steps, write)
      }

      let code = 0

      try {
        await db.transaction(async (transaction) => {
          code = await runSteps(transaction, data, steps, write)
          throw new DryRunDone()
        })
      } catch (error) {
        if (!(error instanceof DryRunDone)) {
          throw error
        }
      }

      return code
    })

    if (!run.ran) {
      write(lockBusy)

      return 1
    }

    write(`${prefix}Old site: ${run.result === 0 ? `${steps.length} of ${steps.length} steps done.` : 'stopped.'}`)

    return run.result
  } finally {
    await close()
  }
}

/**
 * The check report (#880): reads the files and the database and writes the report as Markdown.
 * It writes nothing to the database, takes no lock (it only reads) and does not run the steps.
 * Returns the exit code: 0 when the report is written, 1 when the files can't be used.
 */
export async function runOldSiteReport(
  databaseUrl: string,
  {
    folder = defaultOldSiteFolder(),
    today = amsterdamToday(),
    write = (text) => process.stdout.write(text),
  }: OldSiteReportOptions = {},
): Promise<number> {
  let data: OldSiteData

  try {
    data = await readOldSiteData(folder)
  } catch (error) {
    console.error(`The files of the old fansite can't be used, so there is no report. ${describeError(error)}`)

    return 1
  }

  const { close, db } = connect(databaseUrl)

  try {
    write(formatOldSiteCheck(await buildOldSiteCheck(db, data), today))

    return 0
  } finally {
    await close()
  }
}

/** Today in Amsterdam as `2026-11-08`. */
function amsterdamToday(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' })
}

/** Runs the steps in order; each in a transaction of its own. Returns the exit code. */
async function runSteps(
  db: OldSiteDatabase,
  data: OldSiteData,
  steps: readonly OldSiteStep[],
  write: (line: string) => void,
): Promise<number> {
  for (const step of steps) {
    try {
      const report = await db.transaction((transaction) => step.run(transaction, data))

      write(formatStepReport(step.name, report))
    } catch (error) {
      write(`Old site, step ${step.name}: not done, nothing was changed by it. ${describeError(error)}`)

      return 1
    }
  }

  return 0
}
