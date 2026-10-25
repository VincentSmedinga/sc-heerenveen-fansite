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
  primaryKey,
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

export const auditActions = [
  'item.hide',
  'item.show',
  'article.create',
  'article.update',
  'article.publish',
  'article.unpublish',
] as const

export type AuditAction = (typeof auditActions)[number]

/**
 * What the admin did, one row per action, written by the one function `recordAction` in the
 * site and never changed or removed: no code updates or deletes a row, and a test keeps it so.
 * It keeps who (the id of the account, not the address), when (UTC), what, which item or
 * article and the reason. `item_id` is the number of an item for an `item.` action and of an
 * article for an `article.` action: the action says which. It has no foreign key, so the row
 * stays when an item is deleted. `reason` is empty for an action that has none, such as
 * showing an item again. It holds nothing else of the request.
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

/** The most characters a column of `articles` holds. The admin checks them before it stores. */
export const articleLimits = { author: 100, intro: 300, slug: 80, title: 120 }

/**
 * The articles of our own editors. A visitor sees an article on `/redactie/<slug>` and the
 * newest one as a card on the homepage, once `published_at` is set and has passed. Empty
 * `published_at` is a draft: it is on no page, and withdrawing an article empties it again.
 * Nothing is deleted.
 *
 * `body` is the text in the format of `apps/site/src/article-text.ts`: paragraphs, `## `
 * headings, `- ` lists, bold, italic and links. A `mediumtext` holds 16 MB, far more than an
 * article needs; the admin sets the real limit. `author` is the name next to the article, such
 * as "de redactie". `created_by` is the account that put the article in, as a number, never an
 * address. Accounts are turned off and never deleted, so the foreign key keeps the author of
 * every article known.
 *
 * `slug` has lowercase letters, digits and single hyphens (the check ignores the collation,
 * which would let capitals through) and is unique, so an address never goes to two articles.
 * Times are UTC; whoever updates an article sets `updated_at` as well.
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
  },
  (table) => [
    check('articles_slug_format', sql`${table.slug} regexp '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$'`),
    index('articles_published_at_idx').on(table.publishedAt),
  ],
)

export type Article = typeof articles.$inferSelect

export type NewArticle = typeof articles.$inferInsert

export const competitions = ['Eredivisie', 'KNVB Beker'] as const

export type Competition = (typeof competitions)[number]

/**
 * Where a match stands: `scheduled` is still to be played (with or without a time), `played`
 * has a result, `postponed` was called off and has no new date yet.
 */
export const matchStatuses = ['scheduled', 'played', 'postponed'] as const

export type MatchStatus = (typeof matchStatuses)[number]

/**
 * The most characters a column of `matches` holds. The importer checks them before it
 * stores.
 */
export const matchLimits = { dateText: 60, opponent: 100, round: 60, season: 7, stadium: 150 }

/**
 * The matches of sc Heerenveen 1 (men), from the Dutch Wikipedia: the Eredivisie and the KNVB
 * Beker. A season starts on 1 July and is written `2026/27`. The importer reads the current
 * season only and never changes or removes the rows of an earlier one.
 *
 * `round` is the label as Wikipedia has it, such as `Speelronde 12` or `Eerste ronde`; it is
 * unique per season and competition, because sc Heerenveen plays one match in each. `home` is
 * true for a match at the Abe Lenstra Stadion. `goals_for` and `goals_against` are the goals
 * of sc Heerenveen and of the opponent, and both are empty unless the match is `played`.
 *
 * `match_date` is the local day (Europe/Amsterdam), or the first day when Wikipedia only knows
 * a weekend. `kickoff_at` is the kick-off in UTC and is empty while the time is unknown: the
 * KNVB announces the times of rounds 22 to 32 on 22 December 2026. `date_text` then holds the
 * date as Wikipedia gives it, such as `12-14 februari 2027`, and is empty when the kick-off is
 * known.
 *
 * `result_set_at` is the moment the importer first saw the current result, so it can tell that
 * a result which stood for days has changed.
 */
