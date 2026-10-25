import type { Database } from '@fansite/db/client'
import type { Feed } from '@fansite/db/schema'

import { feeds, importResults, importRuns } from '@fansite/db/schema'
import { eq, lt } from 'drizzle-orm'

import type { FeedReport } from './import-feeds.ts'

import { formatTime, printable } from './text.ts'

/**
 * After this many failed runs in a row, a feed is unhealthy, and the import tries it once an
 * hour.
 */
export const unhealthyAfter = 3

/**
 * How long the import waits when a source answers 429 or 503: what `Retry-After` says, but no
 * more than a day.
 */
export const waitLimits = { longestSeconds: 24 * 60 * 60, withoutRetryAfterSeconds: 60 * 60 }

/**
 * How long an unhealthy feed waits for its next try: once an hour. Cron starts each run a
 * moment earlier or later, so a minute less makes sure the run an hour later tries it, and not
 * the one after that.
 */
export const retryUnhealthyAfterMs = 59 * 60 * 1000

/** How long the log keeps a run. */
export const keepRunsMs = 30 * 24 * 60 * 60 * 1000

/** Ends a run in the log. */
export async function finishRun(db: Database, runId: number, finishedAt: Date) {
  await db.update(importRuns).set({ finishedAt }).where(eq(importRuns.id, runId))
}

/**
 * What a report changes in the health of a feed, or undefined when it changes nothing. Read and
 * stored, or not changed, is a success. An error is a failure. Waiting and a refusal by
 * robots.txt are no fault of ours, and count as neither.
 */
export function healthAfter(
  feed: Pick<Feed, 'failuresInARow'>,
  report: FeedReport,
  now: Date,
): Partial<Pick<Feed, 'failuresInARow' | 'lastError' | 'lastErrorAt' | 'lastSuccessAt' | 'retryAt'>> | undefined {
  switch (report.kind) {
    case 'blocked-by-robots':
    case 'postponed':
      return undefined
    case 'error': {
      const failuresInARow = feed.failuresInARow + 1

      return {
        failuresInARow,
        lastError: printable(report.message),
        lastErrorAt: now,
        retryAt: failuresInARow >= unhealthyAfter ? new Date(now.getTime() + retryUnhealthyAfterMs) : null,
      }
    }
    case 'imported':
    case 'not-modified':
      return { failuresInARow: 0, lastSuccessAt: now, retryAt: null }
    case 'wait': {
      const seconds = Math.min(
        report.retryAfterSeconds ?? waitLimits.withoutRetryAfterSeconds,
        waitLimits.longestSeconds,
      )

      return { retryAt: new Date(now.getTime() + seconds * 1000) }
    }
  }
}

/**
 * Why a feed failed or was not read, as the log and the output say it, or null when there is
 * nothing to explain. Text from the source or the database is cleaned and cut off, and a
 * database error is only its code (see `describeError`).
 */
export function reasonOf(report: FeedReport): null | string {
  switch (report.kind) {
    case 'blocked-by-robots':
    case 'imported':
    case 'not-modified':
      return null
    case 'error':
      return printable(report.message)
    case 'postponed':
      return report.failuresInARow >= unhealthyAfter
        ? `it failed ${report.failuresInARow} runs in a row; next try from ${formatTime(report.retryAt)}`
        : `the source asked us to wait until ${formatTime(report.retryAt)}`
    case 'wait':
      return `the source asks us to wait${report.retryAfterSeconds === null ? '' : ` ${report.retryAfterSeconds} seconds`}`
  }
}

/** Writes a run that found the lock taken, and so did nothing. */
export async function recordLockTaken(db: Database, at: Date) {
  await db.insert(importRuns).values({ finishedAt: at, lockTaken: true, startedAt: at })
}

/** Writes what a run did with a feed in the log, and keeps the health of the feed. */
export async function recordReport(
  db: Database,
  runId: number,
  feed: Pick<Feed, 'failuresInARow' | 'id'>,
  report: FeedReport,
  now: Date,
) {
  const counts =
    report.kind === 'imported'
      ? { added: report.added, skipped: report.skipped.length, unchanged: report.unchanged, updated: report.updated }
      : {}

  await db.insert(importResults).values({
    feedId: feed.id,
    outcome: report.kind,
    reason: reasonOf(report),
    runId,
    ...counts,
  })

  const health = healthAfter(feed, report, now)

  if (health !== undefined) {
    await db.update(feeds).set(health).where(eq(feeds.id, feed.id))
  }
}

/** Removes the runs older than 30 days from the log, with what they did per feed. */
export async function removeOldRuns(db: Database, now: Date) {
  await db.delete(importRuns).where(lt(importRuns.startedAt, new Date(now.getTime() - keepRunsMs)))
}

/** Starts a run in the log, and returns its id. */
export async function startRun(db: Database, startedAt: Date): Promise<number> {
  const [run] = await db.insert(importRuns).values({ startedAt }).$returningId()

  if (run === undefined) {
    throw new Error('The database did not return the id of the new run')
  }

  return run.id
}
