// The import command, `pnpm run import`, and on the host the file that cron starts (see src/bundle.ts). It runs as soon
// as it loads, without `import.meta.main`, which Node only has since 24.2: an older Node 24 would skip the import and
// exit with 0. The command makes its own fetcher, which refuses every address that is not on the public internet.
import { readDatabaseEnv } from '@fansite/db/env'

import { createFetcher } from './fetcher.ts'
import { runImport } from './import-feeds.ts'

process.exitCode = await runImport(readDatabaseEnv().DATABASE_URL, createFetcher())
