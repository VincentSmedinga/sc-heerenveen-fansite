import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'

import { createFetcher } from './fetcher.ts'
import { formatReport, importFeeds } from './import-feeds.ts'

/**
 * Reads every feed of every source that is switched on and prints a line for each. One fetcher serves all feeds, so a
 * host's robots.txt is read once. It exits with 1 when a feed failed, so a scheduler can tell.
 */
if (import.meta.main) {
  const { close, db } = connect(readDatabaseEnv().DATABASE_URL)

  try {
    const reports = await importFeeds(db, createFetcher())

    if (reports.length === 0) {
      console.log('There are no feeds to read: no source that is switched on has a feed. See `pnpm db:seed`.')
    }
    for (const report of reports) {
      console.log(formatReport(report))
    }

    process.exitCode = reports.some((report) => report.kind === 'error') ? 1 : 0
  } finally {
    await close()
  }
}
