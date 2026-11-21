import type { Database } from '@fansite/db/client'
import type { supporterEmailChanges } from '@fansite/db/schema'

import { and, eq, gt, gte, isNull, lt, lte, or, sql } from 'drizzle-orm'

import type { AccountKind, AccountOf } from './account-kind'

import { codeHashOf, hashOf, newToken } from './tokens'

/** A table of rows that a code of a mail uses up. */
type CodeTable = AccountKind['tables']['links'] | typeof supporterEmailChanges

/** A row of the login links of a kind. */
type LinkOf<Kind extends AccountKind> = Kind['tables']['links']['$inferSelect']

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

/** Ends every session of an account, on every device. */
export async function endSessionsOf(db: Database, kind: AccountKind, userId: number) {
  await db.delete(kind.tables.sessions).where(eq(kind.tables.sessions.userId, userId))
}

/**
 * The account behind a session token, or `undefined` when the token is unknown, the session has
 * ended (too long without a request, or too long since it began) or the account is turned off
 * (unless the kind lets such an account log in). A valid session counts as a request, at most
 * once per `renewAfter`, so it stays open another idle period, but never past the absolute one:
 * `createdAt` is never moved, so renewing can't stretch a session, and a stolen token can't
 * keep it alive for ever. An ended session is removed.
 */
export async function findSession<Kind extends AccountKind>(
  db: Database,
  kind: Kind,
  token: string,
  now = new Date(),
): Promise<AccountOf<Kind> | undefined> {
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

  if (ended || (row.user.disabledAt !== null && !kind.turnedOffLogsIn)) {
    await db.delete(sessions).where(eq(sessions.id, row.id))

    return undefined
  }

  if (now.getTime() - row.lastSeenAt.getTime() >= kind.renewAfter) {
    await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, row.id))
  }

  return row.user as AccountOf<Kind>
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
    .where(
      and(
        eq(links.tokenHash, hashOf(token)),
        gt(links.expiresAt, now),
        kind.turnedOffLogsIn ? undefined : isNull(users.disabledAt),
      ),
    )

  return row !== undefined
}

/**
 * Uses a login code up and starts a session, like `redeemLoginLink`: the token for the
 * cookie, or `undefined` for a code that is wrong, expired, used before, tried too often
 * already, or that belongs to an account that is turned off, and for a reference nobody
 * asked for. The answer is the same for all of them. The code belongs to the request with
 * that reference, so it only works for the address that asked (see `takeLinkWithCode`).
 */
export async function redeemLoginCode(db: Database, kind: AccountKind, ref: string, value: string, now = new Date()) {
  const link = await takeLinkWithCode(db, kind, ref, value, now)

  return link?.userId === undefined || link.userId === null ? undefined : startSessionIfOn(db, kind, link.userId, now)
}

/**
 * Uses a login link up and starts a session for its account: the token for the cookie, or
 * `undefined` when the link is unknown, has expired, was used before or belongs to an account
 * that is turned off (see `takeLink`).
 */
export async function redeemLoginLink(db: Database, kind: AccountKind, token: string, now = new Date()) {
  const link = await takeLink(db, kind, token, now)

  return link?.userId === undefined || link.userId === null ? undefined : startSessionIfOn(db, kind, link.userId, now)
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

/**
 * Starts a session for an account that is on: the token for the cookie, or `undefined` for an
 * account that is gone, or turned off when the kind doesn't let such an account log in.
 */
export async function startSessionIfOn(db: Database, kind: AccountKind, userId: number, now: Date) {
  const { users } = kind.tables
  const [account] = await db.select({ disabledAt: users.disabledAt }).from(users).where(eq(users.id, userId))

  return account === undefined || (account.disabledAt !== null && !kind.turnedOffLogsIn)
    ? undefined
    : startSession(db, kind, userId, now)
}

/**
 * Uses a code up like `takeLinkWithCode`, in `table`, which has the columns of a login link
 * that a code needs: the login links of the kind, or the requests to change the address of a
 * supporter (see change-email.ts in fans). The tries and their limit are those of the kind.
 */
export async function takeCode<Table extends CodeTable>(
  db: Database,
  kind: AccountKind,
  table: Table,
  ref: string,
  value: string,
  now = new Date(),
): Promise<Table['$inferSelect'] | undefined> {
  const links = table as CodeTable
  const code = value.replaceAll(/\s/g, '')

  if (!/^\d{6}$/.test(code) || ref === '') {
    return undefined
  }

  const [link] = await db
    .select()
    .from(links)
    .where(and(eq(links.refHash, hashOf(ref)), gt(links.expiresAt, now)))

  if (link?.codeHash === undefined || link.codeHash === null) {
    return undefined
  }

  const [counted] = await db
    .update(links)
    .set({ failedAttempts: sql`${links.failedAttempts} + 1` })
    .where(and(eq(links.id, link.id), lt(links.failedAttempts, kind.codeAttempts)))

  if (counted.affectedRows !== 1) {
    return undefined
  }

  if (link.codeHash !== codeHashOf(ref, code)) {
    if (kind.codeFailuresEndLink) {
      await db.delete(links).where(and(eq(links.id, link.id), gte(links.failedAttempts, kind.codeAttempts)))
    }

    return undefined
  }

  const [deleted] = await db.delete(links).where(eq(links.id, link.id))

  return deleted.affectedRows === 1 ? (link as Table['$inferSelect']) : undefined
}

/**
 * Uses a link of the mail up, without looking at its account: its row, or `undefined` when the
 * token is unknown or the link has expired. It deletes the row first and only gives it when it
 * deleted exactly one, so two requests with the same link can't both use it. A link of a
 * sign-up of supporters has no account yet; whoever calls this decides what it leads to.
 */
export async function takeLink<Kind extends AccountKind>(
  db: Database,
  kind: Kind,
  token: string,
  now = new Date(),
): Promise<LinkOf<Kind> | undefined> {
  const { links } = kind.tables
  const [link] = await db
    .select()
    .from(links)
    .where(and(eq(links.tokenHash, hashOf(token)), gt(links.expiresAt, now)))

  return link === undefined ? undefined : (deleteOnce(db, kind, link) as Promise<LinkOf<Kind> | undefined>)
}

/**
 * Uses the code of a link up, without looking at its account, like `takeLink`: its row, or
 * `undefined` for a code that is wrong, expired, used before or tried too often already, and
 * for a reference nobody asked for. Every try is counted first, with one statement that only
 * counts below the limit, so two requests at the same time can't both get one try more. Then
 * the code is compared, and a right code deletes the row, so it works once. For a kind with
 * `codeFailuresEndLink`, the last wrong try deletes the row too, so the link stops as well.
 */
export async function takeLinkWithCode<Kind extends AccountKind>(
  db: Database,
  kind: Kind,
  ref: string,
  value: string,
  now = new Date(),
): Promise<LinkOf<Kind> | undefined> {
  return takeCode(db, kind, kind.tables.links, ref, value, now) as Promise<LinkOf<Kind> | undefined>
}

/** Deletes the row of a link, and gives it back only when this call deleted it. */
async function deleteOnce<Link extends { id: number }>(db: Database, kind: AccountKind, link: Link) {
  const [deleted] = await db.delete(kind.tables.links).where(eq(kind.tables.links.id, link.id))

  return deleted.affectedRows === 1 ? link : undefined
}
