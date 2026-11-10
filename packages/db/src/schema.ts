import { sql } from 'drizzle-orm'
import {
  type AnyMySqlColumn,
  boolean,
  char,
  check,
  customType,
  date,
  datetime,
  foreignKey,
  index,
  int,
  json,
  mediumtext,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  smallint,
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
    // The publisher that owns the source, such as `dpg-media`, for sources that print the same
    // article under one article code. Empty means the source has none and is never merged with
    // another.
    publisher: varchar('publisher', { length: 100 }),
    // Whether the source is the local paper of its publisher: of two sources with the same
    // publisher, the lists show the story of the local one.
    local: boolean('local').notNull().default(false),

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
export const itemLimits = { key: 700, threadKey: 100, title: 500, url: 2048 }

/**
 * A key that two items share only when they are the same byte for byte: a GUID is
 * case-sensitive, and so is the path of a URL, while the collation of the other tables
 * (utf8mb4_unicode_ci) ignores case and accents and would let one item overwrite another.
 */
const itemKey = customType<{ data: string }>({
  dataType: () => `varchar(${itemLimits.key}) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`,
})

/**
 * The key that ties the versions of one story together, as byte-for-byte as `itemKey`: a code
 * in a link is case-sensitive too.
 */
const threadKey = customType<{ data: string }>({
  dataType: () => `varchar(${itemLimits.threadKey}) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`,
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
    // Ties the versions of one story together: a source that puts a story in its feed again
    // under a new headline (a live blog) gives every version a link with the same code. The
    // pages show the newest version of a thread of a source only. Empty for an item of a source
    // with no rule for it (see `apps/importer/src/read-feed.ts`): it is its own story.
    threadKey: threadKey('thread_key'),
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
    // Set when a moderator puts an item on the site that the importer judged `doubtful` or
    // `irrelevant`: when and by whom. Both are empty for an item nobody approved. The importer
    // never touches them, so an approval survives every later run, whatever the filter says.
    // Hiding wins over approving.
    approvedAt: datetime('approved_at'),
    approvedBy: int('approved_by', { unsigned: true }).references(() => adminUsers.id),
  },
  (table) => [
    unique('items_source_id_item_key_unique').on(table.sourceId, table.key),
    index('items_source_id_thread_key_idx').on(table.sourceId, table.threadKey),
  ],
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
  // The code of 6 digits that goes in the same mail, for logging in where the link can't
  // open (the app on a Home Screen has a cookie jar of its own). `ref_hash` is the SHA-256
  // of a random reference that only the page "verstuurd" knows, and `code_hash` the SHA-256
  // of that reference and the code, so the code is bound to its request and a copy of the
  // database can't guess it. Both are empty for a link of before the codes.
  // `failed_attempts` counts the wrong codes; at 5 the code stops working.
  refHash: varchar('ref_hash', { length: 64 }).unique(),
  codeHash: varchar('code_hash', { length: 64 }),
  failedAttempts: int('failed_attempts', { unsigned: true }).notNull().default(0),
})

/**
 * The sessions of the admin, on the server. The cookie holds a random token and nothing else;
 * the table keeps its SHA-256. A session is valid for 9 days after `last_seen_at` and for 14
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

export const auditActions = [
  'item.hide',
  'item.show',
  'item.approve',
  'item.unapprove',
  'article.create',
  'article.update',
  'article.publish',
  'article.unpublish',
  'match.edit',
  'match.undo',
  'match.caught-up',
  'match.differs',
  'match.take-over',
  'match.keep',
  'match.add',
  'match.delete',
  'stadium.save',
  'stadium.reset',
  'club-name.save',
  'club-name.reset',
  'player.stats-differ',
  'player.stats-take-over',
  'player.stats-keep',
  'player.add',
  'player.edit',
  'player.remove',
  'player.field-take-over',
  'player.field-keep',
] as const

export type AuditAction = (typeof auditActions)[number]

/**
 * The most characters the `detail` of a row of `audit_log` holds. A longer text is cut off with
 * an ellipsis before it is stored.
 */
export const auditDetailMaxLength = 1000

/**
 * What the admin did, one row per action, written by the one function `recordAction` in the
 * database package and never changed or removed: no code updates or deletes a row, and a test
 * keeps it so. It keeps who (the id of the account, not the address), when (UTC), what, which
 * item, article, match or club and the reason. `item_id` is the number of an item for an
 * `item.` action, of an article for an `article.` action, of a match for a `match.` action and
 * of a club for a `stadium.` or `club-name.` action: the action says which. It has no foreign
 * key, so the row stays when an item is deleted. `reason` is empty for an action that has
 * none, such as showing an item again. `detail` says what changed, for the actions that change
 * values: the part of a match and the values before and after, or for a `stadium.` or
 * `club-name.` action the numbers of lines. It holds nothing else of the request.
 *
 * `user_id` is empty for a line the importer writes: it has no account. The `match.caught-up`
 * and `match.differs` actions are only ever written by the importer, and have no account, which
 * the log shows as "de import". `match.take-over` and `match.keep` are the decision about a
 * difference between Wikipedia and an entry: an editor decides in the admin, the command
 * `import:changes` decides without an account, and the importer takes Wikipedia over after
 * seven days with `match.take-over`, also without one. `player.stats-differ` is a player
 * whose goals in the match reports differ from the squad table of Wikipedia, with his number
 * in `item_id`: the importer wrote it when the table had new numbers (without an account), and
 * the admin when a report was saved as `klaar`. Since issue 974 such a difference is a row in
 * `player_stat_differences` and nothing writes this action any more. `player.stats-take-over`
 * and `player.stats-keep` are the decision of an editor about such a row, with the player in
 * `item_id`. `player.add`, `player.edit` and `player.remove` are a player the editors added to
 * the squad of a season, changed or took out of it (issue 1020), with the player in `item_id`
 * and what changed in `detail`. `player.field-take-over` and `player.field-keep` are the
 * decision of an editor about a value of the import for a field the editors set (a row of
 * `player_field_differences`, issue 1022), with the player in `item_id`.
 */
export const auditLog = mysqlTable(
  'audit_log',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    createdAt: datetime('created_at').notNull(),
    userId: int('user_id', { unsigned: true }).references(() => adminUsers.id),
    action: mysqlEnum('action', auditActions).notNull(),
    itemId: int('item_id', { unsigned: true }).notNull(),
    reason: varchar('reason', { length: hiddenReasonMaxLength }),
    detail: varchar('detail', { length: auditDetailMaxLength }),
  },
  (table) => [index('audit_log_item_id_idx').on(table.itemId)],
)

export type AuditLogRow = typeof auditLog.$inferSelect

/** The most characters a column of `articles` holds. The admin checks them before it stores. */
export const articleLimits = { author: 100, intro: 300, slug: 80, title: 120 }

/**
 * The articles of our own editors. A visitor sees an article on `/redactie/<slug>` and the
 * newest one as a card on the homepage, once `published_at` is set and has passed. Empty
 * `published_at` is a draft: it is on no page, and withdrawing an article empties it again.
 * Nothing is deleted.
 *
 * `body` is the text as Tiptap's JSON, checked against the list of what an article may hold in
 * `packages/shared/src/article-document.ts`: paragraphs, headings of level 2, lists with
 * bullets, bold, italic and links. Until 4 November 2026 it was a small text format; the
 * conversion is `article-body-migration.ts`. A `mediumtext` holds 16 MB, far more than an
 * article needs; the admin sets the real limit. `author` is the name next to the article, such
 * as "de redactie". `created_by` is the account that put the article in, as a number, never an
 * address. `updated_by` is the account that changed the article last, whatever the change was
 * (an edit, publishing or withdrawing), and is set together with `updated_at`. Accounts are
 * turned off and never deleted, so the foreign keys keep the people behind every article known.
 *
 * `slug` has lowercase letters, digits and single hyphens (the check ignores the collation,
 * which would let capitals through) and is unique, so an address never goes to two articles.
 * Times are UTC; whoever updates an article sets `updated_at` and `updated_by` as well.
 */
export const articles = mysqlTable(
  'articles',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    slug: varchar('slug', { length: articleLimits.slug }).notNull().unique(),
    title: varchar('title', { length: articleLimits.title }).notNull(),
    intro: varchar('intro', { length: articleLimits.intro }).notNull(),
    body: mediumtext('body').notNull(),
    author: varchar('author', { length: articleLimits.author }).notNull(),
    publishedAt: datetime('published_at'),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`(UTC_TIMESTAMP())`),
    updatedAt: datetime('updated_at')
      .notNull()
      .default(sql`(UTC_TIMESTAMP())`),
    createdBy: int('created_by', { unsigned: true })
      .notNull()
      .references(() => adminUsers.id),
    updatedBy: int('updated_by', { unsigned: true })
      .notNull()
      .references(() => adminUsers.id),
  },
  (table) => [
    check('articles_slug_format', sql`${table.slug} regexp '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$'`),
    index('articles_published_at_idx').on(table.publishedAt),
  ],
)

export type Article = typeof articles.$inferSelect

export type NewArticle = typeof articles.$inferInsert

/**
 * Every version of the text of an article: a snapshot of `title`, `slug`, `intro`, `body` and
 * `author` each time an editor creates or edits the article, and nothing else. Version 1 is the
 * article as first saved, and the newest version equals the article itself. Publishing and
 * withdrawing change no text and make no version (the log of the admin has them), and neither
 * does a save that changed nothing. The numbers run 1, 2, 3 per article without gaps, and the
 * unique key keeps two versions from sharing one.
 *
 * `saved_at` is UTC and `saved_by` is the account, as a number. The one function
 * `recordVersion` in the site writes it, in the same transaction as the change, and nothing
 * updates or deletes a row: a test keeps it so. The one exception is the conversion of `body`
 * to JSON (`article-body-migration.ts`), which changes only that column. An article that is
 * only changed with SQL keeps
 * no versions.
 */
export const articleVersions = mysqlTable(
  'article_versions',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    articleId: int('article_id', { unsigned: true })
      .notNull()
      .references(() => articles.id),
    version: int('version', { unsigned: true }).notNull(),
    title: varchar('title', { length: articleLimits.title }).notNull(),
    slug: varchar('slug', { length: articleLimits.slug }).notNull(),
    intro: varchar('intro', { length: articleLimits.intro }).notNull(),
    body: mediumtext('body').notNull(),
    author: varchar('author', { length: articleLimits.author }).notNull(),
    savedAt: datetime('saved_at').notNull(),
    savedBy: int('saved_by', { unsigned: true })
      .notNull()
      .references(() => adminUsers.id),
  },
  (table) => [unique('article_versions_article_id_version_unique').on(table.articleId, table.version)],
)

export type ArticleVersion = typeof articleVersions.$inferSelect

