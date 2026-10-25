import type { Database } from '@fansite/db/client'

import { adminLoginLinks, adminSessions, adminUsers } from '@fansite/db/schema'
import { and, eq, gt, isNull, lte, or } from 'drizzle-orm'
import { createHash, randomBytes } from 'node:crypto'

// The sessions of the admin, on the server. The cookie holds a random token and nothing else (see require-role.ts), and the
// database keeps the SHA-256 of the token, so a copy of the database logs nobody in. A token is 256 random bits, so a hash
// without salt is enough: there is nothing to guess.

const minute = 60 * 1000

/** How long a login link works. */
export const linkLifetime = 15 * minute

/** A session ends after this long without a request. */
export const idleLifetime = 12 * 60 * minute

/** A session ends this long after it began, however often it was used. */
export const absoluteLifetime = 7 * 24 * 60 * minute

/** Ends a session on the server: the token stops working at once, whatever the browser still holds. */
export async function endSession(db: Database, token: string) {
  await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashOf(token)))
}

/**
 * The account behind a session token, or `undefined` when the token is unknown, the session has ended (12 hours without
 * a request, or 7 days since it began) or the account is turned off. A valid session counts as a request, so it stays open
 * another 12 hours. An ended session is removed.
 */
export async function findSession(db: Database, token: string, now = new Date()) {
  const tokenHash = hashOf(token)
  const [row] = await db
    .select({
      createdAt: adminSessions.createdAt,
      id: adminSessions.id,
      lastSeenAt: adminSessions.lastSeenAt,
      user: adminUsers,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.userId, adminUsers.id))
    .where(eq(adminSessions.tokenHash, tokenHash))

  if (row === undefined) {
    return undefined
  }

  const ended =
    now.getTime() - row.createdAt.getTime() >= absoluteLifetime ||
    now.getTime() - row.lastSeenAt.getTime() >= idleLifetime

  if (ended || row.user.disabledAt !== null) {
    await db.delete(adminSessions).where(eq(adminSessions.id, row.id))

    return undefined
  }

  await db.update(adminSessions).set({ lastSeenAt: now }).where(eq(adminSessions.id, row.id))

  return { email: row.user.email, role: row.user.role, userId: row.user.id }
}

/** What the database keeps of a token. */
export function hashOf(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

/**
 * Whether a login link would work now, without using it up. A mail scanner or a link preview opens the link before the
 * person does, so the link only shows a button, and the button uses the link up (see `redeemLoginLink`).
 */
export async function loginLinkWorks(db: Database, token: string, now = new Date()) {
  const [row] = await db
    .select({ id: adminLoginLinks.id })
    .from(adminLoginLinks)
    .innerJoin(adminUsers, eq(adminLoginLinks.userId, adminUsers.id))
    .where(
      and(
        eq(adminLoginLinks.tokenHash, hashOf(token)),
        gt(adminLoginLinks.expiresAt, now),
        isNull(adminUsers.disabledAt),
      ),
    )

  return row !== undefined
}

/** A new random token, for a login link or a session. */
export function newToken() {
  return randomBytes(32).toString('base64url')
}

/**
 * Uses a login link up and starts a session for its account: the token for the cookie, or `undefined` when the link is
 * unknown, has expired, was used before or belongs to an account that is turned off. It deletes the row first and only goes
 * on when it deleted exactly one, so two requests with the same link can't both log in.
 */
export async function redeemLoginLink(db: Database, token: string, now = new Date()) {
  const tokenHash = hashOf(token)
  const [link] = await db
    .select({ id: adminLoginLinks.id, user: adminUsers })
    .from(adminLoginLinks)
    .innerJoin(adminUsers, eq(adminLoginLinks.userId, adminUsers.id))
    .where(and(eq(adminLoginLinks.tokenHash, tokenHash), gt(adminLoginLinks.expiresAt, now)))

  if (link === undefined) {
    return undefined
  }

  const [deleted] = await db.delete(adminLoginLinks).where(eq(adminLoginLinks.id, link.id))

  if (deleted.affectedRows !== 1 || link.user.disabledAt !== null) {
    return undefined
  }

  return startSession(db, link.user.id, now)
}

/** Removes the sessions and the login links that have ended, so the tables don't collect them. */
export async function removeEnded(db: Database, now = new Date()) {
  await db.delete(adminLoginLinks).where(lte(adminLoginLinks.expiresAt, now))
  await db
    .delete(adminSessions)
    .where(
      or(
        lte(adminSessions.createdAt, new Date(now.getTime() - absoluteLifetime)),
        lte(adminSessions.lastSeenAt, new Date(now.getTime() - idleLifetime)),
      ),
    )
}

/** Starts a session for an account, and returns the token for the cookie. */
export async function startSession(db: Database, userId: number, now = new Date()) {
  const token = newToken()

  await db.insert(adminSessions).values({ createdAt: now, lastSeenAt: now, tokenHash: hashOf(token), userId })

  return token
}
