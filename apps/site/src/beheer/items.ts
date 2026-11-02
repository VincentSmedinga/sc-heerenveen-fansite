import type { Database } from '@fansite/db/client'

import { adminUsers, hiddenReasonMaxLength, items, sources } from '@fansite/db/schema'
import { and, desc, eq, isNotNull, isNull, lte, not, or, sql } from 'drizzle-orm'

import { recordAction } from './audit-log'

// Hiding and showing items in the admin: the list a moderator searches, and the two changes. A
// change and its row in the log of the admin are one transaction.

/** How many items the list shows. */
export const listLength = 50

/** The most characters of a search. A longer one is cut off. */
export const searchMaxLength = 100

/** What the list shows of an item. */
export type AdminItem = Awaited<ReturnType<typeof listItems>>[number]

/**
 * The two groups of the list: the items that are on the site and the items that are not. The
 * address says `?toon=niet-op-de-site` for the second.
 */
export type ItemGroup = 'not-on-site' | 'on-site'

/**
 * What a hide or a show did: the item was changed, it already was as asked, or there is no such
 * item.
 */
export type Outcome = 'done' | 'missing' | 'unchanged'

/** One item as the list shows it, or `undefined` when there is none. */
export async function findItem(db: Pick<Database, 'select'>, id: number) {
  const [row] = await db.select({ hiddenAt: items.hiddenAt, title: items.title }).from(items).where(eq(items.id, id))

  return row
}

/**
 * Hides an item, and writes `item.hide` with the reason in the log. An item that is hidden
 * already is left as it is, with its first reason, and writes nothing: two moderators who hide
 * the same item don't make two rows.
 */
export async function hideItem(
  db: Database,
  userId: number,
  id: number,
  reason: string,
  now = new Date(),
): Promise<Outcome> {
  return db.transaction(async (transaction) => {
    const [result] = await transaction
      .update(items)
      .set({ hiddenAt: now, hiddenBy: userId, hiddenReason: reason })
      .where(and(eq(items.id, id), isNull(items.hiddenAt)))

    if (result.affectedRows === 1) {
      await recordAction(transaction, { action: 'item.hide', itemId: id, reason, userId }, now)

      return 'done'
    }

    return (await findItem(transaction, id)) === undefined ? 'missing' : 'unchanged'
  })
}

/** The value of `toon` in the address for the group of items that are not on the site. */
export const notOnSiteValue = 'niet-op-de-site'

/** Which items the list shows: the group, and under `not-on-site` only what editors hid. */
export type ItemFilter = {
  /** Only the items an editor hid. It has an effect under `not-on-site` only. */
  editorsOnly?: boolean
  group?: ItemGroup
  /** When it is: an item is not on the site before its publication time. */
  now?: Date
}

/**
 * The condition that makes an item "on the site" for the list: no moderator hid it, the
 * importer found it `relevant` and it is published already. Every other item is not on the
 * site: the hidden ones, the `doubtful` and `irrelevant` ones the importer leaves off, and the
 * ones with a time to come. The pages of visitors add more (see `isShown` in
 * `@fansite/db/queries`): a source that is switched off, a story that a live blog puts in the
 * feed again and a story that two sources of one publisher both have are shown once. The list
 * doesn't follow that, so such an item can be here on the site while the pages of visitors
 * show a newer one of its story instead.
 */
export function isOnSite(now: Date) {
  return sql`(${isNull(items.hiddenAt)} and ${eq(items.relevance, 'relevant')} and ${lte(items.publishedAt, now)})`
}

/**
 * The newest `listLength` items of a group, from every source, newest first. Under `on-site`
 * (the default) these are the items of `isOnSite`. Under `not-on-site` they are all the others,
 * of which `editorsOnly` keeps the ones a moderator hid (the importer keeps `doubtful` and
 * `irrelevant` items too, and an item can have a time to come). Each has the email address of
 * the account that hid it, if it is hidden and the account still exists. With a search,
 * only the items whose headline or link contains the text, in any case. The text is a plain
 * text and no pattern: `%` and `_` stand for themselves.
 */
