import { sql } from 'drizzle-orm'
import { boolean, check, date, datetime, int, mysqlEnum, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core'

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
