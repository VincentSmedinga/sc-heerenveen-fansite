import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  customType,
  date,
  datetime,
  int,
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

/**
 * The feeds we read. A source can have more than one. The `ETag` and `Last-Modified` are from the last time the
 * importer read the feed and stored its items, so the source can answer that nothing changed.
 */
export const feeds = mysqlTable('feeds', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  sourceId: int('source_id', { unsigned: true })
    .notNull()
    .references(() => sources.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 500 }).notNull().unique(),
  etag: text('etag'),
  lastModified: text('last_modified'),
})

export type Feed = typeof feeds.$inferSelect

export type NewFeed = typeof feeds.$inferInsert

/**
 * What the importer stores of a news item: the headline, the link, the time of publication and whether it is behind a
 * paywall, which is no content of the source. An intro, an image, an author or a category has no column, because no
 * source has given permission for it yet (editorial principle 2): what we may not show, we do not store.
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
