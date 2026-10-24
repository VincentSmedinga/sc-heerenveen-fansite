import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  customType,
  date,
  datetime,
  int,
  mediumtext,
  mysqlEnum,
  mysqlTable,
  text,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core'

export const sourceKinds = ['news', 'podcast', 'forum', 'club', 'video'] as const

export const consentStatuses = ['none', 'asked', 'given'] as const

export type ConsentStatus = (typeof consentStatuses)[number]

export type SourceKind = (typeof sourceKinds)[number]

/**
 * The source register: what we may show of each source. A headline, the link and the name of the source are always
 * allowed, so they have no column. Everything else is off until the source has given permission (editorial principles
 * 1 and 2), so a source with only a name, a domain and a kind gets the strictest values.
 *
 * Times are UTC. `consent_date` is a calendar day, not a moment.
 */
export const sources = mysqlTable(
  'sources',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    domain: varchar('domain', { length: 253 }).notNull().unique(),
    kind: mysqlEnum('kind', sourceKinds).notNull(),
    // What the source is, in one or two sentences of our own, for the page 'Onze bronnen'. Empty means no description.
    description: varchar('description', { length: 300 }),
    // The fixed name of the source in an address, such as `omroep-abe`, so that a renamed source keeps its address.
    // Empty means the source has none. Unique.
    slug: varchar('slug', { length: 100 }).unique(),
    // Where the podcast can be found on Apple Podcasts and on Spotify. Empty means it has no such address.
    applePodcastsUrl: varchar('apple_podcasts_url', { length: 300 }),
    spotifyUrl: varchar('spotify_url', { length: 300 }),

    // The display policy. An intro is shown up to this many characters; 0 means no intro.
    introMaxLength: int('intro_max_length', { unsigned: true }).notNull().default(0),
    allowImage: boolean('allow_image').notNull().default(false),
    allowEmbed: boolean('allow_embed').notNull().default(false),
    // How the source wants to be credited. Empty means the name of the source.
    attribution: varchar('attribution', { length: 150 }),

    // The permission: whether we asked, whether the source gave it, since when and what was agreed.
    consentStatus: mysqlEnum('consent_status', consentStatuses).notNull().default('none'),
    consentDate: date('consent_date', { mode: 'string' }),
    consentNote: text('consent_note'),

    // Switches the source off without deleting it.
    enabled: boolean('enabled').notNull().default(true),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`(UTC_TIMESTAMP())`),
  },
  (table) => [
    check(
      'sources_display_needs_consent',
      sql`${table.consentStatus} = 'given' or (${table.introMaxLength} = 0 and ${table.allowImage} = false and ${table.allowEmbed} = false)`,
    ),
    check('sources_apple_podcasts_url_https', sql`${table.applePodcastsUrl} like 'https://%'`),
    check('sources_spotify_url_https', sql`${table.spotifyUrl} like 'https://%'`),
  ],
)

export type NewSource = typeof sources.$inferInsert

export type Source = typeof sources.$inferSelect

/**
 * The most characters a column of `items` holds. The importer skips an item that doesn't fit, instead of cutting it off.
 * A key can be 700 characters at most: that is the longest a unique index over it and `source_id` allows (3072 bytes).
 */
export const itemLimits = { key: 700, title: 500, url: 2048 }

/**
 * A key that two items share only when they are the same byte for byte: a GUID is case-sensitive, and so is the path of
 * a URL, while the collation of the other tables (utf8mb4_unicode_ci) ignores case and accents and would let one item
 * overwrite another.
 */
const itemKey = customType<{ data: string }>({
  dataType: () => `varchar(${itemLimits.key}) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`,
})

/** The most characters of the reason a feed failed or waits, in `feeds` and `import_results`. */
export const reasonMaxLength = 300

/**
 * The feeds we read. A source can have more than one. The `ETag` and `Last-Modified` are from the last time the
 * importer read the feed and stored its items, so the source can answer that nothing changed.
 *
 * The importer also keeps the health of each feed here. A run succeeded for a feed when it read and stored it, or when
 * the source said it had not changed. An error counts as a failure. Waiting and a refusal by robots.txt count as
 * neither. Times are UTC.
 */
export const feeds = mysqlTable('feeds', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  sourceId: int('source_id', { unsigned: true })
    .notNull()
    .references(() => sources.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 500 }).notNull().unique(),
  etag: text('etag'),
  lastModified: text('last_modified'),
  lastSuccessAt: datetime('last_success_at'),
  failuresInARow: int('failures_in_a_row', { unsigned: true }).notNull().default(0),
  lastError: varchar('last_error', { length: reasonMaxLength }),
  lastErrorAt: datetime('last_error_at'),
  // The importer leaves the feed alone until then: the source asked us to wait, or the feed keeps failing.
  retryAt: datetime('retry_at'),
})

export type Feed = typeof feeds.$inferSelect

export type NewFeed = typeof feeds.$inferInsert

