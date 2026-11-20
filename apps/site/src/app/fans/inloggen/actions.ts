'use server'

import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'
import { after } from 'next/server'

import type { LogInState } from '#src/fans/log-in-form'

import { getDatabase } from '#src/database'
import { originOf } from '#src/env'
import { land } from '#src/fans/land'
import { handleLogIn, logInPaths, returnPathOf } from '#src/fans/log-in'
import { logInErrorMessages, returnParameter } from '#src/fans/log-in-form'
import { type ConfirmResult, confirmWithCode, confirmWithLink } from '#src/fans/sign-up'
import { sendLogInMail, sendMailCeilingMail } from '#src/fans/sign-up-mail'

// The actions of logging in, which a visitor without a session may call. routes.test.ts names
// this file as open. Each one does nothing while accounts are off: it answers "not found"
// before it reads anything. The page to go back to comes from the form, so each action checks
// it again with returnPathOf before it follows it.

const goneLink = `${logInPaths.confirm}?fout=link`

/** Logs in with the link: the page of the link binds its token and the page to go back to. */
export async function confirm(token: string, returnTo: string | undefined) {
  requireFansPart('accounts', notFound)

  await land(
    typeof token === 'string' ? await confirmWithLink(getDatabase().db, token) : { answer: 'gone' },
    returnPathOf(returnTo),
    goneLink,
  )
}

/** Logs in with the code from the mail, on the page "Kijk in je mail", which binds `ref`. */
export async function confirmCode(ref: string, returnTo: string | undefined, formData: FormData) {
  requireFansPart('accounts', notFound)

  const code = formData.get('code')
  const back = returnPathOf(returnTo)
  const result: ConfirmResult =
    typeof ref === 'string' && typeof code === 'string'
      ? await confirmWithCode(getDatabase().db, ref, code)
      : { answer: 'gone' }

  if (result.answer === 'gone') {
    redirect(sentPath(String(ref), back, true))
  }

  await land(result, back, goneLink)
}

/**
 * Handles the form of logging in. It returns the state the form shows when the address is wrong
 * or a limit is reached, and sends the visitor to "Kijk in je mail" otherwise, for every
 * address.
 */
export async function requestLogIn(_previous: LogInState, formData: FormData): Promise<LogInState> {
  requireFansPart('accounts', notFound)

  const email = formData.get('e-mail')
  const value = typeof email === 'string' ? email : ''
  const back = returnPathOf(formData.get(returnParameter))
  const result = await handleLogIn(getDatabase().db, value, back, {
    defer: after,
    deliver: sendLogInMail,
    notifyCeiling: sendMailCeilingMail,
    origin: originOf(),
  })

  switch (result.answer) {
    case 'ceiling':
    case 'limited':
      return { failure: result.answer, value }
    case 'invalid':
      return { error: logInErrorMessages[result.error], value }
    case 'sent':
      redirect(sentPath(result.ref, back, false))
  }
}

/** The page "Kijk in je mail" of a request, after a wrong code or not. */
function sentPath(ref: string, back: string | undefined, wrongCode: boolean) {
  const query = new URLSearchParams({ ref })

  if (wrongCode) {
    query.set('fout', 'code')
  }

  if (back !== undefined) {
    query.set(returnParameter, back)
  }

  return `${logInPaths.sent}?${query.toString()}`
}
