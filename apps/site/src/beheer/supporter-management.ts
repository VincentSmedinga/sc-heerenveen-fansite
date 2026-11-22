import type { Database } from '@fansite/db/client'

import { recountRatingsOf } from '@fansite/db/rating-window'
import { supporterBlockedAddresses, supporters } from '@fansite/db/schema'
import { and, count, desc, eq, like, ne, sql } from 'drizzle-orm'

import { blockedAddressHash, removeOldBlocks } from '../fans/blocked-addresses'
import { checkScreenName, screenNameKey, type ScreenNameProblem } from '../fans/screen-name'
import { isDuplicate } from '../fans/sign-up'
import { normaliseEmail } from './accounts'
import { recordAction } from './audit-log'
import {
  type BlockFormState,
  type BlockReason,
  blockReasons,
  blockReasonTexts,
  noteMaxLength,
} from './supporter-fields'

// What the editors do with the accounts of supporters (issue 1458): look one up by its screen
// name, change a name that can't stand, block an account and lift the block. Every change
// writes a line in the log of the admin in the same transaction, with who did it and the number
// of the account, and never a name or an address. The address of a supporter is for the owner
// alone, and only on the page of one account: no function here gives it to a list.

/** How many accounts a page of the list holds. */
export const supportersPerPage = 25

/** Whether an account is blocked now, was already, or is gone. */
export type BlockResult = 'already' | 'blocked' | 'missing'

/** What changing a name leads to: done, nothing to change, a problem with the field or none. */
export type RenameResult =
  | { answer: 'changed' | 'missing' | 'unchanged' }
  | { answer: 'invalid'; error: ScreenNameProblem | { problem: 'taken' } }

/** One account for its page. `email` is only there when the caller asked for it (the owner). */
export type SupporterDetail = SupporterRow & { blockedAt: Date | null; blockedReason: null | string; email?: string }

/** A page of the list: the rows, how many accounts match and how many pages there are. */
export type SupporterPage = { page: number; pages: number; rows: SupporterRow[]; total: number }

/** A line of the list. It has no address. */
export type SupporterRow = {
  blocked: boolean
  createdAt: Date
  id: number
  lastVisitOn: null | string
  screenName: string
}

/**
 * Blocks an account with a reason that `checkBlock` gave. The account keeps its sessions: it
 * can log in to see that it is blocked. The log gets `supporter.block` with the number of the
 * account and the reason.
 */
export async function blockSupporter(
  db: Database,
  userId: number,
  supporterId: number,
  reason: string,
  now = new Date(),
): Promise<BlockResult> {
  const result = await db.transaction(async (tx) => {
    const [account] = await tx
      .select({ disabledAt: supporters.disabledAt })
      .from(supporters)
      .where(eq(supporters.id, supporterId))
      .for('update')

    if (account === undefined) {
      return 'missing'
    }

    if (account.disabledAt !== null) {
      return 'already'
    }

    await tx.update(supporters).set({ disabledAt: now, disabledReason: reason }).where(eq(supporters.id, supporterId))
    await recordAction(tx, { action: 'supporter.block', itemId: supporterId, reason, userId }, now)
    return 'blocked'
  })

  // The grades of the account stop counting in the averages that were already worked out.
  if (result === 'blocked') {
    await recountRatingsOf(db, supporterId, now)
  }

  return result
}

/** What the form to block must have, checked: the reason as it is stored, or the errors. */
export function checkBlock(
  values: BlockFormState['values'],
): { errors: BlockFormState['errors'] } | { reason: string } {
  const choice = blockReasons.find((reason) => reason.value === values.reden)

  if (choice === undefined) {
    return { errors: { reden: 'Kies een reden.' } }
  }

  if (choice.value !== 'anders') {
    return { reason: blockReasonTexts[choice.value] }
  }

  const note = values.toelichting.trim()

  if (note === '') {
    return { errors: { toelichting: 'Schrijf een toelichting bij de reden "Anders".' } }
  }

  if ([...note].length > noteMaxLength) {
    return { errors: { toelichting: `Maak de toelichting korter: hoogstens ${noteMaxLength} tekens.` } }
  }

  return { reason: `anders: ${note}` }
}

/**
 * One account, or `undefined`. The address is only read, and only given, when `withEmail` is
 * true, so the page of an editor never holds it.
 */
export async function findSupporter(
  db: Database,
  id: number,
  withEmail: boolean,
): Promise<SupporterDetail | undefined> {
  const [row] = await db
    .select({
      createdAt: supporters.createdAt,
      disabledAt: supporters.disabledAt,
      disabledReason: supporters.disabledReason,
      email: withEmail ? supporters.email : sql<string>`''`,
      id: supporters.id,
      lastVisitOn: supporters.lastVisitOn,
      screenName: supporters.screenName,
    })
    .from(supporters)
    .where(eq(supporters.id, id))

  if (row === undefined) {
    return undefined
  }

  return {
    blocked: row.disabledAt !== null,
    blockedAt: row.disabledAt,
    blockedReason: row.disabledReason,
    createdAt: row.createdAt,
    ...(withEmail ? { email: row.email } : {}),
    id: row.id,
    lastVisitOn: row.lastVisitOn,
    screenName: row.screenName,
  }
}

