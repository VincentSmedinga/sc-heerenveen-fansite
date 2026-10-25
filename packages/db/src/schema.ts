import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  customType,
  date,
  datetime,
  index,
  int,
  mediumtext,
  mysqlEnum,
  mysqlTable,
  text,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core'

export const sourceKinds = ['news', 'podcast', 'forum', 'club', 'video'] as const

/**
 * What the importer thinks of an item: `relevant` is about sc Heerenveen and is shown,
 * `doubtful` waits for a person to look at it, `irrelevant` is not about the club. The site
 * shows only `relevant`; the other two are kept, because nothing is thrown away.
 */
export const itemRelevances = ['relevant', 'doubtful', 'irrelevant'] as const

export type ItemRelevance = (typeof itemRelevances)[number]

/**
 * Whether the importer filters the items of a feed: `none` for a feed that only writes about
 * the club, `club` for a feed that writes about more, such as a regional newspaper.
 */
export const feedFilters = ['none', 'club'] as const

export type FeedFilter = (typeof feedFilters)[number]

export const consentStatuses = ['none', 'asked', 'given'] as const

export type ConsentStatus = (typeof consentStatuses)[number]

export type SourceKind = (typeof sourceKinds)[number]

/**
 * The source register: what we may show of each source. A headline, the link and the name of
 * the source are always allowed, so they have no column. Everything else is off until the
 * source has given permission (editorial principles 1 and 2), so a source with only a name, a
 * domain and a kind gets the strictest values.
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
    // What the source is, in one or two sentences of our own, for the page 'Onze bronnen'.
    // Empty means no description.
    description: varchar('description', { length: 300 }),
    // The fixed name of the source in an address, such as `omroep-abe`, so that a renamed
    // source keeps its address. Empty means the source has none. Unique.
    slug: varchar('slug', { length: 100 }).unique(),
    // Where the podcast can be found on Apple Podcasts and on Spotify. Empty means it has no
    // such address.
    applePodcastsUrl: varchar('apple_podcasts_url', { length: 300 }),
    spotifyUrl: varchar('spotify_url', { length: 300 }),

    // The display policy. An intro is shown up to this many characters; 0 means no intro.
    introMaxLength: int('intro_max_length', { unsigned: true }).notNull().default(0),
    allowImage: boolean('allow_image').notNull().default(false),
    allowEmbed: boolean('allow_embed').notNull().default(false),
    // How the source wants to be credited. Empty means the name of the source.
    attribution: varchar('attribution', { length: 150 }),

    // The permission: whether we asked, whether the source gave it, since when and what was
    // agreed.
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

/** The most characters of the reason for hiding an item, in `items` and in `audit_log`. */
export const hiddenReasonMaxLength = 300

/**
 * The most characters a column of `items` holds. The importer skips an item that doesn't fit,
 * instead of cutting it off. A key can be 700 characters at most: that is the longest a unique
 * index over it and `source_id` allows (3072 bytes).
 */
export const itemLimits = { key: 700, title: 500, url: 2048 }

/**
 * A key that two items share only when they are the same byte for byte: a GUID is
 * case-sensitive, and so is the path of a URL, while the collation of the other tables
 * (utf8mb4_unicode_ci) ignores case and accents and would let one item overwrite another.
 */
const itemKey = customType<{ data: string }>({
  dataType: () => `varchar(${itemLimits.key}) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`,
})

/**
 * The most characters of the reason a feed failed or waits, in `feeds` and `import_results`.
 */
export const reasonMaxLength = 300

/**
 * The feeds we read. A source can have more than one. The `ETag` and `Last-Modified` are from
 * the last time the importer read the feed and stored its items, so the source can answer that
 * nothing changed.
 *
 * The importer also keeps the health of each feed here. A run succeeded for a feed when it read
 * and stored it, or when the source said it had not changed. An error counts as a failure.
 * Waiting and a refusal by robots.txt count as neither. Times are UTC.
 */
