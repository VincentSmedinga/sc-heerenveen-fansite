'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { after } from 'next/server'

import { handleLoginRequest } from '../../../beheer/login'
import { sendLoginMail } from '../../../beheer/login-mail'
import { sessionCookieName, sessionCookieOptions } from '../../../beheer/require-role'
import { redeemLoginLink } from '../../../beheer/sessions'
import { getDatabase } from '../../../database'
import { originOf } from '../../../env'

// The only two actions of the admin that a visitor without a session may call. require-role.test.ts names this file as the
// exception; every other action under /beheer starts with requireRole.

/**
 * Logs in with the link: it uses the link up, starts a session and puts its token in the cookie. The page of the link binds
 * the token of the link to the action (`logIn.bind(null, token)`), which Next.js keeps encrypted in the form.
 */
export async function logIn(token: string) {
  const sessionToken = typeof token === 'string' ? await redeemLoginLink(getDatabase().db, token) : undefined

  if (sessionToken === undefined) {
    redirect('/beheer/inloggen?fout=link')
  }

  ;(await cookies()).set(sessionCookieName, sessionToken, sessionCookieOptions)

  redirect('/beheer')
}

/**
 * Asks for a login link. Every address with a good form leads to the same page, "verstuurd", whether it has an account or
 * not (see handleLoginRequest). Only a form that is not an address, or the rate limit, leads back to the form with a
 * message.
 */
export async function requestLoginLink(formData: FormData) {
  const email = formData.get('email')
  const result = await handleLoginRequest(getDatabase().db, typeof email === 'string' ? email : '', {
    defer: after,
    deliver: sendLoginMail,
    origin: originOf(),
  })

  redirect(
    result === 'sent'
      ? '/beheer/inloggen/verstuurd'
      : `/beheer/inloggen?fout=${result === 'invalid' ? 'ongeldig' : 'te-veel'}`,
  )
}
