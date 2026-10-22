// The import command, `pnpm run import`, and on the host the file that cron starts (see src/bundle.ts). It runs as soon
// as it loads, without `import.meta.main`, which Node only has since 24.2: an older Node 24 would skip the import and
// exit with 0. The command makes its own fetcher, which refuses every address that is not on the public internet.
//
// With `--status` it shows the health of the feeds instead (`pnpm run import:status`), so the host needs no second file.
// An option it doesn't know stops it before it does anything.
import { readDatabaseEnv } from '@fansite/db/env'
import { parseArgs } from 'node:util'

import { runImport } from './import-feeds.ts'
import { showStatus } from './status.ts'

const { values } = parseArgs({ options: { status: { type: 'boolean' } } })
const { DATABASE_URL } = readDatabaseEnv()

process.exitCode = values.status ? await showStatus(DATABASE_URL) : await runImport(DATABASE_URL)
