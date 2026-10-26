import type { Database } from '@fansite/db/client'

import { connect } from '@fansite/db/client'
import { feeds, importRuns, matchImports, sources, wikipediaPages } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { asc, desc, eq } from 'drizzle-orm'

import type { ImportOptions } from './import-feeds.ts'

import { isUnhealthy } from './import-matches.ts'
import { unhealthyAfter } from './run-log.ts'
import { formatTime } from './text.ts'

/**
 * Shows the health of each feed of the sources that are switched on: the source, the address,
 * the last run that succeeded, the failed runs in a row, the last error and whether the feed
 * is healthy. Above it is the last run, so you can see that cron starts the import. After the
 * feeds comes the health of the match import for the current season, in the same words, with
 * the Wikipedia pages it read. It only reads, and changes nothing in the database.
 *
 * Returns the exit code: 1 when a feed or the match import is unhealthy, so a check can tell.
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

    const now = clock()
    let unhealthy = 0

    if (rows.length === 0) {
      write('There are no feeds: no source that is switched on has a feed. See `pnpm db:seed`.')
    }

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

    if (rows.length > 0) {
      write('')
      write(`Unhealthy feeds: ${unhealthy} of ${rows.length}`)
    }

    return (await showMatchStatus(db, now, write)) || unhealthy > 0 ? 1 : 0
  } finally {
    await close()
  }
}

/**
 * Shows the health of the match import for the current season. Returns true when it is
 * unhealthy.
 */
async function showMatchStatus(db: Database, now: Date, write: (line: string) => void): Promise<boolean> {
  const season = seasonOf(now)
  const [health] = await db.select().from(matchImports).where(eq(matchImports.season, season))
  const pages = await db
    .select()
    .from(wikipediaPages)
    .where(eq(wikipediaPages.season, season))
    .orderBy(asc(wikipediaPages.title))

  write('')

  if (health === undefined) {
    write(`Matches ${season} (Wikipedia): not read yet`)

    return false
  }

  const unhealthy = isUnhealthy(health)

  write(`Matches ${season} (Wikipedia): ${unhealthy ? 'unhealthy' : 'healthy'}`)
  write(`  last success: ${health.lastSuccessAt === null ? 'never' : formatTime(health.lastSuccessAt)}`)
  write(`  last outcome: ${health.lastOutcome}`)
  write(`  failed runs in a row: ${health.failuresInARow}`)
  write(
    `  last error: ${health.lastErrorAt === null ? 'none' : `${formatTime(health.lastErrorAt)}, ${health.lastError}`}`,
  )
  write(
    `  last warning: ${health.lastWarningAt === null ? 'none' : `${formatTime(health.lastWarningAt)}, ${health.lastWarning}`}`,
  )

  if (health.retryAt !== null && health.retryAt > now) {
    write(`  next try from: ${formatTime(health.retryAt)}`)
  }
  for (const page of pages) {
    write(`  page: ${page.title}, version ${page.version ?? 'unknown'}, read ${formatTime(page.readAt)}`)
  }

  return unhealthy
}