export const matches = mysqlTable(
  'matches',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    season: varchar('season', { length: matchLimits.season }).notNull(),
    competition: mysqlEnum('competition', competitions).notNull(),
    round: varchar('round', { length: matchLimits.round }).notNull(),
    opponent: varchar('opponent', { length: matchLimits.opponent }).notNull(),
    home: boolean('home').notNull(),
    stadium: varchar('stadium', { length: matchLimits.stadium }),
    status: mysqlEnum('status', matchStatuses).notNull(),
    goalsFor: int('goals_for', { unsigned: true }),
    goalsAgainst: int('goals_against', { unsigned: true }),
    matchDate: date('match_date', { mode: 'string' }).notNull(),
    kickoffAt: datetime('kickoff_at'),
    dateText: varchar('date_text', { length: matchLimits.dateText }),
    resultSetAt: datetime('result_set_at'),
  },
  (table) => [
    unique('matches_season_competition_round_unique').on(table.season, table.competition, table.round),
    index('matches_season_match_date_idx').on(table.season, table.matchDate),
    check(
      'matches_result_only_when_played',
      sql`(${table.status} = 'played' and ${table.goalsFor} is not null and ${table.goalsAgainst} is not null) or (${table.status} <> 'played' and ${table.goalsFor} is null and ${table.goalsAgainst} is null)`,
    ),
    check('matches_time_or_text', sql`${table.kickoffAt} is not null or ${table.dateText} is not null`),
  ],
)

export type Match = typeof matches.$inferSelect

export type NewMatch = typeof matches.$inferInsert

/** The most characters the club column of `standings` holds. */
export const standingsClubMaxLength = 100

/**
 * The league table of the Eredivisie, one row per club, from the Dutch Wikipedia. `valid_on` is
 * the day the table holds for: the day of the last match that has been played. Every row of a
 * season has the same day, because the importer replaces the whole table at once. A table of
 * an earlier season stays as it was.
 *
 * `played`, `points` and `goal_difference` are worked out from the rest when the importer reads
 * the table (Wikipedia gives wins, draws, losses and goals); `goal_difference` can be negative.
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
    validOn: date('valid_on', { mode: 'string' }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.season, table.position], name: 'standings_season_position' }),
    unique('standings_season_club_unique').on(table.season, table.club),
  ],
)

export type NewStandingsRow = typeof standings.$inferInsert

export type StandingsRow = typeof standings.$inferSelect

export const wikipediaPageKinds = ['standings', 'programme', 'cup'] as const

export type WikipediaPageKind = (typeof wikipediaPageKinds)[number]

/**
 * The Wikipedia pages the match import read the last time it succeeded, so a page can
 * credit its source. `title` is the title of the page, such as `KNVB Beker 2026/27
 * (mannen)`. `version` is the `Last-Modified` of the page as Wikipedia sent it: the raw
 * text of a page comes without a revision number, and this is the time of the revision
 * we read. `read_at` is the last time the page was read and every check passed, in UTC.
 */
export const wikipediaPages = mysqlTable('wikipedia_pages', {
  title: varchar('title', { length: 200 }).primaryKey(),
  season: varchar('season', { length: matchLimits.season }).notNull(),
  kind: mysqlEnum('kind', wikipediaPageKinds).notNull(),
  version: varchar('version', { length: 100 }),
  readAt: datetime('read_at').notNull(),
})

export type WikipediaPage = typeof wikipediaPages.$inferSelect

export const matchImportOutcomes = ['imported', 'error', 'blocked-by-robots', 'wait'] as const

export type MatchImportOutcome = (typeof matchImportOutcomes)[number]

/**
 * The health of the match import, one row per season, like the health a feed has: the
 * last time it succeeded, the last outcome, the failed runs in a row, the last error and
 * the last warning (a result that changed after it had stood for days). `retry_at` is
 * when the import may ask Wikipedia again: an hour after each try, longer when Wikipedia
 * asks us to wait. Times are UTC.
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