/**
 * The competitions of a match. `Play-offs Conference League` is the match or two that decide
 * the ticket for the second qualifying round after the league season, from 2020/21. `Play-offs
 * Europa League` is the same for the Europa League, before 2020/21. `Europa League` holds the
 * matches of the Europa League that sc Heerenveen played in 2009/10 and 2012/13. `Johan
 * Cruijff Schaal` is the one match for the shield of 2009, and `Play-offs Champions League` the
 * play-offs of 2008 for a ticket to the qualifying round of the Champions League: the two
 * matches against Ajax and the two against NAC Breda that followed them.
 *
 * The six after `Play-offs Europa League` are the competitions of the old matches, from 1990 to
 * 2007, named as they were called then (the Europa League did not exist yet): `Eerste divisie`
 * (1991/92 and 1992/93), `Champions League` (2000/01), `Europacup II` (1998/99), `UEFA Cup`
 * (2002/03 to 2006/07, and 2007/08 and 2008/09 from Wikipedia), `Intertoto Cup` (1995 to 2003,
 * the summer tournament) and `Play-offs UEFA Cup` (2005/06).
 */
export const competitions = [
  'Eredivisie',
  'KNVB Beker',
  'Play-offs Conference League',
  'Europa League',
  'Play-offs Europa League',
  'Eerste divisie',
  'Champions League',
  'Europacup II',
  'UEFA Cup',
  'Intertoto Cup',
  'Play-offs UEFA Cup',
  'Johan Cruijff Schaal',
  'Play-offs Champions League',
] as const

/**
 * Where a match comes from: `wikipedia` is the import of the Dutch Wikipedia, and
 * `oude-fansite` the import of the matches of the old fansite, 1990 to 2007, and `redactie` a
 * match the editors added themselves, with the source they took it from (`source_line`). Each
 * import reads, writes and removes only the matches of its own source, so no import touches a
 * match of the editors.
 */
export const matchDataSources = ['wikipedia', 'oude-fansite', 'redactie'] as const

export type Competition = (typeof competitions)[number]

export type MatchDataSource = (typeof matchDataSources)[number]

/**
 * The competitions the squad table has numbers for. The play-offs are not in it, so they have
 * no rows in `player_season_stats`.
 */
export const statsCompetitions = ['Eredivisie', 'KNVB Beker'] as const

export type StatsCompetition = (typeof statsCompetitions)[number]

/**
 * Where a match stands: `scheduled` is still to be played (with or without a time), `played`
 * has a result, `postponed` was called off and has no new date yet, `cancelled` was called
 * off and will not be played any more (the importer decides that once the season is over).
 */
export const matchStatuses = ['scheduled', 'played', 'postponed', 'cancelled'] as const

export type MatchStatus = (typeof matchStatuses)[number]

/**
 * The most characters a column of `matches` holds. The importer checks them before it
 * stores.
 */
export const matchLimits = {
  attendance: 150000,
  dateText: 60,
  note: 255,
  opponent: 100,
  referee: 100,
  round: 60,
  season: 7,
  sourceLine: 255,
  stadium: 150,
}

/**
 * The most characters the Wikipedia page of a player or a club holds, in `players`,
 * `match_goals` and `clubs`.
 * A title on Wikipedia is up to 255 bytes, so a longer one is not a page we keep.
 */
export const wikipediaPageMaxLength = 255

/** The most characters a column of `clubs` and `club_names` holds. */
export const clubLimits = { name: matchLimits.opponent, slug: 80 }

/**
 * A page title on Wikipedia, compared byte for byte: `Go Ahead Eagles` and `Go ahead eagles`
 * are two pages there, while the collation of the other tables (utf8mb4_unicode_ci) would
 * treat them as one.
 */
const articleTitle = customType<{ data: string }>({
  dataType: () => `varchar(${wikipediaPageMaxLength}) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`,
})

/**
 * The professional clubs a headline names, other than sc Heerenveen: one row for each club of
 * each item, with the club as `matches.opponent` has its name (the pages of a club find it
 * through `clubs.name` and `club_names`). The importer fills it for every item it stores, also
 * for a feed without a filter, and works it out again from the title each time the item comes
 * by, so a new title gives new rows (see `clubsNamed` in `apps/importer/src/relevance.ts`). The
 * rows go with their item. It holds names of clubs only, no text of the source.
 */
export const itemClubs = mysqlTable(
  'item_clubs',
  {
    itemId: int('item_id', { unsigned: true })
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    club: varchar('club', { length: matchLimits.opponent }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.club] }), index('item_clubs_club_idx').on(table.club)],
)

export type ItemClub = typeof itemClubs.$inferSelect

export type NewItemClub = typeof itemClubs.$inferInsert

/**
 * The clubs sc Heerenveen played against. One club is one article on the Dutch Wikipedia:
 * `wikipedia_page` is the title of that article, after any redirects (unique where there is
 * one), and a club that is named in more than one way is still one row. The titles that lead
 * to the article, such as `AZ Alkmaar` for `AZ (voetbalclub)`, are in `club_pages`. `slug` is
 * the fixed name in an address, with lowercase letters, digits and single hyphens (the check
 * ignores the collation, which would let capitals through); it is unique and never changes
 * when the name does. `name` is the name of the newest season we have of the club; the other
 * names it was written with are in `club_names`. Times are UTC.
 */
export const clubs = mysqlTable(
  'clubs',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    slug: varchar('slug', { length: clubLimits.slug }).notNull().unique(),
    name: varchar('name', { length: clubLimits.name }).notNull(),
    wikipediaPage: articleTitle('wikipedia_page').unique(),
    createdAt: datetime('created_at')
      .notNull()
      .default(sql`(UTC_TIMESTAMP())`),
  },
  (table) => [check('clubs_slug_format', sql`${table.slug} regexp '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$'`)],
)

export type Club = typeof clubs.$inferSelect

export type NewClub = typeof clubs.$inferInsert

/**
 * The other names of a club, as Wikipedia writes them in the matches (`N.E.C.` for `NEC`). A
 * name belongs to one club, so it is unique; the club's own `name` is not repeated here. The
 * rows go with their club.
 */
export const clubNames = mysqlTable('club_names', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  clubId: int('club_id', { unsigned: true })
    .notNull()
    .references(() => clubs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: clubLimits.name }).notNull().unique(),
})

export type ClubName = typeof clubNames.$inferSelect

export type NewClubName = typeof clubNames.$inferInsert

/**
 * The titles of Wikipedia articles that belong to a club: its own article, and the titles that
 * redirect to it (`AZ Alkmaar` is a redirect to `AZ (voetbalclub)`). The importer asks
 * Wikipedia once whether a title is a redirect, and this table is how it remembers the answer:
 * a title that is here costs no request. A title belongs to one club, so it is the primary key,
 * and the rows go with their club.
 */
export const clubPages = mysqlTable('club_pages', {
  page: articleTitle('page').primaryKey(),
  clubId: int('club_id', { unsigned: true })
    .notNull()
    .references(() => clubs.id, { onDelete: 'cascade' }),
})

export type ClubPage = typeof clubPages.$inferSelect

export type NewClubPage = typeof clubPages.$inferInsert

/**
 * Where the name of a person comes from: the sort key of the article, a guess, the list of the
 * importer, or the editors, who filled it in in the admin (`redactie`, issue 1020).
 */
export const personNameSources = ['sort_key', 'guess', 'manual', 'redactie'] as const

export type PersonNameSource = (typeof personNameSources)[number]

/** The most characters the columns with the name of a person hold. */
export const personNameLimits = { familyName: 150, familyNamePrefix: 30, givenName: 100, name: 255 }

/** The four lines of a player, and the lines of a person too (`persons.line`). */
export const playerPositions = ['doelman', 'verdediger', 'middenvelder', 'aanvaller'] as const

export type PlayerPosition = (typeof playerPositions)[number]

/**
 * Where the line of a person comes from: Wikidata, the squad lists of the seasons, or our own
 * list.
 */
export const personLineSources = ['wikidata', 'squad', 'manual'] as const

export type PersonLineSource = (typeof personLineSources)[number]

/**
 * How exact a birth date is: a day, a month (the first of it is stored) or a year (1 January).
 */
export const birthDatePrecisions = ['day', 'month', 'year'] as const

export type BirthDatePrecision = (typeof birthDatePrecisions)[number]

/** The most characters a Q-number of Wikidata holds (`Q15943430`), and the most of a label. */
export const wikidataLimits = { id: 20, label: 255 }

/**
 * The name of an item of Wikidata that a person points at: a country, a place or a position
 * (#898). `id` is the Q-number (`Q29999`) and `label` the Dutch name of the item, or the
 * English one when it has no Dutch name. The importer reads an item once, so it never asks
 * again about a Q-number that is here. The data are CC0
 * (https://creativecommons.org/publicdomain/zero/1.0/).
 */
export const wikidataItems = mysqlTable('wikidata_items', {
  id: varchar('id', { length: wikidataLimits.id }).primaryKey(),
  label: varchar('label', { length: wikidataLimits.label }).notNull(),
})

export type NewWikidataItem = typeof wikidataItems.$inferInsert

export type WikidataItem = typeof wikidataItems.$inferSelect

/**
 * A person who scored a goal or stood in the squad of a match, ours or an opponent's: one row
 * for each article about a player on the Dutch Wikipedia, with an `id` that never changes. The
 * `wikipedia_page` is the title of the article after the redirects, with the addition between
 * brackets when it has one (`Johnny Jansen (1975)`), so two titles that redirect to the same
 * article are one person. A title without an article (a red link) is a person too, under the
 * title as it stands. `person_pages` keeps every title that leads to the person, and the
 * `person_id` of `match_goals` and `players` points here. A person who is deleted leaves them
 * without a person; the importer finds the person again by the title.
 *
 * A person the editors made in the admin for a player without an article has no
 * `wikipedia_page` (issue 1020): his name, with the source `redactie`, is all there is. He has
 * no row in `person_pages`, and the importer never asks Wikidata about him. He gets a title
 * when the editors give his player one.
 */
export const persons = mysqlTable('persons', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  wikipediaPage: articleTitle('wikipedia_page').unique(),
  // The name, kept when the importer reads the article (#715), or filled in by the editors
  // (#1020). All five are empty until then.
  // `name` is the title without the addition between brackets ("Joost van Aken"). `given_name`
  // is empty for a person with one name ("Dinho"), `family_name_prefix` for a name without
  // "van", "van der" and the like, and the three parts with a space between them give `name`.
  name: varchar('name', { length: personNameLimits.name }),
  givenName: varchar('given_name', { length: personNameLimits.givenName }),
  familyNamePrefix: varchar('family_name_prefix', { length: personNameLimits.familyNamePrefix }),
  familyName: varchar('family_name', { length: personNameLimits.familyName }),
  nameSource: mysqlEnum('name_source', personNameSources),
  // What the importer reads from Wikidata (#898), once for each person. All are empty until
  // `wikidata_read_at` is set, and stay empty for a person without an article or an item.
  // `wikidata_id` is the Q-number and `wikipedia_page_id` the number of the article on the
  // Dutch Wikipedia. `birth_date` is a day, or the first of the month or of the year when
  // `birth_date_precision` says that is all Wikidata knows. A birth date of a living player is
  // a personal datum: it stays in the database and the site shows it only after a decision of
  // its own. `line` is the line (`playerPositions`) and `line_source` where it came from.
  wikidataId: varchar('wikidata_id', { length: wikidataLimits.id }).unique(),
  wikipediaPageId: int('wikipedia_page_id', { unsigned: true }),
  birthDate: date('birth_date', { mode: 'string' }),
  birthDatePrecision: mysqlEnum('birth_date_precision', birthDatePrecisions),
  birthPlaceId: varchar('birth_place_id', { length: wikidataLimits.id }).references(() => wikidataItems.id),
  line: mysqlEnum('line', playerPositions),
  lineSource: mysqlEnum('line_source', personLineSources),
  wikidataReadAt: datetime('wikidata_read_at'),
})

