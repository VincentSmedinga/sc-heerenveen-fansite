import type { Database } from '@fansite/db/client'

import { hiddenReasonMaxLength, items, sources } from '@fansite/db/schema'
import { and, desc, eq, isNotNull, isNull, or, sql } from 'drizzle-orm'

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

/**
 * The newest `listLength` items, from every source, hidden or not, newest first. With a search,
 * only the items whose headline or link contains the text, in any case. The text is a plain
 * text and no pattern: `%` and `_` stand for themselves.
 */
export function listItems(db: Pick<Database, 'select'>, search: string) {
  const pattern = `%${search.replaceAll(/[%_|]/gu, '|$&')}%`

  return db
    .select({
      hiddenAt: items.hiddenAt,
      hiddenReason: items.hiddenReason,
      id: items.id,
      paywalled: items.paywalled,
      publishedAt: items.publishedAt,
      sourceName: sources.name,
      title: items.title,
      url: items.url,
    })
    .from(items)
    .innerJoin(sources, eq(items.sourceId, sources.id))
    .where(
      search === ''
        ? undefined
        : or(sql`${items.title} like ${pattern} escape '|'`, sql`${items.url} like ${pattern} escape '|'`),
    )
    .orderBy(desc(items.publishedAt), desc(items.id))
    .limit(listLength)
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
