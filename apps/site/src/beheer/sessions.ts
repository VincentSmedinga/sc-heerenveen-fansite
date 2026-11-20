import type { Database } from '@fansite/db/client'

import * as shared from '../login/sessions'
import { codeHashOf, hashOf, newCode, newToken } from '../login/tokens'
import { adminKind } from './admin-login'

// The sessions of the admin: the shared code of the login (`src/login`) with the settings of
// the admin. The cookie holds a random token and nothing else (see require-role.ts).

export { codeHashOf, hashOf, newCode, newToken }

/** How long a login link works. */
export const linkLifetime = adminKind.linkLifetime

/** How many wrong codes a login code takes; the next try, right or wrong, is refused. */
export const codeAttempts = adminKind.codeAttempts

/** A session ends after this long without a request. */
export const idleLifetime = adminKind.idleLifetime

/** A session ends this long after it began, however often it was used. */
export const absoluteLifetime = adminKind.absoluteLifetime

/** Ends a session on the server: the token stops working at once. */
export function endSession(db: Database, token: string) {
  return shared.endSession(db, adminKind, token)
}

/**
 * The account behind a session token, or `undefined` when the token is unknown, the session has
 * ended (9 days without a request, or 14 days since it began) or the account is turned off.
 */
export async function findSession(db: Database, token: string, now = new Date()) {
  const user = await shared.findSession(db, adminKind, token, now)

  return user === undefined
    ? undefined
    : { email: user.email, firstName: user.firstName, role: user.role, userId: user.id }
}

/** Whether a login link would work now, without using it up. */
export function loginLinkWorks(db: Database, token: string, now = new Date()) {
  return shared.loginLinkWorks(db, adminKind, token, now)
}

/** Uses a login code up and starts a session: the token for the cookie, or `undefined`. */
export function redeemLoginCode(db: Database, ref: string, value: string, now = new Date()) {
  return shared.redeemLoginCode(db, adminKind, ref, value, now)
}

/** Uses a login link up and starts a session: the token for the cookie, or `undefined`. */
export function redeemLoginLink(db: Database, token: string, now = new Date()) {
  return shared.redeemLoginLink(db, adminKind, token, now)
}

/** Removes the sessions and the login links that have ended. */
export function removeEnded(db: Database, now = new Date()) {
  return shared.removeEnded(db, adminKind, now)
}

/** Starts a session for an account, and returns the token for the cookie. */
export function startSession(db: Database, userId: number, now = new Date()) {
  return shared.startSession(db, adminKind, userId, now)
}