export function listItems(
  db: Pick<Database, 'select'>,
  search: string,
  { editorsOnly = false, group = 'on-site', now = new Date() }: ItemFilter = {},
) {
  const pattern = `%${search.replaceAll(/[%_|]/gu, '|$&')}%`

  return db
    .select({
      hiddenAt: items.hiddenAt,
      hiddenByEmail: adminUsers.email,
      hiddenReason: items.hiddenReason,
      id: items.id,
      paywalled: items.paywalled,
      publishedAt: items.publishedAt,
      relevance: items.relevance,
      sourceName: sources.name,
      title: items.title,
      url: items.url,
    })
    .from(items)
    .innerJoin(sources, eq(items.sourceId, sources.id))
    .leftJoin(adminUsers, eq(items.hiddenBy, adminUsers.id))
    .where(
      and(
        group === 'on-site' ? isOnSite(now) : not(isOnSite(now)),
        group === 'not-on-site' && editorsOnly ? isNotNull(items.hiddenAt) : undefined,
        search === ''
          ? undefined
          : or(sql`${items.title} like ${pattern} escape '|'`, sql`${items.url} like ${pattern} escape '|'`),
      ),
    )
    .orderBy(desc(items.publishedAt), desc(items.id))
    .limit(listLength)
}

/**
 * Whether the list keeps to what editors hid: `redactie=1` under `not-on-site`. Under `on-site`
 * nothing is hidden, so the box is not there and the value is ignored.
 */
export function parseEditorsOnly(value: string | string[] | undefined, group: ItemGroup) {
  return group === 'not-on-site' && value === '1'
}

/**
 * The group from the address: `niet-op-de-site` for `not-on-site`, and anything else, such as
 * no value, an unknown one or more than one, for `on-site`.
 */
export function parseGroup(value: string | string[] | undefined): ItemGroup {
  return value === notOnSiteValue ? 'not-on-site' : 'on-site'
}

/**
 * The number of an item from the form or the address: a whole number from 1, in the range of
 * the column, as a number or as digits only. Anything else, such as `0`, `-1`, `1.5`, `1e3`,
 * `abc` or a number that is too large, is `undefined`.
 */
export function parseItemId(value: unknown) {
  const id = typeof value === 'string' && /^[1-9]\d{0,9}$/u.test(value) ? Number(value) : value

  return typeof id === 'number' && Number.isSafeInteger(id) && id >= 1 && id <= 4_294_967_295 ? id : undefined
}

/**
 * The reason from the form, as one line: control characters and runs of spaces become one
 * space, and the ends are trimmed. It is empty for no reason (`error: 'leeg'`) and too long
 * above `hiddenReasonMaxLength` characters (`error: 'lang'`), counted as the column does, in
 * characters and not in UTF-16 units.
 */
export function parseReason(value: unknown): { error: 'lang' | 'leeg' } | { reason: string } {
  const reason = typeof value === 'string' ? value.replaceAll(/[\p{Cc}\s]+/gu, ' ').trim() : ''

  if (reason === '') {
    return { error: 'leeg' }
  }

  return [...reason].length > hiddenReasonMaxLength ? { error: 'lang' } : { reason }
}

/**
 * The search from the address: the text of a single `q`, cleaned like a reason and cut off at
 * `searchMaxLength`.
 */
export function parseSearch(value: string | string[] | undefined) {
  if (typeof value !== 'string') {
    return ''
  }

  return [...value.replaceAll(/[\p{Cc}\s]+/gu, ' ').trim()].slice(0, searchMaxLength).join('').trim()
}

/**
 * Shows a hidden item again, and writes `item.show` in the log. The reason it was hidden stays
 * in the log.
 */
export async function showItem(db: Database, userId: number, id: number, now = new Date()): Promise<Outcome> {
  return db.transaction(async (transaction) => {
    const [result] = await transaction
      .update(items)
      .set({ hiddenAt: null, hiddenBy: null, hiddenReason: null })
      .where(and(eq(items.id, id), isNotNull(items.hiddenAt)))

    if (result.affectedRows === 1) {
      await recordAction(transaction, { action: 'item.show', itemId: id, userId }, now)

      return 'done'
    }

    return (await findItem(transaction, id)) === undefined ? 'missing' : 'unchanged'
  })
}
