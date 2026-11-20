import { requireFansPart } from '@fansite/shared/fans-env'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

import { getDatabase } from '../database'
import { cookieOptionsOf } from '../login/account-kind'
import { findSession } from '../login/sessions'
import { signUpPaths } from './sign-up'
import { supporterKind } from './supporter-login'

/** The name of the cookie of supporters. */
export const supporterCookieName = supporterKind.cookie.name

/**
 * Where somebody without a session goes. The page to log in comes with issue 1448; until then
 * it is the page to sign up, which mails an address with an account the link to log in.
 */
export const supporterLoginPath = signUpPaths.form

/**
 * What the cookie `fans-sessie` is made of: the token of the session and nothing else,
 * `HttpOnly`, `SameSite=Lax`, `Secure` on every built site, and sent only under /fans, so it
 * never goes along to a public page of the site or to /beheer.
 */
export const supporterCookieOptions = cookieOptionsOf(supporterKind)

/** The supporter who is logged in. */
export type SupporterContext = { email: string; screenName: string; supporterId: number }

/**
 * The one check of what a supporter who is logged in may do. Every personal page and action
 * under /fans calls it first; `routes.test.ts` goes through them and fails for one that
 * doesn't. With accounts off it answers "not found". Without a session it sends the visitor to
 * log in. It reads only the tables of supporters, so a session of the admin is never a
 * supporter.
 */
export async function requireSupporter(): Promise<SupporterContext> {
  requireFansPart('accounts', notFound)

  const token = await supporterToken()

  if (token === undefined) {
    redirect(supporterLoginPath)
  }

  const supporter = await findSession(getDatabase().db, supporterKind, token)

  if (supporter === undefined) {
    redirect(supporterLoginPath)
  }

  return { email: supporter.email, screenName: supporter.screenName, supporterId: supporter.id }
}

/** The token in the cookie, or `undefined` without one. It does not check the session. */
export async function supporterToken() {
  const token = (await cookies()).get(supporterCookieName)?.value

  return token === undefined || token === '' ? undefined : token
}