export type NewPerson = typeof persons.$inferInsert

export type Person = typeof persons.$inferSelect

/**
 * The titles of Wikipedia articles that belong to a person: the title of the article itself,
 * and the titles that redirect to it (`Alfred Finnbogason` leads to `Alfreð Finnbogason`). The
 * importer asks Wikipedia once about a title and this table is how it remembers the answer, as
 * `club_pages` does for the clubs: a title that is here costs no request. A title belongs to
 * one person, so it is the primary key, and the rows go with their person.
 */
export const personPages = mysqlTable('person_pages', {
  page: articleTitle('page').primaryKey(),
  personId: int('person_id', { unsigned: true })
    .notNull()
    .references(() => persons.id, { onDelete: 'cascade' }),
})

export type NewPersonPage = typeof personPages.$inferInsert

export type PersonPage = typeof personPages.$inferSelect

/**
 * The nationalities of a person (`P27` on Wikidata), in the order Wikidata lists them:
 * `position` counts from 0. The rows go with their person. The country is a row of
 * `wikidata_items`, so "all Dutch players" is a query without JSON.
 */
export const personNationalities = mysqlTable(
  'person_nationalities',
  {
    personId: int('person_id', { unsigned: true })
      .notNull()
      .references(() => persons.id, { onDelete: 'cascade' }),
    position: smallint('position', { unsigned: true }).notNull(),
    itemId: varchar('item_id', { length: wikidataLimits.id })
      .notNull()
      .references(() => wikidataItems.id),
  },
  (table) => [primaryKey({ columns: [table.personId, table.position] }), unique().on(table.personId, table.itemId)],
)

export type NewPersonNationality = typeof personNationalities.$inferInsert

export type PersonNationality = typeof personNationalities.$inferSelect

/**
 * The positions of a person (`P413` on Wikidata), in the order Wikidata lists them:
 * `position` counts from 0. The rows go with their person.
 */
export const personPositions = mysqlTable(
  'person_positions',
  {
    personId: int('person_id', { unsigned: true })
      .notNull()
      .references(() => persons.id, { onDelete: 'cascade' }),
    position: smallint('position', { unsigned: true }).notNull(),
    itemId: varchar('item_id', { length: wikidataLimits.id })
      .notNull()
      .references(() => wikidataItems.id),
  },
  (table) => [primaryKey({ columns: [table.personId, table.position] }), unique().on(table.personId, table.itemId)],
)

export type NewPersonPosition = typeof personPositions.$inferInsert

export type PersonPosition = typeof personPositions.$inferSelect

/** The most characters a column of `club_stadiums` holds. The admin checks them first. */
export const clubStadiumLimits = { name: 100, note: 200 }

/**
 * The names of the stadium of a club, as the editors keep them in the admin. A club with rows
 * here has its own list, which the card on its page shows instead of what the matches say. The
 * rows are in order: `position` counts from 0, and a club has its rows with 0, 1, 2 and so on.
 * A name starts with a season (`start_season`, such as `2019/20`, counting as 1 July of that
 * year) or with a day (`start_day`), never both, and the next name decides where it ends. Only
 * the first name may have no start. `note` is a short text of our own for the card, such as why
 * a club played elsewhere for a while. The rows go with their club, and a test of the database
 * package keeps the rules of a row.
 */
export const clubStadiums = mysqlTable(
  'club_stadiums',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    clubId: int('club_id', { unsigned: true })
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    position: smallint('position', { unsigned: true }).notNull(),
    name: varchar('name', { length: clubStadiumLimits.name }).notNull(),
    startSeason: varchar('start_season', { length: matchLimits.season }),
    startDay: date('start_day', { mode: 'string' }),
    note: varchar('note', { length: clubStadiumLimits.note }),
  },
  (table) => [
    unique('club_stadiums_club_id_position_unique').on(table.clubId, table.position),
    check('club_stadiums_one_start', sql`${table.startSeason} is null or ${table.startDay} is null`),
    check(
      'club_stadiums_start_season_format',
      sql`${table.startSeason} is null or ${table.startSeason} regexp '^[0-9]{4}/[0-9]{2}$'`,
    ),
    check(
      'club_stadiums_start_after_first',
      sql`${table.position} = 0 or ${table.startSeason} is not null or ${table.startDay} is not null`,
    ),
  ],
)

export type ClubStadium = typeof clubStadiums.$inferSelect

export type NewClubStadium = typeof clubStadiums.$inferInsert

/** The most characters a column of `club_name_periods` holds. The admin checks them first. */
export const clubNamePeriodLimits = { name: clubLimits.name, note: 200 }

/**
 * The names a club has had, as the editors keep them in the admin: for display only. The
 * importer decides the name in the heading and the slug, and finds a renamed club through
 * `club_names`, which gets every name saved here. A club with rows here has its own list: its
 * page says "Eerder" from it, and the lists of matches show the name of the season. The rows
 * are in order: `position` counts from 0. A name starts with a season (`start_season`, such as
 * `2012/13`, counting as 1 July of that year) or with a day (`start_day`), never both, and the
 * next name decides where it ends. Only the first name may have no start. `note` is a short
 * text of our own, such as when the KNVB approved the name. The rows go with their club, and a
 * test of the database package keeps the rules of a row.
 */
export const clubNamePeriods = mysqlTable(
  'club_name_periods',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    clubId: int('club_id', { unsigned: true })
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    position: smallint('position', { unsigned: true }).notNull(),
    name: varchar('name', { length: clubNamePeriodLimits.name }).notNull(),
    startSeason: varchar('start_season', { length: matchLimits.season }),
    startDay: date('start_day', { mode: 'string' }),
    note: varchar('note', { length: clubNamePeriodLimits.note }),
  },
  (table) => [
    unique('club_name_periods_club_id_position_unique').on(table.clubId, table.position),
    check('club_name_periods_one_start', sql`${table.startSeason} is null or ${table.startDay} is null`),
    check(
      'club_name_periods_start_season_format',
      sql`${table.startSeason} is null or ${table.startSeason} regexp '^[0-9]{4}/[0-9]{2}$'`,
    ),
    check(
      'club_name_periods_start_after_first',
      sql`${table.position} = 0 or ${table.startSeason} is not null or ${table.startDay} is not null`,
    ),
  ],
)

export type ClubNamePeriod = typeof clubNamePeriods.$inferSelect

export type NewClubNamePeriod = typeof clubNamePeriods.$inferInsert

/**
 * The matches of sc Heerenveen 1 (men), from the Dutch Wikipedia: the Eredivisie, the KNVB
 * Beker and the play-offs for the Conference League or the Europa League. A season starts on
 * 1 July and is written `2026/27`. The importer reads the current season only and never changes
 * or removes the rows of an earlier one.
 *
 * `round` is the label as Wikipedia has it, such as `Speelronde 12` or `Eerste ronde`; it is
 * unique per season and competition, because sc Heerenveen plays one match in each. `home` is
 * true for a match at the Abe Lenstra Stadion. `goals_for` and `goals_against` are the goals
 * of sc Heerenveen and of the opponent, and both are empty unless the match is `played`.
 *
 * `extra_time` is true when a played match of the cup or the play-offs went to extra time.
 * When the score was still level after that, a shoot-out decides it, and `penalties_for` and
 * `penalties_against` hold its score from the side of sc Heerenveen and of the opponent: both
 * or neither. Only the cup and the play-offs have them, and `goals_for` and `goals_against`
 * stay the score as Wikipedia gives it, shoot-out not included.
 *
 * `after_ninety_for` and `after_ninety_against` hold the score after 90 minutes of a match with
 * extra time, from the same two sides: both or neither. They are empty when the page does not
 * give that score. They can equal the final score, because extra time can pass without a goal,
 * but never exceed it.
 *
 * `note` is a line under the match, from facts the page gives, and is empty for nearly every
 * match. The importer writes it for a match that was stopped and finished later: "Gestaakt in
 * minuut 82. Het restant is op 11 mei gespeeld in het Abe Lenstra Stadion." Such a match counts
 * for where and when it began (`stadium`, `match_date`, `kickoff_at`, `home`), and the note is
 * the only place that holds where the rest was played.
 *
 * `attendance` is the number of spectators and `referee` the full name of the referee, as the
 * page gives them (no link, no photo). Both are empty when the page does not give them.
 * `attendance` is 0 for a match without an audience, never above `matchLimits.attendance`, and
 * only for a played match. For a match that was stopped and finished later they are the ones of
 * the block of the stopped match, like the other facts of where and when it began.
 *
 * `match_date` is the local day (Europe/Amsterdam), or the first day when Wikipedia only knows
 * a weekend. `kickoff_at` is the kick-off in UTC and is empty while the time is unknown: the
 * KNVB announces the times of rounds 22 to 32 on 22 December 2026. `date_text` then holds the
 * date as Wikipedia gives it, such as `12-14 februari 2027`, and is empty when the kick-off is
 * known.
 *
 * `data_source` says which import the match comes from (see `matchDataSources`), and so which
 * import may change or remove it. Only a match of the old fansite or of the editors may have
 * neither `kickoff_at` nor `date_text`: its date is then known and its time is not. A match of
 * the editors has `source_line`, where they took it from, (required).
 *
 * `result_set_at` is the moment the importer first saw the current result, so it can tell a
 * correction of a few hours old from a change after days (see `match_changes`).
 *
 * `club_id` is the opponent as a club (`clubs`), which gives it a fixed name in an address.
 * `opponent` stays as Wikipedia wrote it in this match.
 */
