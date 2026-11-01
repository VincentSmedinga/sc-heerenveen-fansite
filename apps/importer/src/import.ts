// The import command, `pnpm run import`, and on the host the file that cron starts (see
// src/bundle.ts). It runs as soon as it loads, without `import.meta.main`, which Node only has
// since 24.2: an older Node 24 would skip the import and exit with 0. The command makes its own
// fetcher, which refuses every address that is not on the public internet.
//
// With `--status` it shows the health of the feeds instead (`pnpm run import:status`), so the
// host needs no second file. With `--season <season>` it reads one season that is over
// (`pnpm run import:season 2025/26`), once; the hourly import reads the current season only,
// and runs without any argument. With `--from-season <season>` it reads every season that is
// over from that season on, the oldest first (`pnpm run import:seasons 2020/21`). An option it
// doesn't know, a season without `--season` and a combination of the options stop it before it
// does anything.
//
// With `--changes` it lists the changes of a match that wait for a decision, and with
// `--changes accept 12` or `--changes reject all` it decides them (`pnpm run import:changes`).
import { readDatabaseEnv } from '@fansite/db/env'
import { parseArgs } from 'node:util'

import { runChangesCommand } from './import-changes.ts'
import { runImport } from './import-feeds.ts'
import { fromSeasonUsage, runSeasonImport, runSeasonsImport, seasonUsage } from './import-season.ts'
import { showStatus } from './status.ts'

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    changes: { type: 'boolean' },
    'from-season': { type: 'boolean' },
    season: { type: 'boolean' },
    status: { type: 'boolean' },
  },
})
const fromSeason = values['from-season']
const modes = [values.changes, fromSeason, values.season, values.status].filter(Boolean).length
const wrongArguments =
  modes > 1 ||
  (values.season === true || fromSeason === true
    ? positionals.length > 1
    : values.changes !== true && positionals.length > 0)

if (wrongArguments) {
  console.error(
    `Wrong arguments. ${seasonUsage}\n${fromSeasonUsage}\nOr use --status alone, --changes, or no argument for the hourly import.`,
  )
  process.exit(2)
}

const { DATABASE_URL } = readDatabaseEnv()

process.exitCode = fromSeason
  ? await runSeasonsImport(DATABASE_URL, positionals[0])
  : values.season
    ? await runSeasonImport(DATABASE_URL, positionals[0])
    : values.changes
      ? await runChangesCommand(DATABASE_URL, positionals)
      : values.status
        ? await showStatus(DATABASE_URL)
        : await runImport(DATABASE_URL)
