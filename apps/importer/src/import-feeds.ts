import type { AlertOptions } from '@fansite/db/alerts'
import type { Database } from '@fansite/db/client'
import type { Feed, ItemRelevance } from '@fansite/db/schema'
import type { AnyMySqlColumn } from 'drizzle-orm/mysql-core'

import { recordRun } from '@fansite/db/alerts'
import { connect } from '@fansite/db/client'
import { lockNameFor, withLock } from '@fansite/db/lock'
import { discussions, feeds, items, matches, sources } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { removeVisitorData } from '@fansite/db/visits'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'

import type { Fetcher, RobotsStore } from './fetcher.ts'
import type { HealthReport } from './import-matches.ts'
import type { FeedItem, SkippedItem } from './read-feed.ts'
import type { ForumDiscussion } from './read-forum.ts'
import type { MatchDay } from './relevance.ts'

import { alertRunOf, feedSubject, matchesSubject, squadSubject } from './alert-runs.ts'
import { createFetcher } from './fetcher.ts'
import { formatMatchReport, importMatches, repairKnownClubs, wikipediaOrigin } from './import-matches.ts'
import { formatSquadReport, importSquad } from './import-squad.ts'
import { paywallCategoryFor, paywallNamespaceFor, readFeed, timeRuleFor } from './read-feed.ts'
import { readForum } from './read-forum.ts'
import { judgeRelevance, opponentsAround } from './relevance.ts'
import { robotsStoreFor } from './robots-store.ts'
import { finishRun, reasonOf, recordLockTaken, recordReport, removeOldRuns, startRun } from './run-log.ts'
import { describeError } from './text.ts'

/**
 * What came of one feed. Like `FetchOutcome`, every result is a value, so a failing feed never
 * stops the others.
 */
export type FeedReport =
  | {
      /** Items we saw that are new, that changed, and that were as we had them. */
      added: number
      kind: 'imported'
      /**
       * How many items of the feed the filter judged to be of each kind, hidden ones included.
       * All zero for a forum, which has discussions and no items.
       */
      relevance: RelevanceCounts
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
  /**
   * How the run mails the owner about an import that keeps failing (see `recordRun`): a test
   * gives a fake mailer and its own environment, so it sends nothing real. The clock and the
   * output are those of the run.
   */
  alerts?: Pick<AlertOptions, 'env' | 'send'>
  /** Gives the time. A test gives its own, to run the import at a moment it chooses. */
  clock?: () => Date
  /**
   * Makes the fetcher of the run, with the store for robots.txt. A test gives one that may
   * reach its own web servers.
   */
  makeFetcher?: (robots: RobotsStore) => Fetcher
  /**
   * The address of the Wikipedia the matches come from. A test gives the address of its own web
   * server, or null when it is about something else and must not reach Wikipedia.
   */
  wikipediaOrigin?: null | string
  /** Writes a line of output. */
  write?: (line: string) => void
}

/** How many items fell in each value of `items.relevance`. */
export type RelevanceCounts = Record<ItemRelevance, number>

export type StoredFeed = Pick<
  Feed,
  'etag' | 'failuresInARow' | 'filter' | 'id' | 'lastModified' | 'retryAt' | 'sourceId' | 'url'
>

/**
 * The queries below also run inside a transaction, which has these methods but is not a
 * `Database`.
 */
type Executor = Pick<Database, 'delete' | 'insert' | 'select' | 'update'>

/**
 * How many items one query handles, so a very large feed stays under the limit on the number of
 * parameters.
 */
const batchSize = 500

/**
 * Writes a report as lines of text: one for the feed, and one for each item we left out.
 * Whatever came from the source is cleaned of control characters and cut off, so a feed can't
 * mess up the terminal or the log.
 */