export const matches = mysqlTable(
  'matches',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    season: varchar('season', { length: matchLimits.season }).notNull(),
    competition: mysqlEnum('competition', competitions).notNull(),
    round: varchar('round', { length: matchLimits.round }).notNull(),
    opponent: varchar('opponent', { length: matchLimits.opponent }).notNull(),
    clubId: int('club_id', { unsigned: true })
      .notNull()
      .references(() => clubs.id),
    home: boolean('home').notNull(),
    stadium: varchar('stadium', { length: matchLimits.stadium }),
    status: mysqlEnum('status', matchStatuses).notNull(),
    goalsFor: int('goals_for', { unsigned: true }),
    goalsAgainst: int('goals_against', { unsigned: true }),
    extraTime: boolean('extra_time').notNull().default(false),
    penaltiesFor: int('penalties_for', { unsigned: true }),
    penaltiesAgainst: int('penalties_against', { unsigned: true }),
    afterNinetyFor: int('after_ninety_for', { unsigned: true }),
    afterNinetyAgainst: int('after_ninety_against', { unsigned: true }),
    matchDate: date('match_date', { mode: 'string' }).notNull(),
    kickoffAt: datetime('kickoff_at'),
    dateText: varchar('date_text', { length: matchLimits.dateText }),
    note: varchar('note', { length: matchLimits.note }),
    attendance: int('attendance', { unsigned: true }),
    referee: varchar('referee', { length: matchLimits.referee }),
    resultSetAt: datetime('result_set_at'),
    dataSource: mysqlEnum('data_source', matchDataSources).notNull().default('wikipedia'),
    sourceLine: varchar('source_line', { length: matchLimits.sourceLine }),
  },
  (table) => [
    unique('matches_season_competition_round_unique').on(table.season, table.competition, table.round),
    index('matches_season_match_date_idx').on(table.season, table.matchDate),
    check(
      'matches_result_only_when_played',
      sql`(${table.status} = 'played' and ${table.goalsFor} is not null and ${table.goalsAgainst} is not null) or (${table.status} <> 'played' and ${table.goalsFor} is null and ${table.goalsAgainst} is null)`,
    ),
    check(
      'matches_time_or_text',
      sql`${table.dataSource} <> 'wikipedia' or ${table.kickoffAt} is not null or ${table.dateText} is not null`,
    ),
    check(
      'matches_extra_time_only_in_played_knockout',
      sql`${table.extraTime} = 0 or (${table.status} = 'played' and ${table.competition} not in ('Eredivisie', 'Eerste divisie'))`,
    ),
    check(
      'matches_penalties_in_a_pair',
      sql`(${table.penaltiesFor} is null and ${table.penaltiesAgainst} is null) or (${table.penaltiesFor} is not null and ${table.penaltiesAgainst} is not null)`,
    ),
    check(
      'matches_penalties_after_level_extra_time',
      sql`${table.penaltiesFor} is null or (${table.extraTime} = 1 and ${table.goalsFor} = ${table.goalsAgainst})`,
    ),
    check(
      'matches_after_ninety_in_a_pair',
      sql`(${table.afterNinetyFor} is null and ${table.afterNinetyAgainst} is null) or (${table.afterNinetyFor} is not null and ${table.afterNinetyAgainst} is not null)`,
    ),
    check(
      'matches_after_ninety_within_extra_time',
      sql`${table.afterNinetyFor} is null or (${table.extraTime} = 1 and ${table.afterNinetyFor} <= ${table.goalsFor} and ${table.afterNinetyAgainst} <= ${table.goalsAgainst})`,
    ),
    check(
      'matches_attendance_in_range_when_played',
      sql`${table.attendance} is null or (${table.status} = 'played' and ${table.attendance} <= ${sql.raw(String(matchLimits.attendance))})`,
    ),
    check(
      'matches_source_line_for_editors',
      sql`${table.dataSource} <> 'redactie' or coalesce(char_length(${table.sourceLine}), 0) > 0`,
    ),
    check('matches_referee_not_empty', sql`${table.referee} is null or char_length(${table.referee}) > 0`),
  ],
)

export type Match = typeof matches.$inferSelect

export type NewMatch = typeof matches.$inferInsert

/**
 * The corners, offsides and fouls of a played match, from the old fansite: one row for each
 * match, and only when at least one of the six numbers is above 0, because 0-0-0 meant "not
 * known" there. All numbers are from the side of sc Heerenveen, like `goals_for` and
 * `goals_against`. The row goes with its match. Nothing reads the table yet.
 */
export const matchStatistics = mysqlTable('match_statistics', {
  matchId: int('match_id', { unsigned: true })
    .primaryKey()
    .references(() => matches.id, { onDelete: 'cascade' }),
  cornersFor: int('corners_for', { unsigned: true }).notNull(),
  cornersAgainst: int('corners_against', { unsigned: true }).notNull(),
  offsidesFor: int('offsides_for', { unsigned: true }).notNull(),
  offsidesAgainst: int('offsides_against', { unsigned: true }).notNull(),
  foulsFor: int('fouls_for', { unsigned: true }).notNull(),
  foulsAgainst: int('fouls_against', { unsigned: true }).notNull(),
})

export type MatchStatistics = typeof matchStatistics.$inferSelect

export type NewMatchStatistics = typeof matchStatistics.$inferInsert

/** The most characters the player column of `match_goals` holds. */
export const matchGoalPlayerMaxLength = 100

/**
 * The goals of a played match, one row for each, from the Dutch Wikipedia. `ours` is true for a
 * goal of sc Heerenveen and false for a goal of the opponent; an own goal belongs to the club
 * that benefits from it, so the goals of a club add up to its goals in `matches`. `minute` is
 * the minute on the clock, and `stoppage_minutes` the minutes of added time after it: 45 and 1
 * for "45+1". Added time is empty for a goal in regular time, and for a goal without a minute:
 * the old fansite did not know the minute of 4 goals, and the minute is empty then. `player` is
 * the name as the page shows it, such as `Van Bergen`. A row belongs to its match and goes with
 * it.
 *
 * `player_id` is the player of ours who scored, in `players`, and `wikipedia_page` the page the
 * goal links to (`Luca Oyen` for `[[Luca Oyen|Oyen]]`), empty when the name has no link. Only
 * the goals of a player of ours have a `player_id`: a goal of sc Heerenveen that is not an own
 * goal, and an own goal of one of our players, which is listed under the opponent. The goal of
 * a player of another club, and an own goal of an opponent, have none, and neither has a goal
 * we could not link. The importer lays the links (see `link-players.ts`); a player that is
 * deleted leaves his goals behind without a link.
 *
 * `person_id` is the person (`persons`) of the page the goal links to, for a goal of ours and
 * of an opponent alike. It is empty for a goal without a page, and until the importer has asked
 * Wikipedia about the title. `wikipedia_page` stays the title as the match page writes it.
 *
 * `appearance_id` is the player who scored and `assist_appearance_id` the player who gave the
 * assist, in the report of the match (`match_appearances`). Both are empty for a goal without a
 * report, and a deleted appearance leaves the goal itself behind. A report is stored with the
 * goals of the match (see `match_reports`), and then `match_edits` marks the goals as the
 * editors', so the import leaves them alone.
 *
 * The importer stores the rows in the order they are shown, so the order of `id` breaks a tie
 * between two goals in the same minute. A match has none of them when the page did not name
 * the scorers yet, or when they did not fit the result.
 */
export const matchGoals = mysqlTable(
  'match_goals',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    matchId: int('match_id', { unsigned: true })
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    ours: boolean('ours').notNull(),
    minute: int('minute', { unsigned: true }),
    stoppageMinutes: int('stoppage_minutes', { unsigned: true }),
    player: varchar('player', { length: matchGoalPlayerMaxLength }).notNull(),
    playerId: int('player_id', { unsigned: true }).references(() => players.id, { onDelete: 'set null' }),
    personId: int('person_id', { unsigned: true }).references(() => persons.id, { onDelete: 'set null' }),
    wikipediaPage: varchar('wikipedia_page', { length: wikipediaPageMaxLength }),
    ownGoal: boolean('own_goal').notNull().default(false),
    penalty: boolean('penalty').notNull().default(false),
    appearanceId: int('appearance_id', { unsigned: true }).references((): AnyMySqlColumn => matchAppearances.id, {
      onDelete: 'set null',
    }),
    assistAppearanceId: int('assist_appearance_id', { unsigned: true }).references(
      (): AnyMySqlColumn => matchAppearances.id,
      { onDelete: 'set null' },
    ),
  },
  (table) => [
    index('match_goals_match_id_idx').on(table.matchId),
    index('match_goals_player_id_idx').on(table.playerId),
    index('match_goals_appearance_id_idx').on(table.appearanceId),
    index('match_goals_assist_appearance_id_idx').on(table.assistAppearanceId),
    check('match_goals_not_own_goal_and_penalty', sql`${table.ownGoal} = 0 or ${table.penalty} = 0`),
    check('match_goals_stoppage_needs_minute', sql`${table.stoppageMinutes} is null or ${table.minute} is not null`),
  ],
)

export type MatchGoal = typeof matchGoals.$inferSelect

export type NewMatchGoal = typeof matchGoals.$inferInsert

/**
 * What the editors filled in or corrected of a match, one row per match that has an entry. The
 * entry itself is in `matches` and `match_goals`, where every page reads it; this row marks
 * which parts of the match are theirs: `kickoff_edited` for the kick-off (`match_date`,
 * `kickoff_at`, `date_text`), `result_edited` for the status and the result (the score, extra
 * time, the score after 90 minutes and the penalties), `goals_edited` for the goals and
 * `facts_edited` for the spectators, the referee, the stadium and the note. The importer keeps
 * a marked part as it is until Wikipedia has the same, and then clears the marker; the row is
 * gone when no marker is left.
 *
 * `edited_by`, `edited_at` and `reason` are who made the last entry, when (UTC) and why;
 * `audit_log` has every entry. `before_match` and `before_goals` are the match and its goals
 * as JSON, as they were before the first entry (see `match-edits.ts`), so removing the entry
 * can put them back. `reported_kickoff`, `reported_result`, `reported_goals` and
 * `reported_facts` are what Wikipedia said the last time it differed from the entry of that
 * part, so the importer reports a difference once and not on every run.
 */
export const matchEdits = mysqlTable(
  'match_edits',
  {
    matchId: int('match_id', { unsigned: true })
      .primaryKey()
      .references(() => matches.id, { onDelete: 'cascade' }),
    kickoffEdited: boolean('kickoff_edited').notNull().default(false),
    resultEdited: boolean('result_edited').notNull().default(false),
    goalsEdited: boolean('goals_edited').notNull().default(false),
    factsEdited: boolean('facts_edited').notNull().default(false),
    editedBy: int('edited_by', { unsigned: true })
      .notNull()
      .references(() => adminUsers.id),
    editedAt: datetime('edited_at').notNull(),
    reason: varchar('reason', { length: hiddenReasonMaxLength }).notNull(),
    beforeMatch: text('before_match').notNull(),
    beforeGoals: text('before_goals').notNull(),
    reportedKickoff: text('reported_kickoff'),
    reportedResult: text('reported_result'),
    reportedGoals: text('reported_goals'),
    reportedFacts: text('reported_facts'),
  },
  (table) => [
    check(
      'match_edits_a_part_is_edited',
      sql`${table.kickoffEdited} = 1 or ${table.resultEdited} = 1 or ${table.goalsEdited} = 1 or ${table.factsEdited} = 1`,
    ),
  ],
)

export type MatchEdit = typeof matchEdits.$inferSelect

export type NewMatchEdit = typeof matchEdits.$inferInsert

/** The most characters the club column of `standings` holds. */
export const standingsClubMaxLength = 100

/**
 * The league table of the Eredivisie, one row per club, from the Dutch Wikipedia. `valid_on` is
 * the day the table holds for: the day of the last match that has been played. Every row of a
 * season has the same day, because the importer replaces the whole table at once. A table of
 * an earlier season stays as it was.
 *
 * `played` and `goal_difference` are worked out from the rest when the importer reads the table
 * (Wikipedia gives wins, draws, losses and goals); `goal_difference` can be negative. `points`
 * is the number on the page, so after a deduction: `points_deducted` holds the points the club
 * lost (0 for most), and `points` is 3 × won + drawn − `points_deducted`.
 */
