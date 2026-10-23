import type { Database } from '@fansite/db/client'
import type { Feed } from '@fansite/db/schema'

import { connect } from '@fansite/db/client'
import { lockNameFor, withLock } from '@fansite/db/lock'
import { feeds, items, sources } from '@fansite/db/schema'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'

import type { Fetcher, RobotsStore } from './fetcher.ts'
import type { FeedItem, SkippedItem } from './read-feed.ts'

import { createFetcher } from './fetcher.ts'
import { paywallCategoryFor, readFeed } from './read-feed.ts'
import { robotsStoreFor } from './robots-store.ts'
import { finishRun, reasonOf, recordLockTaken, recordReport, removeOldRuns, startRun } from './run-log.ts'

/** What came of one feed. Like `FetchOutcome`, every result is a value, so a failing feed never stops the others. */
export type FeedReport =
  | {
      /** Items we saw that are new, that changed, and that were as we had them. */
      added: number
      kind: 'imported'
      /** The items we left out, with the reason. */
      skipped: SkippedItem[]
      unchanged: number
      updated: number
      url: string
    }
  | {
      /** The import did not ask for the feed: its time to try again has not come yet. */
      failuresInARow: number
      kind: 'postponed'
      retryAt: Date
      url: string
    }
  | {
      kind: 'blocked-by-robots'
      url: string
    }
  | {
      kind: 'error'
      message: string
      url: string
    }
  | {
      kind: 'not-modified'
      url: string
    }
  | {
      kind: 'wait'
      retryAfterSeconds: null | number
      url: string
    }

export type ImportOptions = {
  /** Gives the time. A test gives its own, to run the import at a moment it chooses. */
  clock?: () => Date
  /** Makes the fetcher of the run, with the store for robots.txt. A test gives one that may reach its own web servers. */
  makeFetcher?: (robots: RobotsStore) => Fetcher
  /** Writes a line of output. */
  write?: (line: string) => void
}

export type StoredFeed = Pick<Feed, 'etag' | 'failuresInARow' | 'id' | 'lastModified' | 'retryAt' | 'sourceId' | 'url'>

/** The queries below also run inside a transaction, which has these methods but is not a `Database`. */
type Executor = Pick<Database, 'insert' | 'select' | 'update'>

/** How many items one query handles, so a very large feed stays under the limit on the number of parameters. */
const batchSize = 500

/**
 * Writes a report as lines of text: one for the feed, and one for each item we left out. Whatever came from the source
 * is cleaned of control characters and cut off, so a feed can't mess up the terminal or the log.
 */
export function formatReport(report: FeedReport): string {
  switch (report.kind) {
    case 'blocked-by-robots':
      return `${report.url}: not read, robots.txt does not allow it`
    case 'error':
      return `${report.url}: failed, ${reasonOf(report)}`
    case 'imported':
      return [
        `${report.url}: ${report.added} new, ${report.updated} updated, ${report.unchanged} unchanged, ${report.skipped.length} skipped`,
        ...report.skipped.map((item) => `  item ${item.position} skipped: ${item.reason}`),
      ].join('\n')
    case 'not-modified':
      return `${report.url}: not modified since the last time`
    case 'postponed':
    case 'wait':
      return `${report.url}: not read, ${reasonOf(report)}`
  }
}

/**
 * Reads one feed and stores its items. The feed goes through the fetcher with the `ETag` and `Last-Modified` of the last
 * time, and nothing happens when the source says it hasn't changed. A feed we can't read leaves what we have alone.
 *
 * The new `ETag` and `Last-Modified` are saved in the same transaction as the items. If the items fail, the next run
 * asks for the whole feed again instead of being told that nothing changed.
 *
 * It throws when the database fails; `importFeeds` turns that into a report.
 */
export async function importFeed(
  db: Database,
  fetcher: Fetcher,
  feed: StoredFeed,
  now: Date = new Date(),
): Promise<FeedReport> {
  const outcome = await fetcher.fetch(feed.url, { etag: feed.etag, lastModified: feed.lastModified })
  const { url } = feed

  switch (outcome.kind) {
    case 'blocked-by-robots':
      return { kind: 'blocked-by-robots', url }
    case 'error':
      return { kind: 'error', message: outcome.message, url }
    case 'fetched':
      break
    case 'not-modified':
      return { kind: 'not-modified', url }
    case 'wait':
      return { kind: 'wait', retryAfterSeconds: outcome.retryAfterSeconds, url }
  }

  const [source] = await db.select({ domain: sources.domain }).from(sources).where(eq(sources.id, feed.sourceId))
  const domain = source?.domain ?? ''
  const read = readFeed(outcome.body, {
    contentType: outcome.contentType,
    now,
    paywallCategory: paywallCategoryFor(domain),
  })

  if (read.kind === 'error') {
    return { kind: 'error', message: read.message, url }
  }

  const counts = await db.transaction(async (transaction) => {
    const stored = await storeItems(transaction, feed, read.items, now)

    await transaction
      .update(feeds)
      .set({ etag: outcome.etag, lastModified: outcome.lastModified })
      .where(eq(feeds.id, feed.id))

    return stored
  })

  return { ...counts, kind: 'imported', skipped: read.skipped, url }
}

/**
 * Reads every feed of every source that is switched on, one after the other, and reports on each. A feed that fails,
 * because the source is down or the database refuses something, stops no other feed. A feed whose time to try again
 * has not come yet is not asked for. What came of each feed goes in the log of the run, and into its health.
 */