/**
 * What the importer stores of a news item: the headline, the link, the time of publication and whether it is behind a
 * paywall, which is no content of the source. Of a podcast episode it also keeps three facts about it, which are no
 * content either: the duration, the season and the number of the episode. An intro, an image, an author or a category
 * has no column, because no source has given permission for it yet (editorial principle 2): what we may not show, we do
 * not store.
 *
 * Times are UTC. `item_key` is the GUID of the item, or its link when it has none, and is unique per source.
 */
export const items = mysqlTable(
  'items',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    sourceId: int('source_id', { unsigned: true })
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    feedId: int('feed_id', { unsigned: true })
      .notNull()
      .references(() => feeds.id, { onDelete: 'cascade' }),
    key: itemKey('item_key').notNull(),
    title: varchar('title', { length: itemLimits.title }).notNull(),
    url: varchar('url', { length: itemLimits.url }).notNull(),
    publishedAt: datetime('published_at').notNull(),
    paywalled: boolean('paywalled').notNull().default(false),
    // Facts about a podcast episode, as its feed gives them. Empty when the feed has none, and for news.
    durationSeconds: int('duration_seconds', { unsigned: true }),
    seasonNumber: int('season_number', { unsigned: true }),
    episodeNumber: int('episode_number', { unsigned: true }),
    firstSeenAt: datetime('first_seen_at')
      .notNull()
      .default(sql`(UTC_TIMESTAMP())`),
    lastSeenAt: datetime('last_seen_at')
      .notNull()
      .default(sql`(UTC_TIMESTAMP())`),
  },
  (table) => [unique('items_source_id_item_key_unique').on(table.sourceId, table.key)],
)

export type Item = typeof items.$inferSelect

export type NewItem = typeof items.$inferInsert

/** The most characters a column of `discussions` holds. The importer skips a discussion that doesn't fit. */
export const discussionLimits = { lastPostedBy: 150, title: 500, url: 2048 }

/**
 * The newest discussions of a forum, as a guest sees them. The importer replaces the rows of a forum in every run, so
 * this holds no history: a discussion, a title or a screen name the forum no longer shows is gone after the next run.
 * Of a discussion we keep the address, the title, the number of replies, the time of the last post and the screen name
 * of whoever wrote it, which the forum shows to a guest too. No text of a post, no avatar and nothing else of a member.
 *
 * `reply_count` is the number of posts minus the opening post, as the forum counts. `last_posted_by` is empty when the
 * forum doesn't say. Times are UTC.
 */
export const discussions = mysqlTable('discussions', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  sourceId: int('source_id', { unsigned: true })
    .notNull()
    .references(() => sources.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: discussionLimits.url }).notNull(),
  title: varchar('title', { length: discussionLimits.title }).notNull(),
  replyCount: int('reply_count', { unsigned: true }).notNull(),
  lastPostedAt: datetime('last_posted_at').notNull(),
  lastPostedBy: varchar('last_posted_by', { length: discussionLimits.lastPostedBy }),
})

export type Discussion = typeof discussions.$inferSelect

export type NewDiscussion = typeof discussions.$inferInsert

/**
 * The log of the import: one row for each run, kept for 30 days. `finished_at` is empty while the run is busy, and stays
 * empty when the process stopped halfway. A run that found another run holding the lock did nothing but write its row.
 */
export const importRuns = mysqlTable('import_runs', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  startedAt: datetime('started_at').notNull(),
  finishedAt: datetime('finished_at'),
  lockTaken: boolean('lock_taken').notNull().default(false),
})

export type ImportRun = typeof importRuns.$inferSelect

export const importOutcomes = ['imported', 'not-modified', 'blocked-by-robots', 'wait', 'postponed', 'error'] as const

export type ImportOutcome = (typeof importOutcomes)[number]

/**
 * What a run did with each feed: the outcome, how many items were new, changed, the same or skipped, and why the feed
 * failed or was not read. The reason never holds values from a query. A row goes when its run or its feed goes.
 */
export const importResults = mysqlTable('import_results', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  runId: int('run_id', { unsigned: true })
    .notNull()
    .references(() => importRuns.id, { onDelete: 'cascade' }),
  feedId: int('feed_id', { unsigned: true })
    .notNull()
    .references(() => feeds.id, { onDelete: 'cascade' }),
  outcome: mysqlEnum('outcome', importOutcomes).notNull(),
  added: int('added', { unsigned: true }).notNull().default(0),
  updated: int('updated', { unsigned: true }).notNull().default(0),
  unchanged: int('unchanged', { unsigned: true }).notNull().default(0),
  skipped: int('skipped', { unsigned: true }).notNull().default(0),
  reason: varchar('reason', { length: reasonMaxLength }),
})

export type ImportResult = typeof importResults.$inferSelect

/**
 * The rules of robots.txt that apply to us, per origin (`https://www.lc.nl`), as JSON. The fetcher keeps them for at
 * most 24 hours (RFC 9309), so the next runs need not ask the host again. A robots.txt it could not read is not kept.
 */
export const robotsTxt = mysqlTable('robots_txt', {
  origin: varchar('origin', { length: 300 }).primaryKey(),
  rules: mediumtext('rules').notNull(),
  fetchedAt: datetime('fetched_at').notNull(),
})