export function formatReport(report: FeedReport): string {
  switch (report.kind) {
    case 'blocked-by-robots':
      return `${report.url}: not read, robots.txt does not allow it`
    case 'error':
      return `${report.url}: failed, ${reasonOf(report)}`
    case 'imported':
      return [
        `${report.url}: ${report.added} new, ${report.updated} updated, ${report.unchanged} unchanged, ${report.skipped.length} skipped${formatRelevance(report.relevance)}`,
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
 * Reads one feed and stores its items. The feed goes through the fetcher with the `ETag` and
 * `Last-Modified` of the last time, and nothing happens when the source says it hasn't changed.
 * A feed we can't read leaves what we have alone.
 *
 * The new `ETag` and `Last-Modified` are saved in the same transaction as the items. If the
 * items fail, the next run asks for the whole feed again instead of being told that nothing
 * changed.
 *
 * The feed of a forum is the list of discussions of its API. It is read as a guest and always
 * in full, without an `ETag`: a database that is empty must get its discussions back, and a
 * forum that changed would only say so by asking again.
 *
 * `seasonMatches` are the matches of the current season, for the relevance of an item about the
 * opponent (see `storeItems`); without them the filter looks at the headline alone.
 *
 * It throws when the database fails; `importFeeds` turns that into a report.
 */
export async function importFeed(
  db: Database,
  fetcher: Fetcher,
  feed: StoredFeed,
  now: Date = new Date(),
  seasonMatches: readonly MatchDay[] = [],
): Promise<FeedReport> {
  const [source] = await db
    .select({ domain: sources.domain, kind: sources.kind })
    .from(sources)
    .where(eq(sources.id, feed.sourceId))
  const isForum = source?.kind === 'forum'
  const outcome = await fetcher.fetch(feed.url, isForum ? {} : { etag: feed.etag, lastModified: feed.lastModified })
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

  if (isForum) {
    return importForum(db, feed, readForum(outcome.body, new URL(feed.url).origin))
  }

  const domain = source?.domain ?? ''
  const read = readFeed(outcome.body, {
    contentType: outcome.contentType,
    now,
    paywallCategory: paywallCategoryFor(domain),
    paywallNamespace: paywallNamespaceFor(domain),
    timeRule: timeRuleFor(domain),
  })

  if (read.kind === 'error') {
    return { kind: 'error', message: read.message, url }
  }

  const counts = await db.transaction(async (transaction) => {
    const stored = await storeItems(transaction, feed, read.items, now, seasonMatches)

    await transaction
      .update(feeds)
      .set({ etag: outcome.etag, lastModified: outcome.lastModified })
      .where(eq(feeds.id, feed.id))

    return stored
  })

  return { ...counts, kind: 'imported', skipped: read.skipped, url }
}

/**
 * Reads every feed of every source that is switched on, one after the other, and reports on
 * each. A feed that fails, because the source is down or the database refuses something, stops
 * no other feed. A feed whose time to try again has not come yet is not asked for. What came of
 * each feed goes in the log of the run, and into its health.
 *
 * The matches of the current season are read from the database once, before the first feed, for
 * the relevance of the items that are about the opponent of a match. A match that the
 * Wikipedia import stores during this run counts from the next run.
 */
export async function importFeeds(
  db: Database,
  fetcher: Fetcher,
  {
    alerts = {},
    clock = () => new Date(),
    runId,
    write = console.log,
  }: Pick<ImportOptions, 'alerts' | 'clock' | 'write'> & { runId: number },
): Promise<FeedReport[]> {
  const reports: FeedReport[] = []
  const seasonMatches = await listSeasonMatches(db, seasonOf(clock()))

  for (const feed of await listFeedsToImport(db)) {
    const report = await importDueFeed(db, fetcher, feed, clock(), seasonMatches)

    // The time after the request, so a wait counts from the moment the source answered.
    await recordReport(db, runId, feed, report, clock())

    const alertRun = alertRunOf(feedSubject(feed), report)

    if (alertRun !== undefined) {
      await recordRun(db, alertRun, { ...alerts, clock, write })
    }
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
      filter: feeds.filter,
      id: feeds.id,
      lastModified: feeds.lastModified,
      retryAt: feeds.retryAt,
      sourceId: feeds.sourceId,
      sourceName: sources.name,
      url: feeds.url,
    })
    .from(feeds)
    .innerJoin(sources, eq(sources.id, feeds.sourceId))
    .where(eq(sources.enabled, true))
    .orderBy(asc(feeds.id))
}

/**
 * Reads every feed of every source that is switched on and writes a line for each. One
 * fetcher serves all feeds, so a host's robots.txt is read once, and the database keeps
 * it for a day. In the same run it reads the matches, the table and the squad of the season
 * from Wikipedia, at most once an hour each (see `importMatches` and `importSquad`). The feeds
 * and Wikipedia start together and do not depend on each other: a failure of one stops neither
 * the other nor its report. The pages of Wikipedia are read one after the other: the matches
 * first, then the squad, and the squad is read also when the matches fail.
 * Returns the exit code: 1 when a feed failed, so a scheduler can tell. A match import
 * that finds a check failing or a page changed is a warning in the output and in the
 * health (`pnpm run import:status`), and no failure of the run.
 *
 * A run takes a lock in the database first. When another run holds it, this run writes
 * that in the log and stops, with exit code 0: nothing is broken, and the next run comes
 * a quarter of an hour later. A run also removes the runs older than 30 days from the
 * log.
 */
export async function runImport(
  databaseUrl: string,
  {
    alerts = {},
    clock = () => new Date(),
    makeFetcher = (robots) => createFetcher({ robots }),
    wikipediaOrigin: origin = wikipediaOrigin,
    write = console.log,
  }: ImportOptions = {},
): Promise<number> {
  const { close, db, pool } = connect(databaseUrl)

  try {
    const run = await withLock(pool, lockNameFor(databaseUrl, 'import'), 0, async () => {
      const runId = await startRun(db, clock())

      await removeOldRuns(db, clock())
      // The salt and the hashes of the visitors of a day go once the day is over, also on a day
      // when nobody visits the site (see the privacy page). A failure is a warning, not a
      // failed import.
      await removeVisitorData(db, clock()).catch((error: unknown) =>
        write(`Visitor data: warning, not removed: ${describeError(error)}`),
      )

      // Before any season is read: the clubs are right whether or not a season can be read. A
      // failure is a warning and no reason to stop.
      const clubLines = await repairKnownClubs(db, clock)
      const fetcher = makeFetcher(robotsStoreFor(db, clock))
      const [reports, wikipedia] = await Promise.allSettled([
        importFeeds(db, fetcher, { alerts, clock, runId, write }),
        origin === null ? [] : importWikipedia(db, fetcher, clock, origin, { ...alerts, clock, write }),
      ])

      await finishRun(db, runId, clock())

      return { clubLines, reports, wikipedia }
    })

    if (!run.ran) {
      await recordLockTaken(db, clock())
      write('Another import is still running on this database, so this run does nothing.')

      return 0
    }

    const { clubLines, reports, wikipedia } = run.result

    for (const line of clubLines) {
      write(line)
    }

    if (reports.status === 'fulfilled' && reports.value.length === 0) {
      write('There are no feeds to read: no source that is switched on has a feed. See `pnpm db:seed`.')
    }
    for (const report of reports.status === 'fulfilled' ? reports.value : []) {
      write(formatReport(report))
    }
    // A run that finds the hour not over yet is the usual case, three in four, and says
    // nothing.
    for (const line of wikipedia.status === 'fulfilled' ? wikipedia.value : []) {
      write(line)
    }
    if (reports.status === 'rejected') {
      throw reports.reason
    }

    return reports.value.some((report) => report.kind === 'error') ? 1 : 0
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

/**
 * The address of a forum discussion without the slug and the number of the last post, which
 * change: `/d/2859`.
 */
function discussionKey(url: string): string {
  return new URL(url).pathname.replace(/^(\/d\/\d+).*$/u, '$1')
}

/**
 * The part of a report line about the relevance, or nothing for a feed without items. A feed
 * without a filter has `relevant` only.
 */
function formatRelevance({ doubtful, irrelevant, relevant }: RelevanceCounts): string {
  return relevant + doubtful + irrelevant === 0
    ? ''
    : `; ${relevant} relevant, ${doubtful} doubtful, ${irrelevant} irrelevant`
}

/**
 * Reads a feed whose time has come, or reports that it waits. A failure of the database becomes
 * an error report.
 */
async function importDueFeed(
  db: Database,
  fetcher: Fetcher,
  feed: StoredFeed,
  now: Date,
  seasonMatches: readonly MatchDay[],
): Promise<FeedReport> {
  if (feed.retryAt !== null && feed.retryAt > now) {
    return { failuresInARow: feed.failuresInARow, kind: 'postponed', retryAt: feed.retryAt, url: feed.url }
  }

  try {
    return await importFeed(db, fetcher, feed, now, seasonMatches)
  } catch (error) {
    return { kind: 'error', message: describeError(error), url: feed.url }
  }
}

/** Stores what `readForum` found, or reports why it could not. */
async function importForum(db: Database, feed: StoredFeed, read: ReturnType<typeof readForum>): Promise<FeedReport> {
  if (read.kind === 'error') {
    return { kind: 'error', message: read.message, url: feed.url }
  }

  const counts = await db.transaction((transaction) => storeDiscussions(transaction, feed, read.discussions))

  return {
    ...counts,
    kind: 'imported',
    relevance: { doubtful: 0, irrelevant: 0, relevant: 0 },
    skipped: read.skipped,
    url: feed.url,
  }
}

/**
 * Reads the matches and then the squad, and returns the lines to write. A failure of one does
 * not stop the other, and an import that finds its hour not over yet says nothing.
 */
async function importWikipedia(
  db: Database,
  fetcher: Fetcher,
  clock: () => Date,
  origin: string,
  alerts: AlertOptions,
): Promise<string[]> {
  const lines: string[] = []

  try {
    const report = await importMatches(db, fetcher, { clock, origin })

    if (report.kind !== 'postponed') {
      lines.push(formatMatchReport(report))
    }

    await recordWikipediaRun(db, matchesSubject(report.season), report, alerts)
  } catch (error) {
    lines.push(`Matches: warning, not imported: ${describeError(error)}`)
  }
  try {
    const report = await importSquad(db, fetcher, { clock, origin })

    if (report.kind !== 'postponed') {
      lines.push(formatSquadReport(report))
    }

    await recordWikipediaRun(db, squadSubject(report.season), report, alerts)
  } catch (error) {
    lines.push(`Squad: warning, not imported: ${describeError(error)}`)
  }

  return lines
}

/**
 * The day, the opponent and the status of every match of a season. Only the current season:
 * the table holds earlier seasons too (`pnpm import:season`), and a match of last year says
 * nothing about who we play this week.
 */
function listSeasonMatches(db: Database, season: string): Promise<MatchDay[]> {
  return db
    .select({ matchDate: matches.matchDate, opponent: matches.opponent, status: matches.status })
    .from(matches)
    .where(eq(matches.season, season))
}

/** Tells the alerts how the import of a season went, if it asked Wikipedia. */
async function recordWikipediaRun(
  db: Database,
  subject: { label: string; subject: string },
  report: HealthReport,
  alerts: AlertOptions,
) {
  const alertRun = alertRunOf(subject, report)

  if (alertRun !== undefined) {
    await recordRun(db, alertRun, alerts)
  }
}

/**
 * Makes the discussions of a forum in the database the ones we found, and nothing else: no
 * discussion, title or screen name stays that the forum no longer has among the newest. A
 * discussion is new when we had no row with its id, and changed when its row differs. The
 * address ends in the number of the last post, so it changes with every new post.
 */
async function storeDiscussions(db: Executor, feed: StoredFeed, found: ForumDiscussion[]) {
  const counts = { added: 0, unchanged: 0, updated: 0 }
  const known = new Map(
    (await db.select().from(discussions).where(eq(discussions.sourceId, feed.sourceId))).map((row) => [
      discussionKey(row.url),
      row,
    ]),
  )

  for (const discussion of found) {
    const before = known.get(discussionKey(discussion.url))

    if (before === undefined) {
      counts.added++
    } else if (
      before.url === discussion.url &&
      before.title === discussion.title &&
      before.replyCount === discussion.replyCount &&
      before.lastPostedBy === discussion.lastPostedBy &&
      before.lastPostedAt.getTime() === discussion.lastPostedAt.getTime()
    ) {
      counts.unchanged++
    } else {
      counts.updated++
    }
  }

  await db.delete(discussions).where(eq(discussions.sourceId, feed.sourceId))

  if (found.length > 0) {
    await db.insert(discussions).values(found.map((discussion) => ({ ...discussion, sourceId: feed.sourceId })))
  }

  return counts
}

/**
 * Stores the items of a feed and counts which are new, which changed and which were as we had
 * them. An item is new when the source has no item with its key yet. The key is unique per
 * source, so an item that moves to another feed of the same source is the same item.
 *
 * A known item keeps its time of publication when the feed gives none this time. An item
 * without a valid time gets the time we first saw it. An item that a moderator hid is never
 * changed, whatever the source offers, and counts as unchanged.
 *
 * Every item gets its relevance: `relevant` for a feed without a filter, and for a feed with
 * the filter `club` what `judgeRelevance` says about the headline and the opponents of the
 * matches around its publication, each time the item comes by, so an improved rule
 * works on items we already have, and so does a match that becomes known after the item. A
 * different value counts as a change. The items are all stored, whatever the value. The counts
 * of the values hold the decision for every item of the feed, also for a hidden item, whose own
 * value stays as it is.
 */
async function storeItems(
  db: Executor,
  feed: StoredFeed,
  found: FeedItem[],
  now: Date,
  seasonMatches: readonly MatchDay[],
) {
  const counts = { added: 0, unchanged: 0, updated: 0 }
  const relevance: RelevanceCounts = { doubtful: 0, irrelevant: 0, relevant: 0 }

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
      const itemRelevance =
        feed.filter === 'club' ? judgeRelevance(item.title, opponentsAround(publishedAt, seasonMatches)) : 'relevant'

      relevance[itemRelevance]++

      if (before === undefined) {
        counts.added++
      } else if (
        before.hiddenAt !== null ||
        (before.title === item.title &&
          before.url === item.url &&
          before.paywalled === item.paywalled &&
          before.relevance === itemRelevance &&
          before.durationSeconds === item.durationSeconds &&
          before.seasonNumber === item.seasonNumber &&
          before.episodeNumber === item.episodeNumber &&
          before.publishedAt.getTime() === publishedAt.getTime())
      ) {
        counts.unchanged++
      } else {
        counts.updated++
      }

      return {
        durationSeconds: item.durationSeconds,
        episodeNumber: item.episodeNumber,
        feedId: feed.id,
        firstSeenAt: now,
        key: item.key,
        lastSeenAt: now,
        paywalled: item.paywalled,
        publishedAt,
        relevance: itemRelevance,
        seasonNumber: item.seasonNumber,
        sourceId: feed.sourceId,
        title: item.title,
        url: item.url,
      }
    })

    // The key is unique, so an item that another run added in the meantime is updated instead
    // of added twice. A hidden item keeps every column: the condition is in the statement, so
    // an item that a moderator hides while this run is busy is left alone too, which a check on
    // the row read above would miss.
    await db
      .insert(items)
      .values(rows)
      .onDuplicateKeyUpdate({
        set: {
          durationSeconds: unlessHidden(items.durationSeconds),
          episodeNumber: unlessHidden(items.episodeNumber),
          feedId: unlessHidden(items.feedId),
          lastSeenAt: unlessHidden(items.lastSeenAt),
          paywalled: unlessHidden(items.paywalled),
          publishedAt: unlessHidden(items.publishedAt),
          relevance: unlessHidden(items.relevance),
          seasonNumber: unlessHidden(items.seasonNumber),
          title: unlessHidden(items.title),
          url: unlessHidden(items.url),
        },
      })
  }

  return { ...counts, relevance }
}

/**
 * What an item column becomes when the source offers the item again: the new value, unless a
 * moderator hid the item, then it stays as it is.
 */
function unlessHidden(column: AnyMySqlColumn) {
  return sql`if(${items.hiddenAt} is null, values(${column}), ${column})`
}
