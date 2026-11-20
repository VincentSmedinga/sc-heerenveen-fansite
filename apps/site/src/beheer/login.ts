import type { Database } from '@fansite/db/client'

import type { LoginMail, LoginRequestDeps, LoginRequestResult } from '../login/request'

import * as shared from '../login/request'
import { normaliseEmail } from './accounts'
import { adminKind } from './admin-login'

export type { LoginMail, LoginRequestDeps, LoginRequestResult }

/** The rate limit: so many login links per address, and for the whole site, in one window. */
export const loginLimits = adminKind.limits

/**
 * The answer to a request for a login link takes at least this long, so an address with an
 * account (a row to write, a mail to hand over) can't be told from one without by how long the
 * answer takes.
 */
export const minimumAnswerMilliseconds = adminKind.minimumAnswerMilliseconds

/**
 * Handles a request for a login link of the admin (see `handleLoginRequest` in `src/login`).
 * The link opens the page that confirms it.
 */
export function handleLoginRequest(db: Database, value: string, deps: LoginRequestDeps): Promise<LoginRequestResult> {
  return shared.handleLoginRequest(db, adminKind, value, deps, {
    normalise: normaliseEmail,
    path: '/beheer/inloggen/bevestigen',
  })
}

/** Notes one request for a login link in the rate limit, and says whether it is within it. */
export function noteAttempt(db: Database, email: string, now: Date) {
  return shared.noteAttempt(db, adminKind, email, now)
}