export const standings = mysqlTable(
  'standings',
  {
    season: varchar('season', { length: matchLimits.season }).notNull(),
    position: int('position', { unsigned: true }).notNull(),
    club: varchar('club', { length: standingsClubMaxLength }).notNull(),
    played: int('played', { unsigned: true }).notNull(),
    won: int('won', { unsigned: true }).notNull(),
    drawn: int('drawn', { unsigned: true }).notNull(),
    lost: int('lost', { unsigned: true }).notNull(),
    goalsFor: int('goals_for', { unsigned: true }).notNull(),
    goalsAgainst: int('goals_against', { unsigned: true }).notNull(),
    goalDifference: int('goal_difference').notNull(),
    points: int('points', { unsigned: true }).notNull(),
    pointsDeducted: int('points_deducted', { unsigned: true }).notNull().default(0),
    validOn: date('valid_on', { mode: 'string' }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.season, table.position], name: 'standings_season_position' }),
    unique('standings_season_club_unique').on(table.season, table.club),
  ],
)

export type NewStandingsRow = typeof standings.$inferInsert

export type StandingsRow = typeof standings.$inferSelect

/**
 * The results of the Eredivisie, one row per played league match of any club, from the
 * programme page of the Dutch Wikipedia. The importer replaces the rows of a season at once,
 * like the table. A match without a result (planned or postponed) has no row until it is
 * played. The play-offs and the cup are not in it, and neither are the scorers: `matches` has
 * those for sc Heerenveen.
 *
 * `home_club` and `away_club` are written as `standings.club` writes the club, so the two can
 * be joined on the name. They are not `clubs`: the table holds no entry of the editors
 * (`match_edits`), and a club of another league has no place in it. `round` is the number of
 * the round the match is listed under, so a match that was postponed keeps its round, and
 * `played_on` is the day of the match, or the first day when only a weekend is known.
 */
export const leagueResults = mysqlTable(
  'league_results',
  {
    season: varchar('season', { length: matchLimits.season }).notNull(),
    homeClub: varchar('home_club', { length: standingsClubMaxLength }).notNull(),
    awayClub: varchar('away_club', { length: standingsClubMaxLength }).notNull(),
    round: int('round', { unsigned: true }).notNull(),
    playedOn: date('played_on', { mode: 'string' }).notNull(),
    homeGoals: int('home_goals', { unsigned: true }).notNull(),
    awayGoals: int('away_goals', { unsigned: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.season, table.homeClub, table.awayClub], name: 'league_results_season_home_away' }),
  ],
)

export type LeagueResult = typeof leagueResults.$inferSelect

export type NewLeagueResult = typeof leagueResults.$inferInsert

/**
 * The pages that hold the matches and the table: what `/wedstrijden` credits. `europa-league`
 * is the page of the English Wikipedia with the Europa League matches of 2012/13. `matches` is
 * a page with the matches of 2007/08 to 2009/10 in `football box` blocks, of any competition
 * and in any language (see `language` in `wikipedia_pages`).
 */
export const matchPageKinds = ['standings', 'programme', 'cup', 'playoffs', 'europa-league', 'matches'] as const

export type MatchPageKind = (typeof matchPageKinds)[number]

export const wikipediaPageKinds = [...matchPageKinds, 'squad'] as const

export type WikipediaPageKind = (typeof wikipediaPageKinds)[number]

/**
 * The Wikipedia pages the importer read the last time it succeeded, so a page can credit its
 * source: the pages of the matches and the page of the squad. `title` is the title of the
 * page, such as `KNVB Beker 2026/27 (mannen)`. `version` is the `Last-Modified` of the page as
 * Wikipedia sent it: the raw text of a page comes without a revision number, and this is the
 * time of the revision we read. `read_at` is the last time the page was read and every check
 * passed, in UTC. `language` is the language edition of Wikipedia the page is on, as in its
 * address: `nl` for `nl.wikipedia.org`, `en` for the English one. A page has a row for each
 * kind it is read as: the page of the club's season of 2008/09 holds the squad and the league
 * matches, and each import keeps its own row of it.
 */
export const wikipediaPages = mysqlTable(
  'wikipedia_pages',
  {
    title: varchar('title', { length: 200 }).notNull(),
    season: varchar('season', { length: matchLimits.season }).notNull(),
    kind: mysqlEnum('kind', wikipediaPageKinds).notNull(),
    language: varchar('language', { length: 12 }).notNull().default('nl'),
    version: varchar('version', { length: 100 }),
    readAt: datetime('read_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.title, table.kind] })],
)

export type NewWikipediaPage = typeof wikipediaPages.$inferInsert

export type WikipediaPage = typeof wikipediaPages.$inferSelect

export const matchImportOutcomes = ['imported', 'error', 'blocked-by-robots', 'wait'] as const

export type MatchImportOutcome = (typeof matchImportOutcomes)[number]

/**
 * The health of the match import, one row per season, like the health a feed has: the
 * last time it succeeded, the last outcome, the failed runs in a row, the last error and
 * the last warning (a correction that was taken over, or a change that waits in
 * `match_changes`). `retry_at` is when the import may ask Wikipedia again: an hour after each
 * try, longer when Wikipedia asks us to wait. Times are UTC.
 */
export const matchImports = mysqlTable('match_imports', {
  season: varchar('season', { length: matchLimits.season }).primaryKey(),
  lastSuccessAt: datetime('last_success_at'),
  lastOutcome: mysqlEnum('last_outcome', matchImportOutcomes).notNull(),
  failuresInARow: int('failures_in_a_row', { unsigned: true }).notNull().default(0),
  lastError: varchar('last_error', { length: reasonMaxLength }),
  lastErrorAt: datetime('last_error_at'),
  lastWarning: varchar('last_warning', { length: reasonMaxLength }),
  lastWarningAt: datetime('last_warning_at'),
  retryAt: datetime('retry_at'),
})

export type MatchImport = typeof matchImports.$inferSelect

/**
 * The parts of a match an editor fills in, and the importer judges one by one: the kick-off,
 * the result (with the status), the goals and the facts (the spectators, the referee, the
 * stadium and the note). Wikipedia often has the result long before the goals.
 */
export const matchParts = ['kickoff', 'result', 'goals', 'facts'] as const

export type MatchPart = (typeof matchParts)[number]

export const matchChangeStatuses = ['pending', 'accepted', 'rejected'] as const

export type MatchChangeStatus = (typeof matchChangeStatuses)[number]

export const matchChangeClasses = ['improvement', 'suspicious'] as const

export type MatchChangeClass = (typeof matchChangeClasses)[number]

/**
 * How a change was decided: `applied` is an improvement of a few hours old that the import took
 * over at once, `stood` a suspicious change that stayed on the page for seven days, `person` a
 * decision with `pnpm run import:changes` or in the admin, `reverted` a change that Wikipedia
 * undid, and `replaced` one that Wikipedia changed again into something else.
 */
export const matchChangeResolutions = ['applied', 'stood', 'person', 'reverted', 'replaced'] as const

export type MatchChangeResolution = (typeof matchChangeResolutions)[number]

/**
 * A change of a match that the importer saw on Wikipedia and judged by how reliable it looks
 * (`classify-change.ts` in the importer). Nothing is kept for a change that is plainly new
 * information, such as a first result or a goal added.
 *
 * An `improvement` is a correction of a few hours old: the import takes it over at once and the
 * row is `accepted`, `applied`. It is kept to see a match that flips back and forth. A
 * `suspicious` change waits: the match and its goals in `matches` stay as they are, and the row
 * is `pending` with the value Wikipedia shows now. It becomes `accepted` after seven days of
 * the same value or when a person accepts it, and `rejected` when Wikipedia puts the old value
 * back or a person rejects it.
 *
 * `old_value` and `new_value` describe the whole match and its goals in one line each, as the
 * importer compares them; `new_value` is empty when the match is gone from the page. `proposal`
 * is the new match and its goals as JSON, so a person can accept the change without Wikipedia.
 * `season`, `competition` and `round` name the match and stay when the match is deleted,
 * `match_id` then becomes empty. `first_seen_at` and `last_seen_at` are the first and the last
 * run that saw this new value, `times_seen` the number of runs. Times are UTC.
 *
 * A change with a `part` is a difference between Wikipedia and an entry of the editors
 * (`match_edits`): the entry stays, `old_value` is the entry for that part, `new_value` what
 * Wikipedia says, and `proposal` that part as Wikipedia has it (see `match-conflicts.ts`).
 * `mailed_at` is when the beheerders were mailed about the difference, and
 * `taken_over_mailed_at` when they were mailed that the importer took Wikipedia over; both stay
 * empty until a mail went out.
 *
 * One kind of change with the part `goals` is no difference with Wikipedia: the goals of a
 * match of the old fansite that do not add up to its score (`oldSiteGoalsReason` in `reason`).
 * `old_value` is the goals the match had, `new_value` the list of the files, and `proposal` has
 * both. Nobody is mailed about it and the importer never takes it over by itself.
 *
 * Another kind is a difference between two sources about a part of a match (issue 974,
 * `sourceDifferenceReasons` in `reason`): `old_value` is the part as the match has it, from
 * the source it comes from, `new_value` what the second source says, and `proposal` that part
 * as the second source has it. The match stays as it is, nobody is mailed, and only a person
 * decides it (see `source-differences.ts`).
 */
export const matchChanges = mysqlTable(
  'match_changes',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    season: varchar('season', { length: matchLimits.season }).notNull(),
    competition: mysqlEnum('competition', competitions).notNull(),
    round: varchar('round', { length: matchLimits.round }).notNull(),
    matchId: int('match_id', { unsigned: true }).references(() => matches.id, { onDelete: 'set null' }),
    changed: varchar('changed', { length: 100 }).notNull(),
    part: mysqlEnum('part', matchParts),
    class: mysqlEnum('class', matchChangeClasses).notNull(),
    reason: varchar('reason', { length: reasonMaxLength }).notNull(),
    oldValue: text('old_value').notNull(),
    newValue: text('new_value'),
    proposal: text('proposal'),
    status: mysqlEnum('status', matchChangeStatuses).notNull(),
    resolution: mysqlEnum('resolution', matchChangeResolutions),
    firstSeenAt: datetime('first_seen_at').notNull(),
    lastSeenAt: datetime('last_seen_at').notNull(),
    timesSeen: int('times_seen', { unsigned: true }).notNull().default(1),
    decidedAt: datetime('decided_at'),
    mailedAt: datetime('mailed_at'),
    takenOverMailedAt: datetime('taken_over_mailed_at'),
  },
  (table) => [
    index('match_changes_season_status_idx').on(table.season, table.status),
    index('match_changes_match_idx').on(table.season, table.competition, table.round),
  ],
)

export type MatchChange = typeof matchChanges.$inferSelect

export type NewMatchChange = typeof matchChanges.$inferInsert

/** The longest `subject` of an alert: the kind of import and what it reads, as `feed:12`. */
export const importAlertSubjectMaxLength = 100

/**
 * Where an import that keeps failing stands with the mails about it (see `alerts.ts`), one row
 * per import: `matches:<season>`, `squad:<season>`, `feed:<id>` and `backup`. A row is there
 * while the import is failing. `failures_in_a_row` counts the failed runs, `failing_since` is
 * the first of them, and `mailed_at` is the last mail about it, empty until a mail went out.
 * A success removes the row. Times are UTC.
 */
export const importAlerts = mysqlTable('import_alerts', {
  subject: varchar('subject', { length: importAlertSubjectMaxLength }).primaryKey(),
  failingSince: datetime('failing_since').notNull(),
  failuresInARow: int('failures_in_a_row', { unsigned: true }).notNull().default(0),
  lastError: varchar('last_error', { length: reasonMaxLength }),
  mailedAt: datetime('mailed_at'),
})

export type ImportAlert = typeof importAlerts.$inferSelect

/** The longest path `page_views` keeps. A path of the site is far shorter. */
export const pageViewPathMaxLength = 100

/**
 * The page views of the site, one row per day and per page: a counter and nothing about who
 * looked. `path` is the path of the page without a query. The counters stay. `day` is a day in
 * the Netherlands (Europe/Amsterdam), as the visitors know it.
 */
export const pageViews = mysqlTable(
  'page_views',
  {
    day: date('day', { mode: 'string' }).notNull(),
    path: varchar('path', { length: pageViewPathMaxLength }).notNull(),
    views: int('views', { unsigned: true }).notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.day, table.path], name: 'page_views_day_path' })],
)