export async function importFeeds(
  db: Database,
  fetcher: Fetcher,
  { clock = () => new Date(), runId }: Pick<ImportOptions, 'clock'> & { runId: number },
): Promise<FeedReport[]> {
  const reports: FeedReport[] = []

  for (const feed of await listFeedsToImport(db)) {
    const report = await importDueFeed(db, fetcher, feed, clock())

    // The time after the request, so a wait counts from the moment the source answered.
    await recordReport(db, runId, feed, report, clock())
    reports.push(report)
  }

  return reports
}

/** The feeds of the sources that are switched on, in the order we added them. */
export function listFeedsToImport(db: Database) {
  return db
    .select({
      etag: feeds.etag,
      failuresInARow: feeds.failuresInARow,
      id: feeds.id,
      lastModified: feeds.lastModified,
      retryAt: feeds.retryAt,
      sourceId: feeds.sourceId,
      url: feeds.url,
    })
    .from(feeds)
    .innerJoin(sources, eq(sources.id, feeds.sourceId))
    .where(eq(sources.enabled, true))
    .orderBy(asc(feeds.id))
}

/**
 * Reads every feed of every source that is switched on and writes a line for each. One fetcher serves all feeds, so a
 * host's robots.txt is read once, and the database keeps it for a day. Returns the exit code: 1 when a feed failed, so a
 * scheduler can tell.
 *
 * A run takes a lock in the database first. When another run holds it, this run writes that in the log and stops, with
 * exit code 0: nothing is broken, and the next run comes a quarter of an hour later. A run also removes the runs older
 * than 30 days from the log.
 */
export async function runImport(
  databaseUrl: string,
  {
    clock = () => new Date(),
    makeFetcher = (robots) => createFetcher({ robots }),
    write = console.log,
  }: ImportOptions = {},
): Promise<number> {
  const { close, db, pool } = connect(databaseUrl)

  try {
    const run = await withLock(pool, lockNameFor(databaseUrl, 'import'), 0, async () => {
      const runId = await startRun(db, clock())

      await removeOldRuns(db, clock())

      const reports = await importFeeds(db, makeFetcher(robotsStoreFor(db, clock)), { clock, runId })

      await finishRun(db, runId, clock())

      return reports
    })

    if (!run.ran) {
      await recordLockTaken(db, clock())
      write('Another import is still running on this database, so this run does nothing.')

      return 0
    }

    const reports = run.result

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

/** Cuts an array into pieces of at most `size`. */
function chunks<T>(list: T[], size: number): T[][] {
  const pieces: T[][] = []

  for (let start = 0; start < list.length; start += size) {
    pieces.push(list.slice(start, start + size))
  }

  return pieces
}

/** A short text for a failure. A database error carries the whole query with its values, which don't belong in a log. */
function describeError(error: unknown): string {
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error

  if (cause instanceof Error && 'code' in cause && typeof cause.code === 'string') {
    return `database error ${cause.code}`
  }

  return cause instanceof Error ? cause.message : String(cause)
}

/** Reads a feed whose time has come, or reports that it waits. A failure of the database becomes an error report. */
async function importDueFeed(db: Database, fetcher: Fetcher, feed: StoredFeed, now: Date): Promise<FeedReport> {
  if (feed.retryAt !== null && feed.retryAt > now) {
    return { failuresInARow: feed.failuresInARow, kind: 'postponed', retryAt: feed.retryAt, url: feed.url }
  }

  try {
    return await importFeed(db, fetcher, feed, now)
  } catch (error) {
    return { kind: 'error', message: describeError(error), url: feed.url }
  }
}

/**
 * Stores the items of a feed and counts which are new, which changed and which were as we had them. An item is new when
 * the source has no item with its key yet. The key is unique per source, so an item that moves to another feed of the
 * same source is the same item.
 *
 * A known item keeps its time of publication when the feed gives none this time. An item without a valid time gets
 * the time we first saw it.
 */
async function storeItems(db: Executor, feed: StoredFeed, found: FeedItem[], now: Date) {
  const counts = { added: 0, unchanged: 0, updated: 0 }

  for (const batch of chunks(found, batchSize)) {
    const known = new Map(
      (
        await db
          .select()
          .from(items)
          .where(
            and(
              eq(items.sourceId, feed.sourceId),
              inArray(
                items.key,
                batch.map((item) => item.key),
              ),
            ),
          )
      ).map((row) => [row.key, row]),
    )

    const rows = batch.map((item) => {
      const before = known.get(item.key)
      const publishedAt = item.publishedAt ?? before?.publishedAt ?? now

      if (before === undefined) {
        counts.added++
      } else if (
        before.title === item.title &&
        before.url === item.url &&
        before.paywalled === item.paywalled &&
        before.publishedAt.getTime() === publishedAt.getTime()
      ) {
        counts.unchanged++
      } else {
        counts.updated++
      }

      return {
        feedId: feed.id,
        firstSeenAt: now,
        key: item.key,
        lastSeenAt: now,
        paywalled: item.paywalled,
        publishedAt,
        sourceId: feed.sourceId,
        title: item.title,
        url: item.url,
      }
    })

    // The key is unique, so an item that another run added in the meantime is updated instead of added twice.
    await db
      .insert(items)
      .values(rows)
      .onDuplicateKeyUpdate({
        set: {
          feedId: sql`values(${items.feedId})`,
          lastSeenAt: sql`values(${items.lastSeenAt})`,
          paywalled: sql`values(${items.paywalled})`,
          publishedAt: sql`values(${items.publishedAt})`,
          title: sql`values(${items.title})`,
          url: sql`values(${items.url})`,
        },
      })
  }

  return counts
}
