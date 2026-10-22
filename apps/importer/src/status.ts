import { connect } from '@fansite/db/client'
import { feeds, importRuns, sources } from '@fansite/db/schema'
import { asc, desc, eq } from 'drizzle-orm'

import type { ImportOptions } from './import-feeds.ts'

import { unhealthyAfter } from './run-log.ts'
import { formatTime } from './text.ts'

/**
 * Shows the health of each feed of the sources that are switched on: the source, the address, the last run that
 * succeeded, the failed runs in a row, the last error and whether the feed is healthy. Above it is the last run, so you
 * can see that cron starts the import. It only reads, and changes nothing in the database.
 *
 * Returns the exit code: 1 when a feed is unhealthy, so a check can tell.
 */
export async function showStatus(
  databaseUrl: string,
  { clock = () => new Date(), write = console.log }: Pick<ImportOptions, 'clock' | 'write'> = {},
): Promise<number> {
  const { close, db } = connect(databaseUrl)

  try {
    const [lastRun] = await db
      .select()
      .from(importRuns)
      .where(eq(importRuns.lockTaken, false))
      .orderBy(desc(importRuns.id))
      .limit(1)
    const rows = await db
      .select({
        failuresInARow: feeds.failuresInARow,
        lastError: feeds.lastError,
        lastErrorAt: feeds.lastErrorAt,
        lastSuccessAt: feeds.lastSuccessAt,
        retryAt: feeds.retryAt,
        source: sources.name,
        url: feeds.url,
      })
      .from(feeds)
      .innerJoin(sources, eq(sources.id, feeds.sourceId))
      .where(eq(sources.enabled, true))
      .orderBy(asc(feeds.id))

    if (lastRun === undefined) {
      write('Last run: none yet')
    } else {
      const end = lastRun.finishedAt === null ? 'not finished' : `finished ${formatTime(lastRun.finishedAt)}`

      write(`Last run: started ${formatTime(lastRun.startedAt)}, ${end}`)
    }

    if (rows.length === 0) {
      write('There are no feeds: no source that is switched on has a feed. See `pnpm db:seed`.')

      return 0
    }

    const now = clock()
    let unhealthy = 0

    for (const row of rows) {
      const healthy = row.failuresInARow < unhealthyAfter

      if (!healthy) {
        unhealthy++
      }

      write('')
      write(`${row.source}: ${healthy ? 'healthy' : 'unhealthy'}`)
      write(`  feed: ${row.url}`)
      write(`  last success: ${row.lastSuccessAt === null ? 'never' : formatTime(row.lastSuccessAt)}`)
      write(`  failed runs in a row: ${row.failuresInARow}`)
      write(`  last error: ${row.lastErrorAt === null ? 'none' : `${formatTime(row.lastErrorAt)}, ${row.lastError}`}`)

      if (row.retryAt !== null && row.retryAt > now) {
        write(`  next try from: ${formatTime(row.retryAt)}`)
      }
    }

    write('')
    write(`Unhealthy feeds: ${unhealthy} of ${rows.length}`)

    return unhealthy > 0 ? 1 : 0
  } finally {
    await close()
  }
}