/**
 * The number of different visitors of a day, one row per day: a counter. A visitor counts
 * once a day, found by `visitor_hashes`. The counters stay.
 */
export const dailyVisitors = mysqlTable('daily_visitors', {
  day: date('day', { mode: 'string' }).primaryKey(),
  visitors: int('visitors', { unsigned: true }).notNull().default(0),
})

/**
 * The salt of a day: 32 random bytes in hex, made with the first visit of that day. A hash of a
 * visitor is only worth anything with the salt of its day. The row goes as soon as the day is
 * over, with the hashes of that day (see `removeVisitorData`).
 */
export const visitorSalts = mysqlTable('visitor_salts', {
  day: date('day', { mode: 'string' }).primaryKey(),
  salt: char('salt', { length: 64 }).notNull(),
})

/**
 * The visitors of a day, to count each of them once: the HMAC-SHA-256 (in hex) of the IP
 * address and the browser text, with the salt of that day. It holds neither the address nor the
 * text. The rows go as soon as the day is over, so nothing of a visitor survives the day.
 */
export const visitorHashes = mysqlTable(
  'visitor_hashes',
  {
    day: date('day', { mode: 'string' }).notNull(),
    hash: char('hash', { length: 64 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.day, table.hash], name: 'visitor_hashes_day_hash' })],
)

/** The most characters the name and the search term of a player hold. */
export const playerNameMaxLength = 100

/**
 * Where a row in `players` comes from, from the most complete source to the least: `selectie`
 * (a table with the whole squad), `statistieken` (a table of who played), `engels` (a squad or
 * transfers on the English Wikipedia), `transfers`, `doelpunten` and `wikidata`. `verslag` is a
 * player that the editors added in a match report because the squad of Wikipedia did not have
 * him yet (see `match_reports`). `redactie` is a player the editors added to the squad of a
 * season in the admin (issue 1020); it is the last one, so a season is never called after it
 * while another source has players. It says how complete a season is, so a page can tell when
 * a list may be missing players.
 */
export const playerSources = [
  'selectie',
  'statistieken',
  'engels',
  'transfers',
  'doelpunten',
  'wikidata',
  'verslag',
  'redactie',
] as const

export type PlayerSource = (typeof playerSources)[number]

/**
 * The squad of sc Heerenveen 1 (men), from the Dutch Wikipedia, one row per player and season.
 * The hourly importer reads the current season only: a good read updates the squad of the
 * season and never replaces it, so a player keeps his `id`, which the goals in `match_goals`
 * point to. The commands `import:squad` and `import:squads` read a season that is over once,
 * and add and improve rows but never remove one (`import-past-squad.ts`). A player who is no
 * longer in the table stays, with `in_squad` false and the moment he left in
 * `left_squad_at` (UTC), and comes back into the squad when the table has him again. The rows
 * of an earlier season are kept and never shown. Only what the pages need is kept: no
 * age, contract or photo, and as nationality only the country code of the flag (`country`).
 * The numbers of a player (appearances, goals and assists) are in `player_season_stats`,
 * not here.
 *
 * `name` is the name as the table shows it, such as `Joost van Aken`, and `position` the group
 * it is under. `position` is empty for a player from a list that gives none, such as a transfer
 * or a goal, and `source` says which kind of list the row comes from (see `playerSources`).
 * `shirt_number` is empty for a player without one. `search_term` is the name
 * without the first given name, the surname the search page looks for (`van Aken`). It is its
 * own column so one player can be corrected: the importer fills it for a new player and leaves
 * it alone for a known one. `wikipedia_page` is the page the table links to, such as `Luca
 * Oyen` or `Pim Verbeek (voetballer, 1999)`, empty when the table does not link the name. It
 * is the key that ties a goal to a player, and it is unique within a season. `country` is the
 * code of two letters (`NL`) of the flag the selection table gives the player, empty when the
 * table names none. `person_id` is the
 * person (`persons`) of that page, which is the same for the same player in every season.
 *
 * `editors_fields` lists the fields the editors set in the admin (`playerFields`, issue 1022):
 * of a player they added the name and every field they filled in, of a player they changed
 * the fields they changed. The importer never writes such a field, and keeps another value it
 * finds as a difference for the editors (`player_field_differences`). A player with the
 * source `redactie` stays in the squad when no list of Wikipedia has him.
 */
/**
 * The fields of a player the editors can set in the admin, and the importer then leaves alone
 * (issue 1022): the name, the shirt number, the line and the page on Wikipedia.
 */
export const playerFields = ['name', 'shirt_number', 'position', 'wikipedia_page'] as const

export type PlayerField = (typeof playerFields)[number]

/**
 * A `SET` of MariaDB over `playerFields`: the driver gives the names with a comma between
 * them, and an empty text for none.
 */
const playerFieldSet = customType<{ data: PlayerField[]; driverData: string }>({
  dataType: () => `set(${playerFields.map((field) => `'${field}'`).join(',')})`,
  fromDriver: (value) => playerFields.filter((field) => value.split(',').includes(field)),
  toDriver: (value) => playerFields.filter((field) => value.includes(field)).join(','),
})

export const players = mysqlTable(
  'players',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    season: varchar('season', { length: matchLimits.season }).notNull(),
    name: varchar('name', { length: playerNameMaxLength }).notNull(),
    position: mysqlEnum('position', playerPositions),
    source: mysqlEnum('source', playerSources).notNull().default('selectie'),
    shirtNumber: int('shirt_number', { unsigned: true }),
    country: char('country', { length: 2 }),
    searchTerm: varchar('search_term', { length: playerNameMaxLength }).notNull(),
    wikipediaPage: varchar('wikipedia_page', { length: wikipediaPageMaxLength }),
    personId: int('person_id', { unsigned: true }).references(() => persons.id, { onDelete: 'set null' }),
    inSquad: boolean('in_squad').notNull().default(true),
    leftSquadAt: datetime('left_squad_at'),
    editorsFields: playerFieldSet('editors_fields')
      .notNull()
      .default(sql`''`),
  },
  (table) => [
    unique('players_season_name_unique').on(table.season, table.name),
    unique('players_season_wikipedia_page_unique').on(table.season, table.wikipediaPage),
    check('players_left_squad_at_only_when_gone', sql`${table.inSquad} = 0 or ${table.leftSquadAt} is null`),
    check('players_shirt_number_range', sql`${table.shirtNumber} is null or ${table.shirtNumber} between 1 and 99`),
  ],
)

export type NewPlayer = typeof players.$inferInsert

export type Player = typeof players.$inferSelect

/**
 * The numbers of a player in a competition of a season, from the Dutch Wikipedia: the columns
 * of the squad table (see `players`), one row per player, season and competition.
 * `appearances` counts every match the player was in, also as a substitute: it is not minutes
 * and not starts. The total over the competitions is worked out by whoever shows it, so it
 * has no row.
 *
 * The importer writes the rows in the run that reads the squad. A cell that is empty gives no
 * row, and a dash is zero. A player who leaves the squad keeps his last numbers. `updated_at`
 * (UTC) is the moment the numbers last changed, and stays when a run finds the same numbers.
 * The table is kept by volunteers, so it can run a round behind the matches; the importer
 * compares the goals with those in `match_goals` and keeps a difference for the editors (see
 * `player_stat_differences`). A row goes with its player.
 *
 * `table_goals` is empty until the editors take the goals of the matches or the reports over:
 * it then keeps the goals the table of Wikipedia had, and `goals` is the number the editors
 * chose. While the table still says `table_goals` the importer leaves `goals` alone; when the
 * table says something else, `goals` follows it again and `table_goals` is emptied.
 */
export const playerSeasonStats = mysqlTable(
  'player_season_stats',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    playerId: int('player_id', { unsigned: true })
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    season: varchar('season', { length: matchLimits.season }).notNull(),
    competition: mysqlEnum('competition', statsCompetitions).notNull(),
    appearances: int('appearances', { unsigned: true }).notNull(),
    goals: int('goals', { unsigned: true }).notNull(),
    assists: int('assists', { unsigned: true }).notNull(),
    tableGoals: int('table_goals', { unsigned: true }),
    updatedAt: datetime('updated_at')
      .notNull()
      .default(sql`(UTC_TIMESTAMP())`),
  },
  (table) => [
    unique('player_season_stats_player_season_competition_unique').on(table.playerId, table.season, table.competition),
    index('player_season_stats_season_idx').on(table.season),
  ],
)

export type NewPlayerSeasonStats = typeof playerSeasonStats.$inferInsert

export type PlayerSeasonStats = typeof playerSeasonStats.$inferSelect

/** What the goals of the squad table are compared with: the matches or the match reports. */
export const playerStatSources = ['matches', 'reports'] as const

export type PlayerStatSource = (typeof playerStatSources)[number]

/** How a difference in the numbers of a player was closed (see `matchChangeResolutions`). */
export const playerStatResolutions = ['person', 'reverted', 'replaced'] as const

/**
 * A difference between the goals of a player in the squad table (`player_season_stats`) and
 * the goals counted from the matches or from the match reports, in a competition of a season
 * (issue 974). The importer and the admin keep it when they compare the numbers, once for the
 * same two numbers, and it waits (`pending`) until an editor decides or the difference is
 * gone. `table_goals` is what the squad table said and `other_goals` what `compared_with`
 * counted.
 *
 * An editor takes the other number over (`accepted`, `person`: `player_season_stats.goals`
 * becomes `other_goals`) or keeps the table (`rejected`, `person`). A difference a person
 * rejected does not come back while both numbers stay the same. A difference that is gone
 * closes itself as `rejected`, `reverted`, and one whose numbers changed as `rejected`,
 * `replaced`, with a new row for the new numbers. Times are UTC. A row goes with its player.
 */
