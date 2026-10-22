import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'

import type { Fetcher } from './fetcher.ts'

import { createFetcher } from './fetcher.ts'
import { formatReport, importFeeds } from './import-feeds.ts'

/**
 * Reads every feed of every source that is switched on and writes a line for each. One fetcher serves all feeds, so a
 * host's robots.txt is read once. Returns the exit code: 1 when a feed failed, so a scheduler can tell.
 */
export async function runImport(
  databaseUrl: string,
  fetcher: Fetcher,
  write: (line: string) => void = console.log,
): Promise<number> {
  const { close, db } = connect(databaseUrl)

  try {
    const reports = await importFeeds(db, fetcher)

    if (reports.length === 0) {
      write('There are no feeds to read: no source that is switched on has a feed. See `pnpm db:seed`.')
    }
    for (const report of reports) {
      write(formatReport(report))
    }

    return reports.some((report) => report.kind === 'error') ? 1 : 0
  } finally {
    await close()
  }
}

// The command makes its own fetcher, which refuses every address that is not on the public internet.
if (import.meta.main) {
  process.exitCode = await runImport(readDatabaseEnv().DATABASE_URL, createFetcher())
}