export const feeds = mysqlTable('feeds', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  sourceId: int('source_id', { unsigned: true })
    .notNull()
    .references(() => sources.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 500 }).notNull().unique(),
  // `none`: every item of the feed is `relevant`. `club`: the importer judges each headline
  // (see `apps/importer/src/relevance.ts`). Change it with an SQL statement; the importer
  // README says how.
  filter: mysqlEnum('filter', feedFilters).notNull().default('none'),
  etag: text('etag'),
  lastModified: text('last_modified'),
  lastSuccessAt: datetime('last_success_at'),
  failuresInARow: int('failures_in_a_row', { unsigned: true }).notNull().default(0),
  lastError: varchar('last_error', { length: reasonMaxLength }),
  lastErrorAt: datetime('last_error_at'),
  // The importer leaves the feed alone until then: the source asked us to wait, or the feed
  // keeps failing.
  retryAt: datetime('retry_at'),
})

export type Feed = typeof feeds.$inferSelect

export type NewFeed = typeof feeds.$inferInsert

/**
 * What the importer stores of a news item: the headline, the link, the time of publication and
 * whether it is behind a paywall, which is no content of the source. Of a podcast episode it
 * also keeps three facts about it, which are no content either: the duration, the season and
 * the number of the episode. An intro, an image, an author or a category has no column, because
 * no source has given permission for it yet (editorial principle 2): what we may not show, we
 * do not store.
 *
 * Times are UTC. `item_key` is the GUID of the item, or its link when it has none, and is
 * unique per source.
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
    // What the importer decided about the headline. The site shows only `relevant`. Items of a
    // feed with filter `none` are always `relevant`.
    relevance: mysqlEnum('relevance', itemRelevances).notNull().default('relevant'),
    // Facts about a podcast episode, as its feed gives them. Empty when the feed has none, and
    // for news.
    durationSeconds: int('duration_seconds', { unsigned: true }),
    seasonNumber: int('season_number', { unsigned: true }),
    episodeNumber: int('episode_number', { unsigned: true }),
    firstSeenAt: datetime('first_seen_at')
      .notNull()
      .default(sql`(UTC_TIMESTAMP())`),
    lastSeenAt: datetime('last_seen_at')
      .notNull()
      .default(sql`(UTC_TIMESTAMP())`),
    // Set when a moderator hides the item: when, by whom and why. All three are empty for an
    // item that is shown. A hidden item is on no page of the site, and the importer leaves it
    // as it is (see `audit_log` for the history).
    hiddenAt: datetime('hidden_at'),
    hiddenBy: int('hidden_by', { unsigned: true }).references(() => adminUsers.id),
    hiddenReason: varchar('hidden_reason', { length: hiddenReasonMaxLength }),
  },
  (table) => [unique('items_source_id_item_key_unique').on(table.sourceId, table.key)],
)

export type Item = typeof items.$inferSelect

export type NewItem = typeof items.$inferInsert

/**
 * The most characters a column of `discussions` holds. The importer skips a discussion that
 * doesn't fit.
 */
export const discussionLimits = { lastPostedBy: 150, title: 500, url: 2048 }

/**
 * The newest discussions of a forum, as a guest sees them. The importer replaces the rows of a
 * forum in every run, so this holds no history: a discussion, a title or a screen name the
 * forum no longer shows is gone after the next run. Of a discussion we keep the address, the
 * title, the number of replies, the time of the last post and the screen name of whoever wrote
 * it, which the forum shows to a guest too. No text of a post, no avatar and nothing else of a
 * member.
 *
 * `reply_count` is the number of posts minus the opening post, as the forum counts.
 * `last_posted_by` is empty when the forum doesn't say. Times are UTC.
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
 * The log of the import: one row for each run, kept for 30 days. `finished_at` is empty while
 * the run is busy, and stays empty when the process stopped halfway. A run that found another
 * run holding the lock did nothing but write its row.
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
 * What a run did with each feed: the outcome, how many items were new, changed, the same or
 * skipped, and why the feed failed or was not read. The reason never holds values from a query.
 * A row goes when its run or its feed goes.
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
  // How many items of the feed the filter judged to be of each kind in this run, hidden items
  // included. All of them are `relevant` for a feed without a filter.
  relevant: int('relevant', { unsigned: true }).notNull().default(0),
  doubtful: int('doubtful', { unsigned: true }).notNull().default(0),
  irrelevant: int('irrelevant', { unsigned: true }).notNull().default(0),
  reason: varchar('reason', { length: reasonMaxLength }),
})

export type ImportResult = typeof importResults.$inferSelect

/**
 * The rules of robots.txt that apply to us, per origin (`https://www.lc.nl`), as JSON. The fetcher keeps them for at
 * most 24 hours (RFC 9309), so the next runs need not ask the host again. A robots.txt it could
 * not read is not kept.
 */