export const playerStatDifferences = mysqlTable(
  'player_stat_differences',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    playerId: int('player_id', { unsigned: true })
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    season: varchar('season', { length: matchLimits.season }).notNull(),
    competition: mysqlEnum('competition', statsCompetitions).notNull(),
    comparedWith: mysqlEnum('compared_with', playerStatSources).notNull(),
    tableGoals: int('table_goals', { unsigned: true }).notNull(),
    otherGoals: int('other_goals', { unsigned: true }).notNull(),
    status: mysqlEnum('status', matchChangeStatuses).notNull(),
    resolution: mysqlEnum('resolution', playerStatResolutions),
    firstSeenAt: datetime('first_seen_at').notNull(),
    lastSeenAt: datetime('last_seen_at').notNull(),
    decidedAt: datetime('decided_at'),
  },
  (table) => [
    index('player_stat_differences_season_status_idx').on(table.season, table.status),
    index('player_stat_differences_player_idx').on(table.playerId),
  ],
)

export type NewPlayerStatDifference = typeof playerStatDifferences.$inferInsert

export type PlayerStatDifference = typeof playerStatDifferences.$inferSelect

/**
 * A value of the import for a field of a player that the editors set (`players.editors_fields`,
 * issue 1022): the importer keeps it here instead of writing it, once for the same two values,
 * and it waits (`pending`) until an editor decides or the difference is gone. `editors_value`
 * is what the player has, empty for a field the editors left empty, and `import_value` what
 * the import read: a name, a title, a line of `playerPositions` or a shirt number as text.
 *
 * An editor takes the value of the import over (`accepted`, `person`: the player gets it and
 * the field is no longer the editors') or keeps their own (`rejected`, `person`). A difference
 * a person rejected does not come back while both values stay the same. A difference that is
 * gone closes itself as `rejected`, `reverted`, and one whose values changed as `rejected`,
 * `replaced`, with a new row for the new values. Nothing is taken over after a number of days:
 * the value of the editors stays until an editor decides. Times are UTC. A row goes with its
 * player.
 */
export const playerFieldDifferences = mysqlTable(
  'player_field_differences',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    playerId: int('player_id', { unsigned: true })
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    season: varchar('season', { length: matchLimits.season }).notNull(),
    field: mysqlEnum('field', playerFields).notNull(),
    editorsValue: varchar('editors_value', { length: wikipediaPageMaxLength }),
    importValue: varchar('import_value', { length: wikipediaPageMaxLength }).notNull(),
    status: mysqlEnum('status', matchChangeStatuses).notNull(),
    resolution: mysqlEnum('resolution', playerStatResolutions),
    firstSeenAt: datetime('first_seen_at').notNull(),
    lastSeenAt: datetime('last_seen_at').notNull(),
    decidedAt: datetime('decided_at'),
  },
  (table) => [
    index('player_field_differences_season_status_idx').on(table.season, table.status),
    index('player_field_differences_player_idx').on(table.playerId),
  ],
)

export type NewPlayerFieldDifference = typeof playerFieldDifferences.$inferInsert

export type PlayerFieldDifference = typeof playerFieldDifferences.$inferSelect

/** Where a match report stands: `bezig` is still being filled in, `klaar` passed the rules. */
export const matchReportStatuses = ['bezig', 'klaar'] as const

export type MatchReportStatus = (typeof matchReportStatuses)[number]

/**
 * The limits of a match report: the most characters of the source, the last minute of a match
 * with extra time and the most minutes of added time. The rules of a report (`@fansite/shared`)
 * use the same numbers, and the database checks them too.
 */
export const matchReportLimits = { formation: 20, lastMinute: 120, source: 100, stoppageMinutes: 15 }

/**
 * The `source` of the report that the import of the old fansite makes (#879). The page of a
 * match reads it too: a formation of such a report that the editors did not save (`saved_by` is
 * empty) is derived from the lines of the players, and the page says so (#899).
 */
export const oldSiteReportSource = 'Oude fansite'

/**
 * The report of a played match: who played, who came on, the cards, the assists and the missed
 * penalties, which the Dutch Wikipedia does not give. We keep it ourselves, by typing over what
 * we can check. One row for each match, and it goes with the match. The rest of the report is
 * in `match_appearances`, `match_substitutions`, `match_cards`, `match_incidents` and
 * `match_shootout_kicks`, and the
 * goals are those of `match_goals`, which point to the players of the report. There is one row
 * for each fact, so a number on a page and the report cannot differ.
 *
 * `status` is `bezig` while a person is still filling it in, and `klaar` when it passed the
 * rules
 * of `@fansite/shared/match-report`. Only a report that is `klaar` counts in the numbers of a
 * player. `opponent_complete` says that the side of the opponent is complete too: eleven
 * players,
 * the bench and what happened. `source` is the name of what we typed over, such as a match
 * sheet,
 * and empty when there is none. `saved_by` and `saved_at` (UTC) are who saved the report last
 * and
 * when; `audit_log` has every save. There is no column for the minutes a player played: they
 * follow from the substitutions and the red cards (`minutesPlayed`), so they never differ from
 * the events.
 */
export const matchReports = mysqlTable(
  'match_reports',
  {
    matchId: int('match_id', { unsigned: true })
      .primaryKey()
      .references(() => matches.id, { onDelete: 'cascade' }),
    status: mysqlEnum('status', matchReportStatuses).notNull(),
    opponentComplete: boolean('opponent_complete').notNull().default(false),
    source: varchar('source', { length: matchReportLimits.source }),
    formationOurs: varchar('formation_ours', { length: matchReportLimits.formation }),
    formationOpponent: varchar('formation_opponent', { length: matchReportLimits.formation }),
    savedBy: int('saved_by', { unsigned: true }).references(() => adminUsers.id, { onDelete: 'set null' }),
    savedAt: datetime('saved_at')
      .notNull()
      .default(sql`(UTC_TIMESTAMP())`),
  },
  (table) => [
    check('match_reports_source_not_empty', sql`${table.source} is null or char_length(${table.source}) > 0`),
  ],
)

export type MatchReport = typeof matchReports.$inferSelect

export type NewMatchReport = typeof matchReports.$inferInsert

/**
 * A player in the line-up or on the bench of a match report, for both teams: one row for each.
 * `ours` is true for a player of sc Heerenveen. `player_id` is that player in `players` (of the
 * season of the match) and is empty for a player of the opponent, who has a name and nothing
 * else. The database cannot check that, since MariaDB does not allow a check on a column that a
 * deleted player sets to empty, so the rules of a report do. `name` is always filled, so a
 * deleted player stays in the report with his name.
 * `shirt_number` is one for each team in a match, or empty for a player without one (the old
 * line-ups have none): MariaDB does not count empty values as equal in the unique key, so
 * several players of a team can be without a number. `starter` is true for the line-up and
 * false for the bench, and `captain` is true for the captain. A player from the bench who did
 * not come on has this row and no other. A row goes with its report, and its events with it.
 */
export const matchAppearances = mysqlTable(
  'match_appearances',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    matchId: int('match_id', { unsigned: true })
      .notNull()
      .references(() => matchReports.matchId, { onDelete: 'cascade' }),
    ours: boolean('ours').notNull(),
    playerId: int('player_id', { unsigned: true }).references(() => players.id, { onDelete: 'set null' }),
    name: varchar('name', { length: playerNameMaxLength }).notNull(),
    shirtNumber: int('shirt_number', { unsigned: true }),
    starter: boolean('starter').notNull(),
    captain: boolean('captain').notNull().default(false),
  },
  (table) => [
    unique('match_appearances_match_side_shirt_number_unique').on(table.matchId, table.ours, table.shirtNumber),
    unique('match_appearances_match_player_unique').on(table.matchId, table.playerId),
    // The events point to a player with these three columns, so an event cannot name a player
    // of another match or of the other team.
    unique('match_appearances_id_match_side_unique').on(table.id, table.matchId, table.ours),
    index('match_appearances_player_id_idx').on(table.playerId),
    check('match_appearances_name_not_empty', sql`char_length(${table.name}) > 0`),
    check('match_appearances_shirt_number_range', sql`${table.shirtNumber} between 1 and 99`),
  ],
)

export type MatchAppearance = typeof matchAppearances.$inferSelect

export type NewMatchAppearance = typeof matchAppearances.$inferInsert

/**
 * The checks that every event of a report has on its minute: from 1 to the last minute of extra
 * time, and added time (1 to 15 minutes) only after the end of a half: 45, 90, 105 or 120.
 */
function minuteChecks(table: string, minute: AnyMySqlColumn, stoppage: AnyMySqlColumn, optional = false) {
  // An empty minute passes the first check, since a check only fails on false. For the events
  // that may have none, the second check lets added time go with a minute only.
  const needsMinute = optional ? sql` and ${minute} is not null` : sql``

  return [
    check(`${table}_minute_range`, sql`${minute} between 1 and ${sql.raw(String(matchReportLimits.lastMinute))}`),
    check(
      `${table}_stoppage_range`,
      sql`${stoppage} is null or (${stoppage} between 1 and ${sql.raw(String(matchReportLimits.stoppageMinutes))}${needsMinute} and ${minute} in (45, 90, 105, 120))`,
    ),
  ]
}

/**
 * A substitution in a match report: the player who goes off (`appearance_out_id`), the player
 * who
 * comes on (`appearance_in_id`), the minute on the clock and the minutes of added time after it
 * (`45` and `2` for "45+2"). `ours` is the team of both. A player goes off once and comes on
 * once, and both rows belong to the same match and the same team.
 */
export const matchSubstitutions = mysqlTable(
  'match_substitutions',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    matchId: int('match_id', { unsigned: true }).notNull(),
    ours: boolean('ours').notNull(),
    appearanceOutId: int('appearance_out_id', { unsigned: true }).notNull(),
    appearanceInId: int('appearance_in_id', { unsigned: true }).notNull(),
    minute: int('minute', { unsigned: true }).notNull(),
    stoppageMinutes: int('stoppage_minutes', { unsigned: true }),
  },
  (table) => [
    foreignKey({
      columns: [table.appearanceOutId, table.matchId, table.ours],
      foreignColumns: [matchAppearances.id, matchAppearances.matchId, matchAppearances.ours],
      name: 'match_substitutions_out_appearance_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.appearanceInId, table.matchId, table.ours],
      foreignColumns: [matchAppearances.id, matchAppearances.matchId, matchAppearances.ours],
      name: 'match_substitutions_in_appearance_fk',
    }).onDelete('cascade'),
    unique('match_substitutions_out_unique').on(table.appearanceOutId),
    unique('match_substitutions_in_unique').on(table.appearanceInId),
    index('match_substitutions_match_id_idx').on(table.matchId),
    check('match_substitutions_two_players', sql`${table.appearanceOutId} <> ${table.appearanceInId}`),
    ...minuteChecks('match_substitutions', table.minute, table.stoppageMinutes),
  ],
)

export type MatchSubstitution = typeof matchSubstitutions.$inferSelect

export type NewMatchSubstitution = typeof matchSubstitutions.$inferInsert

/** The kinds of card: yellow, yellow-red (the second yellow card of a player) and red. */
export const matchCardKinds = ['geel', 'geel-rood', 'rood'] as const

export type MatchCardKind = (typeof matchCardKinds)[number]

