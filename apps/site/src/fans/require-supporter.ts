import { requireFansPart } from '@fansite/shared/fans-env'
import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

import { getDatabase } from '../database'
import { cookieOptionsOf } from '../login/account-kind'
import { findSession } from '../login/sessions'
import { logInPaths, returnPathOf } from './log-in'
import { returnParameter } from './log-in-form'
import { supporterKind } from './supporter-login'

/** The name of the cookie of supporters. */
export const supporterCookieName = supporterKind.cookie.name

/** Where somebody without a session goes: the page to log in. */
export const supporterLoginPath = logInPaths.form

/**
 * What the cookie `fans-sessie` is made of: the token of the session and nothing else,
 * `HttpOnly`, `SameSite=Lax`, `Secure` on every built site, and sent only under /fans, so it
 * never goes along to a public page of the site or to /beheer.
 */
export const supporterCookieOptions = cookieOptionsOf(supporterKind)

/** The supporter who is logged in, and whether the editors blocked the account. */
export type SupporterContext = { blocked: boolean; email: string; screenName: string; supporterId: number }

/**
 * The supporter of the session in the cookie, or `undefined` without a session that works. It
 * counts the visit: the session stays open another 90 days, and the account keeps the day of
 * its last visit. Both are written at most once a day.
 */
export async function currentSupporter(now = new Date()) {
  const token = await supporterToken()

  if (token === undefined) {
    return undefined
  }

  const { db } = getDatabase()
  const supporter = await findSession(db, supporterKind, token, now)
  const today = now.toISOString().slice(0, 10)

  if (supporter !== undefined && supporter.lastVisitOn !== today) {
    const { users } = supporterKind.tables

    // A visit also takes back the mail about an unused account (#1460): the next term of 24
    // months starts here.
    await db.update(users).set({ lastVisitOn: today, unusedMailSentAt: null }).where(eq(users.id, supporter.id))
  }

  return supporter
}

/**
 * The one check of what a supporter who is logged in may do. Every personal page and action
 * under /fans calls it first; `routes.test.ts` goes through them and fails for one that
 * doesn't. With accounts off it answers "not found". Without a session it sends the visitor to
 * log in, with `from` as the page to come back to. A blocked account goes to the page that says
 * so, unless the page allows it (`blocked: 'allow'`), as Mijn account does. It reads only the
 * tables of supporters, so a session of the admin is never a supporter.
 */
export async function requireSupporter(options: { blocked?: 'allow'; from?: string } = {}): Promise<SupporterContext> {
  requireFansPart('accounts', notFound)

  const supporter = await currentSupporter()

  if (supporter === undefined) {
    const from = returnPathOf(options.from)

    redirect(
      from === undefined
        ? supporterLoginPath
        : `${supporterLoginPath}?${new URLSearchParams({ [returnParameter]: from }).toString()}`,
    )
  }

  const blocked = supporter.disabledAt !== null

  if (blocked && options.blocked !== 'allow') {
    redirect(logInPaths.blocked)
  }

  return { blocked, email: supporter.email, screenName: supporter.screenName, supporterId: supporter.id }
}

/** The token in the cookie, or `undefined` without one. It does not check the session. */
export async function supporterToken() {
  const token = (await cookies()).get(supporterCookieName)?.value

  return token === undefined || token === '' ? undefined : token
}
