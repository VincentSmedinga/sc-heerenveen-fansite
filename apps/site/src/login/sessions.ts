import type { Database } from '@fansite/db/client'

import { and, eq, gt, isNull, lt, lte, or, sql } from 'drizzle-orm'

import type { AccountKind } from './account-kind'

import { codeHashOf, hashOf, newToken } from './tokens'

// The sessions and the login links of an account, on the server. The cookie holds a random
// token and nothing else, and the database keeps the SHA-256 of the token, so a copy of the
// database logs nobody in. What differs per kind of account is in `AccountKind`.

/**
 * Ends a session on the server: the token stops working at once, whatever the browser still
 * holds.
 */
export async function endSession(db: Database, kind: AccountKind, token: string) {
  await db.delete(kind.tables.sessions).where(eq(kind.tables.sessions.tokenHash, hashOf(token)))
}

/**
 * The account behind a session token, or `undefined` when the token is unknown, the session has
 * ended (too long without a request, or too long since it began) or the account is turned off.
 * A valid session counts as a request, so it stays open another idle period, but never past the
 * absolute one: `createdAt` is never moved, so renewing can't stretch a session, and a stolen
 * token can't keep it alive for ever. An ended session is removed.
 */
export async function findSession(db: Database, kind: AccountKind, token: string, now = new Date()) {
  const { sessions, users } = kind.tables
  const tokenHash = hashOf(token)
  const [row] = await db
    .select({
      createdAt: sessions.createdAt,
      id: sessions.id,
      lastSeenAt: sessions.lastSeenAt,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash))

  if (row === undefined) {
    return undefined
  }

  const ended =
    now.getTime() - row.createdAt.getTime() >= kind.absoluteLifetime ||
    now.getTime() - row.lastSeenAt.getTime() >= kind.idleLifetime

  if (ended || row.user.disabledAt !== null) {
    await db.delete(sessions).where(eq(sessions.id, row.id))

    return undefined
  }

  await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, row.id))

  return row.user
}

/**
 * Whether a login link would work now, without using it up. A mail scanner or a link preview
 * opens the link before the person does, so the link only shows a button, and the button uses
 * the link up (see `redeemLoginLink`).
 */
export async function loginLinkWorks(db: Database, kind: AccountKind, token: string, now = new Date()) {
  const { links, users } = kind.tables
  const [row] = await db
    .select({ id: links.id })
    .from(links)
    .innerJoin(users, eq(links.userId, users.id))
    .where(and(eq(links.tokenHash, hashOf(token)), gt(links.expiresAt, now), isNull(users.disabledAt)))

  return row !== undefined
}

/**
 * Uses a login code up and starts a session, like `redeemLoginLink`: the token for the
 * cookie, or `undefined` for a code that is wrong, expired, used before, tried too often
 * already, or that belongs to an account that is turned off, and for a reference nobody
 * asked for. The answer is the same for all of them. The code belongs to the request with
 * that reference, so it only works for the address that asked.  Every try is counted
 * first, with one statement that only counts below the limit, so two requests at the same
 * time can't both get one try more. Then the code is compared, and a right code deletes
 * the row, so it works once.
 */
export async function redeemLoginCode(db: Database, kind: AccountKind, ref: string, value: string, now = new Date()) {
  const { links, users } = kind.tables
  const code = value.replaceAll(/\s/g, '')

  if (!/^\d{6}$/.test(code) || ref === '') {
    return undefined
  }

  const refHash = hashOf(ref)
  const [link] = await db
    .select({ codeHash: links.codeHash, id: links.id, user: users })
    .from(links)
    .innerJoin(users, eq(links.userId, users.id))
    .where(and(eq(links.refHash, refHash), gt(links.expiresAt, now)))

  if (link?.codeHash === undefined || link.codeHash === null) {
    return undefined
  }

  const [counted] = await db
    .update(links)
    .set({ failedAttempts: sql`${links.failedAttempts} + 1` })
    .where(and(eq(links.id, link.id), lt(links.failedAttempts, kind.codeAttempts)))

  if (counted.affectedRows !== 1 || link.codeHash !== codeHashOf(ref, code)) {
    return undefined
  }

  const [deleted] = await db.delete(links).where(eq(links.id, link.id))

  if (deleted.affectedRows !== 1 || link.user.disabledAt !== null) {
    return undefined
  }

  return startSession(db, kind, link.user.id, now)
}

/**
 * Uses a login link up and starts a session for its account: the token for the cookie, or
 * `undefined` when the link is unknown, has expired, was used before or belongs to an account
 * that is turned off. It deletes the row first and only goes on when it deleted exactly one, so
 * two requests with the same link can't both log in.
 */
export async function redeemLoginLink(db: Database, kind: AccountKind, token: string, now = new Date()) {
  const { links, users } = kind.tables
  const tokenHash = hashOf(token)
  const [link] = await db
    .select({ id: links.id, user: users })
    .from(links)
    .innerJoin(users, eq(links.userId, users.id))
    .where(and(eq(links.tokenHash, tokenHash), gt(links.expiresAt, now)))

  if (link === undefined) {
    return undefined
  }

  const [deleted] = await db.delete(links).where(eq(links.id, link.id))

  if (deleted.affectedRows !== 1 || link.user.disabledAt !== null) {
    return undefined
  }

  return startSession(db, kind, link.user.id, now)
}

/**
 * Removes the sessions and the login links that have ended, so the tables don't collect them.
 */
export async function removeEnded(db: Database, kind: AccountKind, now = new Date()) {
  const { links, sessions } = kind.tables

  await db.delete(links).where(lte(links.expiresAt, now))
  await db
    .delete(sessions)
    .where(
      or(
        lte(sessions.createdAt, new Date(now.getTime() - kind.absoluteLifetime)),
        lte(sessions.lastSeenAt, new Date(now.getTime() - kind.idleLifetime)),
      ),
    )
}

/** Starts a session for an account, and returns the token for the cookie. */
export async function startSession(db: Database, kind: AccountKind, userId: number, now = new Date()) {
  const token = newToken()

  await db.insert(kind.tables.sessions).values({ createdAt: now, lastSeenAt: now, tokenHash: hashOf(token), userId })

  return token
}