/**
 * Removes the hash of an address that was blocked, before the 12 months are over: the owner
 * types the address, the hash is looked up and removed. The log gets `supporter.forget-address`
 * with the number of the row of the hash, never the address. `invalid` is an address that isn't
 * one, `none` an address that isn't blocked.
 */
export async function forgetBlockedAddress(
  db: Database,
  userId: number,
  value: string,
  now = new Date(),
): Promise<'invalid' | 'none' | 'removed'> {
  const email = normaliseEmail(value)

  if (email === undefined) {
    return 'invalid'
  }

  await removeOldBlocks(db, now)

  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: supporterBlockedAddresses.id })
      .from(supporterBlockedAddresses)
      .where(eq(supporterBlockedAddresses.addressHash, blockedAddressHash(email)))
      .for('update')

    if (row === undefined) {
      return 'none'
    }

    await tx.delete(supporterBlockedAddresses).where(eq(supporterBlockedAddresses.id, row.id))
    await recordAction(tx, { action: 'supporter.forget-address', itemId: row.id, userId }, now)

    return 'removed'
  })
}

/**
 * The accounts, the newest first, a page at a time. `query` is a part of a screen name, found
 * without regard to capitals, accents, spaces and look-alike characters, with the same
 * normalisation that keeps two names apart at signing up. A query without a letter or a digit
 * gives the whole list.
 */
export async function listSupporters(db: Database, query: string, page: number): Promise<SupporterPage> {
  const key = screenNameKey(query.normalize('NFC').trim())
  const where = key === '' ? undefined : like(supporters.screenNameKey, containing(key))
  const [counted] = await db.select({ total: count() }).from(supporters).where(where)
  const total = counted?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / supportersPerPage))
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), pages)
  const rows = await db
    .select({
      blocked: sql<boolean>`${supporters.disabledAt} IS NOT NULL`,
      createdAt: supporters.createdAt,
      id: supporters.id,
      lastVisitOn: supporters.lastVisitOn,
      screenName: supporters.screenName,
    })
    .from(supporters)
    .where(where)
    .orderBy(desc(supporters.createdAt), desc(supporters.id))
    .limit(supportersPerPage)
    .offset((current - 1) * supportersPerPage)

  return { page: current, pages, rows: rows.map((row) => ({ ...row, blocked: Boolean(row.blocked) })), total }
}

/**
 * Changes the screen name of an account, with the rules of signing up and the same check that
 * the name is unique. It doesn't count as the supporter's own change per 30 days, and it asks
 * Mijn account to tell the supporter once. The account may be blocked: a blocked account with
 * a name that can't stand is the reason for this. The log gets `supporter.rename` with the
 * number of the account; the old and the new name are not in it.
 */
export async function renameSupporter(
  db: Database,
  userId: number,
  supporterId: number,
  value: string,
  now = new Date(),
): Promise<RenameResult> {
  const name = checkScreenName(value)

  if (name.problem) {
    return { answer: 'invalid', error: name }
  }

  try {
    return await db.transaction(async (tx) => {
      const [account] = await tx
        .select({ screenName: supporters.screenName })
        .from(supporters)
        .where(eq(supporters.id, supporterId))
        .for('update')

      if (account === undefined) {
        return { answer: 'missing' } as const
      }

      if (account.screenName === name.name) {
        return { answer: 'unchanged' } as const
      }

      const [other] = await tx
        .select({ id: supporters.id })
        .from(supporters)
        .where(and(eq(supporters.screenNameKey, name.key), ne(supporters.id, supporterId)))

      if (other !== undefined) {
        return { answer: 'invalid', error: { problem: 'taken' } } as const
      }

      await tx
        .update(supporters)
        .set({ screenName: name.name, screenNameEditedByEditors: true, screenNameKey: name.key })
        .where(eq(supporters.id, supporterId))
      await recordAction(tx, { action: 'supporter.rename', itemId: supporterId, userId }, now)

      return { answer: 'changed' } as const
    })
  } catch (error) {
    if (isDuplicate(error)) {
      return { answer: 'invalid', error: { problem: 'taken' } }
    }

    throw error
  }
}

/** Lifts the block of an account. The log gets `supporter.unblock` with the number. */
export async function unblockSupporter(
  db: Database,
  userId: number,
  supporterId: number,
  now = new Date(),
): Promise<'missing' | 'not-blocked' | 'unblocked'> {
  const result = await db.transaction(async (tx) => {
    const [account] = await tx
      .select({ disabledAt: supporters.disabledAt })
      .from(supporters)
      .where(eq(supporters.id, supporterId))
      .for('update')

    if (account === undefined) {
      return 'missing'
    }

    if (account.disabledAt === null) {
      return 'not-blocked'
    }

    await tx.update(supporters).set({ disabledAt: null, disabledReason: null }).where(eq(supporters.id, supporterId))
    await recordAction(tx, { action: 'supporter.unblock', itemId: supporterId, userId }, now)
    return 'unblocked'
  })

  // The grades count again.
  if (result === 'unblocked') {
    await recountRatingsOf(db, supporterId, now)
  }

  return result
}

/** The `LIKE` pattern for a part of a key: the characters that mean something are escaped. */
function containing(key: string) {
  return `%${key.replaceAll(/[\\%_]/g, (character) => `\\${character}`)}%`
}

export type { BlockReason }
