import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import type { ConfirmResult } from './sign-up'

import { getDatabase } from '../database'
import { landingOf } from './log-in'
import { supporterCookieName, supporterCookieOptions } from './require-supporter'
import { signUpPaths } from './sign-up'

/**
 * After a link or a code of the mail: puts the session in the cookie and goes on, to the new
 * account, back to `returnTo`, to Fans, or to the page of a blocked account. A link or a code
 * that doesn't work goes to `gone`, and a screen name taken in the meantime back to the form.
 */
export async function land(result: ConfirmResult, returnTo: string | undefined, gone: string): Promise<never> {
  if (result.answer === 'taken') {
    redirect(`${signUpPaths.form}?fout=naam-bezet`)
  }

  if (result.answer === 'gone') {
    redirect(gone)
  }

  ;(await cookies()).set(supporterCookieName, result.token, supporterCookieOptions)

  redirect(
    result.created
      ? `${signUpPaths.account}?welkom=1`
      : await landingOf(getDatabase().db, result.supporterId, returnTo),
  )
}