export const robotsTxt = mysqlTable('robots_txt', {
  origin: varchar('origin', { length: 300 }).primaryKey(),
  rules: mediumtext('rules').notNull(),
  fetchedAt: datetime('fetched_at').notNull(),
})

export const adminRoles = ['beheerder', 'moderator'] as const

export type AdminRole = (typeof adminRoles)[number]

/**
 * The accounts that may log in to the admin. There is no sign-up: the command `admin:create`
 * makes one, and `admin:revoke` turns it off (`disabled_at`) and removes its sessions. `email`
 * is lowercase. Times are UTC.
 */
export const adminUsers = mysqlTable('admin_users', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  role: mysqlEnum('role', adminRoles).notNull(),
  createdAt: datetime('created_at')
    .notNull()
    .default(sql`(UTC_TIMESTAMP())`),
  disabledAt: datetime('disabled_at'),
})

export type AdminUser = typeof adminUsers.$inferSelect

/**
 * The links that were mailed to log in, until they are used or expire. Only an account that
 * exists gets a row. The table keeps the SHA-256 of the token, never the token itself, so a
 * copy of the database logs nobody in. Times are UTC.
 */
export const adminLoginLinks = mysqlTable('admin_login_links', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  userId: int('user_id', { unsigned: true })
    .notNull()
    .references(() => adminUsers.id, { onDelete: 'cascade' }),
  expiresAt: datetime('expires_at').notNull(),
})

/**
 * The sessions of the admin, on the server. The cookie holds a random token and nothing else;
 * the table keeps its SHA-256. A session is valid for 12 hours after `last_seen_at` and for 7
 * days after `created_at`, whichever ends first. Times are UTC.
 */
export const adminSessions = mysqlTable('admin_sessions', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  userId: int('user_id', { unsigned: true })
    .notNull()
    .references(() => adminUsers.id, { onDelete: 'cascade' }),
  createdAt: datetime('created_at').notNull(),
  lastSeenAt: datetime('last_seen_at').notNull(),
})

/**
 * The requests for a login link of the last 15 minutes, for the rate limit: how many for one
 * address and how many for the whole site. It keeps the SHA-256 of the address and the time,
 * for known and unknown addresses alike, and no IP address. Rows older than 15 minutes are
 * removed with the next request. Times are UTC.
 */
export const adminLoginAttempts = mysqlTable(
  'admin_login_attempts',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    addressHash: varchar('address_hash', { length: 64 }).notNull(),
    attemptedAt: datetime('attempted_at').notNull(),
  },
  (table) => [
    index('admin_login_attempts_address_hash_attempted_at_idx').on(table.addressHash, table.attemptedAt),
    index('admin_login_attempts_attempted_at_idx').on(table.attemptedAt),
  ],
)

export const auditActions = ['item.hide', 'item.show'] as const

export type AuditAction = (typeof auditActions)[number]

/**
 * What the admin did, one row per action, written by the one function `recordAction` in the
 * site and never changed or removed: no code updates or deletes a row, and a test keeps it so.
 * It keeps who (the id of the account, not the address), when (UTC), what, which item and the
 * reason. `item_id` has no foreign key, so the row stays when an item is deleted. `reason` is
 * empty for an action that has none, such as showing an item again. It holds nothing else of
 * the request.
 */
export const auditLog = mysqlTable(
  'audit_log',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    createdAt: datetime('created_at').notNull(),
    userId: int('user_id', { unsigned: true })
      .notNull()
      .references(() => adminUsers.id),
    action: mysqlEnum('action', auditActions).notNull(),
    itemId: int('item_id', { unsigned: true }).notNull(),
    reason: varchar('reason', { length: hiddenReasonMaxLength }),
  },
  (table) => [index('audit_log_item_id_idx').on(table.itemId)],
)

export type AuditLogRow = typeof auditLog.$inferSelect
