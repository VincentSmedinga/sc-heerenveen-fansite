'use server'

import { adminRoles } from '@fansite/db/schema'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { loginPath, requireRole, sessionCookieName, sessionCookieOptions, sessionToken } from '#src/beheer/require-role'
import { endSession } from '#src/beheer/sessions'
import { getDatabase } from '#src/database'

/**
 * Logs out: the session is removed on the server, so the token stops working, and the cookie
 * goes.
 */
export async function logOut() {
  await requireRole(...adminRoles)

  const token = await sessionToken()

  if (token !== undefined) {
    await endSession(getDatabase().db, token)
  }

  ;(await cookies()).set(sessionCookieName, '', { ...sessionCookieOptions, maxAge: 0 })

  // The word tells the login page that the editor chose to leave, so it also takes away the
  // input the browser kept for the forms (see beheer/report-draft.ts). A session that ran out
  // must not.
  redirect(`${loginPath}?uitgelogd=1`)
}
