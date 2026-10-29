// The import command, `pnpm run import`, and on the host the file that cron starts (see
// src/bundle.ts). It runs as soon as it loads, without `import.meta.main`, which Node only has
// since 24.2: an older Node 24 would skip the import and exit with 0. The command makes its own
// fetcher, which refuses every address that is not on the public internet.
//
// With `--status` it shows the health of the feeds instead (`pnpm run import:status`), so the
// host needs no second file. With `--season <season>` it reads one season that is over
// (`pnpm run import:season 2025/26`), once; the hourly import reads the current season only,
// and runs without any argument. An option it doesn't know, a season without `--season` and a
// combination of the options stop it before it does anything.
import { readDatabaseEnv } from '@fansite/db/env'
import { parseArgs } from 'node:util'

import { runImport } from './import-feeds.ts'
import { runSeasonImport, seasonUsage } from './import-season.ts'
import { showStatus } from './status.ts'

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { season: { type: 'boolean' }, status: { type: 'boolean' } },
})

if (values.season === true ? values.status === true || positionals.length > 1 : positionals.length > 0) {
  console.error(`Wrong arguments. ${seasonUsage}\nOr use --status alone, or no argument for the hourly import.`)
  process.exit(2)
}

const { DATABASE_URL } = readDatabaseEnv()

process.exitCode = values.season
  ? await runSeasonImport(DATABASE_URL, positionals[0])
  : values.status
    ? await showStatus(DATABASE_URL)
    : await runImport(DATABASE_URL)
