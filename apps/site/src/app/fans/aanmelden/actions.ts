'use server'

import { requireFansPart } from '@fansite/shared/fans-env'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { after } from 'next/server'

import type { SignUpState } from '#src/fans/sign-up-form'

import { getDatabase } from '#src/database'
import { originOf } from '#src/env'
import { supporterCookieName, supporterCookieOptions } from '#src/fans/require-supporter'
import { type ConfirmResult, confirmWithCode, confirmWithLink, handleSignUp, signUpPaths } from '#src/fans/sign-up'
import { errorMessages } from '#src/fans/sign-up-form'
import { sendCeilingMail, sendSignUpMail } from '#src/fans/sign-up-mail'

// The actions of signing up, which a visitor without a session may call. routes.test.ts names
// this file as open. Each one does nothing while accounts are off: it answers "not found"
// before it reads anything.

/** Confirms with the link: the page of the link binds its token to the action. */
export async function confirm(token: string) {
  requireFansPart('accounts', notFound)

  await land(typeof token === 'string' ? await confirmWithLink(getDatabase().db, token) : { answer: 'gone' })
}

/** Confirms with the code from the mail, on the page "Kijk in je mail", which binds `ref`. */
export async function confirmCode(ref: string, formData: FormData) {
  requireFansPart('accounts', notFound)

  const code = formData.get('code')
  const result: ConfirmResult =
    typeof ref === 'string' && typeof code === 'string'
      ? await confirmWithCode(getDatabase().db, ref, code)
      : { answer: 'gone' }

  if (result.answer === 'gone') {
    redirect(`${signUpPaths.sent}?${new URLSearchParams({ fout: 'code', ref: String(ref) }).toString()}`)
  }

  await land(result)
}

/**
 * Handles the form of signing up. It returns the state the form shows when a field is wrong or
 * a limit is reached, and sends the visitor to "Kijk in je mail" otherwise, for every address.
 */
export async function signUp(_previous: SignUpState, formData: FormData): Promise<SignUpState> {
  requireFansPart('accounts', notFound)

  const text = (name: string) => {
    const value = formData.get(name)

    return typeof value === 'string' ? value : ''
  }
  const values = { email: text('e-mail'), screenName: text('schermnaam') }
  const result = await handleSignUp(getDatabase().db, values, {
    defer: after,
    deliver: sendSignUpMail,
    notifyCeiling: sendCeilingMail,
    origin: originOf(),
  })

  switch (result.answer) {
    case 'ceiling':
    case 'limited':
      return { errors: {}, failure: result.answer, values }
    case 'invalid':
      return { errors: errorMessages(result.errors), values }
    case 'sent':
      redirect(`${signUpPaths.sent}?${new URLSearchParams({ ref: result.ref }).toString()}`)
  }
}

/** Puts the session in the cookie and goes on, or back to the form for a taken name. */
async function land(result: ConfirmResult) {
  if (result.answer === 'taken') {
    redirect(`${signUpPaths.form}?fout=naam-bezet`)
  }

  if (result.answer === 'gone') {
    redirect(`${signUpPaths.confirm}?fout=link`)
  }

  ;(await cookies()).set(supporterCookieName, result.token, supporterCookieOptions)

  redirect(result.created ? `${signUpPaths.account}?welkom=1` : signUpPaths.account)
}
