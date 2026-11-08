'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { after } from 'next/server'

import { handleLoginRequest } from '#src/beheer/login'
import { sendLoginMail } from '#src/beheer/login-mail'
import { sessionCookieName, sessionCookieOptions } from '#src/beheer/require-role'
import { redeemLoginCode, redeemLoginLink } from '#src/beheer/sessions'
import { getDatabase } from '#src/database'
import { originOf } from '#src/env'

// The only three actions of the admin that a visitor without a session may call.
// require-role.test.ts names this file as the exception; every other action under /beheer
// starts with requireRole.

/**
 * Logs in with the link: it uses the link up, starts a session and puts its token in the
 * cookie. The page of the link binds the token of the link to the action (`logIn.bind(null,
 * token)`), which Next.js keeps encrypted in the form.
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
 * Logs in with the code from the mail, on the page "verstuurd": the app on the Home
 * Screen has a cookie jar of its own, so the link, which opens in Safari, can't log it
 * in. The page binds the reference of the request to the action. A code that doesn't work
 * leads back with one message, whatever the reason (see `redeemLoginCode`).
 */
export async function logInWithCode(ref: string, formData: FormData) {
  const code = formData.get('code')
  const sessionToken =
    typeof ref === 'string' && typeof code === 'string' ? await redeemLoginCode(getDatabase().db, ref, code) : undefined

  if (sessionToken === undefined) {
    redirect(`/beheer/inloggen/verstuurd?${new URLSearchParams({ fout: 'code', ref: String(ref) }).toString()}`)
  }

  ;(await cookies()).set(sessionCookieName, sessionToken, sessionCookieOptions)

  redirect('/beheer')
}

/**
 * Asks for a login link. Every address with a good form leads to the same page, "verstuurd",
 * whether it has an account or not (see handleLoginRequest). Only a form that is not an
 * address, or the rate limit, leads back to the form with a message.
 */
export async function requestLoginLink(formData: FormData) {
  const email = formData.get('email')
  const result = await handleLoginRequest(getDatabase().db, typeof email === 'string' ? email : '', {
    defer: after,
    deliver: sendLoginMail,
    origin: originOf(),
  })

  redirect(
    result.answer === 'sent'
      ? `/beheer/inloggen/verstuurd?${new URLSearchParams({ ref: result.ref }).toString()}`
      : `/beheer/inloggen?fout=${result.answer === 'invalid' ? 'ongeldig' : 'te-veel'}`,
  )
}