/**
 * A card for a player in a match report, with the minute on the clock and the minutes of added
 * time after it. `geel-rood` is the second yellow card of the player, which sends him off, and
 * is a card of its own next to his `geel`. A player has each kind once. The minute of a yellow
 * card may be empty (the old fansite did not know it for most), but a red or yellow-red card
 * keeps its minute, since it decides how long the player played.
 */
export const matchCards = mysqlTable(
  'match_cards',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    matchId: int('match_id', { unsigned: true }).notNull(),
    ours: boolean('ours').notNull(),
    appearanceId: int('appearance_id', { unsigned: true }).notNull(),
    kind: mysqlEnum('kind', matchCardKinds).notNull(),
    minute: int('minute', { unsigned: true }),
    stoppageMinutes: int('stoppage_minutes', { unsigned: true }),
  },
  (table) => [
    foreignKey({
      columns: [table.appearanceId, table.matchId, table.ours],
      foreignColumns: [matchAppearances.id, matchAppearances.matchId, matchAppearances.ours],
      name: 'match_cards_appearance_fk',
    }).onDelete('cascade'),
    check('match_cards_red_needs_minute', sql`${table.kind} = 'geel' or ${table.minute} is not null`),
    unique('match_cards_appearance_kind_unique').on(table.appearanceId, table.kind),
    index('match_cards_match_id_idx').on(table.matchId),
    ...minuteChecks('match_cards', table.minute, table.stoppageMinutes, true),
  ],
)

export type MatchCard = typeof matchCards.$inferSelect

export type NewMatchCard = typeof matchCards.$inferInsert

/**
 * The kinds of incident: a penalty that was missed, and a penalty that the goalkeeper
 * stopped.
 */
export const matchIncidentKinds = ['strafschop-gemist', 'strafschop-gestopt'] as const

export type MatchIncidentKind = (typeof matchIncidentKinds)[number]

/**
 * Something that happened in a match report next to the goals, the cards and the substitutions,
 * of a player and with the minute on the clock: for now a penalty that was missed or stopped,
 * with the player who took it. It is a table with a kind, so the next kind needs no table.
 */
export const matchIncidents = mysqlTable(
  'match_incidents',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    matchId: int('match_id', { unsigned: true }).notNull(),
    ours: boolean('ours').notNull(),
    appearanceId: int('appearance_id', { unsigned: true }).notNull(),
    kind: mysqlEnum('kind', matchIncidentKinds).notNull(),
    minute: int('minute', { unsigned: true }).notNull(),
    stoppageMinutes: int('stoppage_minutes', { unsigned: true }),
  },
  (table) => [
    foreignKey({
      columns: [table.appearanceId, table.matchId, table.ours],
      foreignColumns: [matchAppearances.id, matchAppearances.matchId, matchAppearances.ours],
      name: 'match_incidents_appearance_fk',
    }).onDelete('cascade'),
    index('match_incidents_match_id_idx').on(table.matchId),
    index('match_incidents_appearance_id_idx').on(table.appearanceId),
    ...minuteChecks('match_incidents', table.minute, table.stoppageMinutes),
  ],
)

export type MatchIncident = typeof matchIncidents.$inferSelect

export type NewMatchIncident = typeof matchIncidents.$inferInsert

/** What came of a kick in a shoot-out: it went in, it missed, or the goalkeeper stopped it. */
export const shootoutOutcomes = ['raak', 'naast', 'gestopt'] as const

export type ShootoutOutcome = (typeof shootoutOutcomes)[number]

/** The last round of a shoot-out the database accepts. The rules of a report do not need it. */
export const shootoutLimits = { lastRound: 50 } as const

/**
 * A kick in the penalty shoot-out of a match with a report (#844): the team (`ours`), the round
 * (`1` is the first kick of each team), the player who took it and what came of it. One kick
 * for each team in each round. The player is empty for an opponent whose side of the report is
 * not complete, as with a goal; the rules of a report check that. A kick is not a goal: it
 * counts for no goals of the match or of the player, and not for the minutes. The result of the
 * series is `penalties_for` and `penalties_against` of the match, which the rules check the
 * kicks against. The order in which the teams kicked is not kept. The kicks go with the report.
 */
export const matchShootoutKicks = mysqlTable(
  'match_shootout_kicks',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    matchId: int('match_id', { unsigned: true })
      .notNull()
      .references(() => matchReports.matchId, { onDelete: 'cascade' }),
    ours: boolean('ours').notNull(),
    round: int('round', { unsigned: true }).notNull(),
    appearanceId: int('appearance_id', { unsigned: true }),
    outcome: mysqlEnum('outcome', shootoutOutcomes).notNull(),
  },
  (table) => [
    // With the match and the team, the kick cannot name a player of another match or of the
    // other team. A kick without a player has no key to check.
    foreignKey({
      columns: [table.appearanceId, table.matchId, table.ours],
      foreignColumns: [matchAppearances.id, matchAppearances.matchId, matchAppearances.ours],
      name: 'match_shootout_kicks_appearance_fk',
    }).onDelete('cascade'),
    unique('match_shootout_kicks_match_side_round_unique').on(table.matchId, table.ours, table.round),
    index('match_shootout_kicks_appearance_id_idx').on(table.appearanceId),
    check(
      'match_shootout_kicks_round_range',
      sql`${table.round} between 1 and ${sql.raw(String(shootoutLimits.lastRound))}`,
    ),
  ],
)

export type MatchShootoutKick = typeof matchShootoutKicks.$inferSelect

export type NewMatchShootoutKick = typeof matchShootoutKicks.$inferInsert

/**
 * The health of the squad import, one row per season, in the same words as `match_imports`:
 * the last time it succeeded, the last outcome, the failed runs in a row, the last error and
 * the last warning, and `retry_at`, when the import may ask Wikipedia again. Times are UTC.
 */
export const squadImports = mysqlTable('squad_imports', {
  season: varchar('season', { length: matchLimits.season }).primaryKey(),
  lastSuccessAt: datetime('last_success_at'),
  lastOutcome: mysqlEnum('last_outcome', matchImportOutcomes).notNull(),
  failuresInARow: int('failures_in_a_row', { unsigned: true }).notNull().default(0),
  lastError: varchar('last_error', { length: reasonMaxLength }),
  lastErrorAt: datetime('last_error_at'),
  lastWarning: varchar('last_warning', { length: reasonMaxLength }),
  lastWarningAt: datetime('last_warning_at'),
  retryAt: datetime('retry_at'),
})

export type SquadImport = typeof squadImports.$inferSelect

/** The levels of the chance that the list of players of a season is the whole squad (#745). */
export const squadCompletenessLevels = ['onbekend', 'weinig', 'deels', 'bijna', 'compleet'] as const

export type SquadCompletenessLevel = (typeof squadCompletenessLevels)[number]

/** One check of the chance, as it is stored: what it was, how it came out and why. */
export type StoredCompletenessCheck = {
  detail: string
  name: 'goals' | 'matches' | 'scorers' | 'size'
  outcome: 'failed' | 'passed' | 'unavailable'
}

/**
 * The chance that the list of players of a season holds the whole squad, worked out by the
 * importer (#746). A season without players has no row; the site reads that as `onbekend`.
 * `matches_total` and `goals_total` are the sums the table of the season gave, which are only
 * known while the page is read: they stay empty when the page had none.
 */
export const squadCompleteness = mysqlTable(
  'squad_completeness',
  {
    season: varchar('season', { length: matchLimits.season }).primaryKey(),
    probability: smallint('probability', { unsigned: true }).notNull(),
    level: mysqlEnum('level', squadCompletenessLevels).notNull(),
    playerCount: int('player_count', { unsigned: true }).notNull(),
    bestSource: mysqlEnum('best_source', playerSources).notNull(),
    matchesTotal: int('matches_total', { unsigned: true }),
    goalsTotal: int('goals_total', { unsigned: true }),
    checks: json('checks').$type<StoredCompletenessCheck[]>().notNull(),
    calculatedAt: datetime('calculated_at').notNull(),
  },
  (table) => [check('squad_completeness_probability_range', sql`${table.probability} between 0 and 100`)],
)

export type SquadCompletenessRow = typeof squadCompleteness.$inferSelect

/**
 * What a person of the staff does. The list grows with the roles we keep, such as
 * `assistant-coach`.
 */
export const staffRoles = ['coach'] as const

export type StaffRole = (typeof staffRoles)[number]

/**
 * How exactly a date of the staff is known: the `day`, only the `month` or only the `year`. A
 * date known to the month or the year is stored as the first day of that month or year, and the
 * precision says the real day is somewhere in it.
 */
export const datePrecisions = ['day', 'month', 'year'] as const

export type DatePrecision = (typeof datePrecisions)[number]

/** The most characters a column of `staff` holds. */
export const staffLimits = { name: 100, note: 500, wikipediaPage: wikipediaPageMaxLength }

/**
 * The staff of sc Heerenveen 1 (men), one row per period of a person in a role, from the Dutch
 * Wikipedia. A person with two periods, such as Foppe de Haan, has two rows. `role` is `coach`
 * for a head coach, and the only role for now. `wikipedia_page` is the title of the person's
 * page, empty when there is none. `end_date` is the last day of the period, empty for a person
 * who is still in service, and then so is `end_precision`. A date the source gives to the month
 * or the year only is not made exact: see `DatePrecision`. `interim` is true for a person who
 * stood in. `note` is a short remark in our own words, such as what the source leaves open.
 * The rows come from the seed (`seedStaff`).
 */
export const staff = mysqlTable(
  'staff',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    role: mysqlEnum('role', staffRoles).notNull(),
    name: varchar('name', { length: staffLimits.name }).notNull(),
    wikipediaPage: varchar('wikipedia_page', { length: staffLimits.wikipediaPage }),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    startPrecision: mysqlEnum('start_precision', datePrecisions).notNull(),
    endDate: date('end_date', { mode: 'string' }),
    endPrecision: mysqlEnum('end_precision', datePrecisions),
    interim: boolean('interim').notNull().default(false),
    note: varchar('note', { length: staffLimits.note }),
  },
  (table) => [
    unique('staff_role_name_start_date_unique').on(table.role, table.name, table.startDate),
    index('staff_role_start_date_idx').on(table.role, table.startDate),
    check('staff_end_not_before_start', sql`${table.endDate} is null or ${table.endDate} >= ${table.startDate}`),
    check('staff_end_precision_with_end_date', sql`(${table.endDate} is null) = (${table.endPrecision} is null)`),
    check(
      'staff_start_date_fits_precision',
      sql`(${table.startPrecision} = 'day') or (${table.startPrecision} = 'month' and dayofmonth(${table.startDate}) = 1) or (${table.startPrecision} = 'year' and dayofyear(${table.startDate}) = 1)`,
    ),
    check(
      'staff_end_date_fits_precision',
      sql`${table.endDate} is null or (${table.endPrecision} = 'day') or (${table.endPrecision} = 'month' and dayofmonth(${table.endDate}) = 1) or (${table.endPrecision} = 'year' and dayofyear(${table.endDate}) = 1)`,
    ),
  ],
)

export type NewStaff = typeof staff.$inferInsert

export type StaffMember = typeof staff.$inferSelect
