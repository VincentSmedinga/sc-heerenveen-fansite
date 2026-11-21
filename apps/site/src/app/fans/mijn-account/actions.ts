'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { getDatabase } from '#src/database'
import { logInPaths } from '#src/fans/log-in'
import { requireSupporter, supporterCookieName, supporterToken } from '#src/fans/require-supporter'
import { supporterKind } from '#src/fans/supporter-login'
import { endSession, endSessionsOf } from '#src/login/sessions'

// Logging out, on Mijn account. A blocked supporter can log out too.

const loggedOut = `${logInPaths.home}?uitgelogd=1`

/** Logs out on this device: ends this session and removes the cookie. */
export async function logOut() {
  const { supporterId } = await requireSupporter({ blocked: 'allow' })
  const token = await supporterToken()

  if (token !== undefined) {
    await endSession(getDatabase().db, supporterKind, token)
  }

  ;(await cookies()).delete({ name: supporterCookieName, path: supporterKind.cookie.path })
  console.info(`Supporter ${supporterId} logged out.`)
  redirect(loggedOut)
}

/** Logs out on every device: ends every session of the account and removes the cookie. */
export async function logOutEverywhere() {
  const { supporterId } = await requireSupporter({ blocked: 'allow' })

  await endSessionsOf(getDatabase().db, supporterKind, supporterId)
  ;(await cookies()).delete({ name: supporterCookieName, path: supporterKind.cookie.path })
  console.info(`Supporter ${supporterId} logged out on every device.`)
  redirect(loggedOut)
}
