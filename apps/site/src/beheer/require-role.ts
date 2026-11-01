import type { AdminRole } from '@fansite/db/schema'

import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

import { getDatabase } from '../database'
import { absoluteLifetime, findSession } from './sessions'

/** The name of the cookie of the admin. It is the only cookie the site sets. */
export const sessionCookieName = 'beheer-sessie'

/** The address of the login page, where somebody without a session goes. */
export const loginPath = '/beheer/inloggen'

/**
 * What the cookie of the admin is made of. It holds the token of the session and nothing else.
 * The browser sends it only under /beheer, never to a page of the site, and a script on a page
 * can't read it. It lasts as long as a session can, but the server decides: a session that has
 * ended or been revoked doesn't work, whatever the browser still holds.
 *
 * It is `Secure` everywhere but in the development server, because Safari doesn't keep a
 * `Secure` cookie on http://localhost. The choice comes from `NODE_ENV` and never from the
 * `Host` header or the protocol of the request, which the sender picks. A built site, on
 * acceptance, in production and in the checks, always sets `Secure`.
 */
export const sessionCookieOptions = {
  httpOnly: true,
  maxAge: absoluteLifetime / 1000,
  path: '/beheer',
  sameSite: 'lax',
  secure: process.env.NODE_ENV !== 'development',
} as const

/** The account that is logged in. */
export type AdminContext = { email: string; role: AdminRole; userId: number }

/**
 * The one check of the admin: who is logged in, and may this role do this? Every page, route
 * and server action under /beheer calls it first. The proxy is no guard: it sees a path, not
 * which action a request calls, and a path it doesn't match is open. Without a session it sends
 * the visitor to the login page; with a session of another role it answers as if the page isn't
 * there. `routes.test.ts` goes through all of them and fails for one that doesn't call it.
 */
export async function requireRole(...allowed: readonly AdminRole[]): Promise<AdminContext> {
  const token = (await cookies()).get(sessionCookieName)?.value

  if (token === undefined || token === '') {
    redirect(loginPath)
  }

  const session = await findSession(getDatabase().db, token)

  if (session === undefined) {
    redirect(loginPath)
  }

  if (!allowed.includes(session.role)) {
    notFound()
  }

  return session
}

/**
 * The token in the cookie, or `undefined` without one. It does not check the session;
 * `findSession` does.
 */
export async function sessionToken() {
  const token = (await cookies()).get(sessionCookieName)?.value

  return token === undefined || token === '' ? undefined : token
}
