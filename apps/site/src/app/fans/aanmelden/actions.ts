'use server'

import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'
import { after } from 'next/server'

import type { SignUpState } from '#src/fans/sign-up-form'

import { getDatabase } from '#src/database'
import { originOf } from '#src/env'
import { land } from '#src/fans/land'
import { handleNewCode, type NewCodeResult } from '#src/fans/new-code'
import {
  type ConfirmResult,
  confirmWithCode,
  confirmWithLink,
  handleSignUp,
  type SignUpDeps,
  signUpPaths,
} from '#src/fans/sign-up'
import { errorMessages } from '#src/fans/sign-up-form'
import { sendCeilingMail, sendMailCeilingMail, sendSignUpMail } from '#src/fans/sign-up-mail'

// The actions of signing up, which a visitor without a session may call. routes.test.ts names
// this file as open. Each one does nothing while accounts are off: it answers "not found"
// before it reads anything.

const goneLink = `${signUpPaths.confirm}?fout=link`

/** What a mail of signing up needs: how it is sent after the answer, and the site's address. */
const mailDeps = (): SignUpDeps => ({
  defer: after,
  deliver: sendSignUpMail,
  notifyCeiling: sendCeilingMail,
  notifyMailCeiling: sendMailCeilingMail,
  origin: originOf(),
})

/** Confirms with the link: the page of the link binds its token to the action. */
export async function confirm(token: string) {
  requireFansPart('accounts', notFound)

  await land(
    typeof token === 'string' ? await confirmWithLink(getDatabase().db, token) : { answer: 'gone' },
    undefined,
    goneLink,
  )
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

  await land(result, undefined, goneLink)
}

/**
 * Mails a new link and code, on the page "Kijk in je mail", which binds `ref`. The page shows
 * what came of it: a new mail, the wait of a minute, or a limit. A request that is gone leads
 * to the page of a link that doesn't work.
 */
export async function newCode(ref: string) {
  requireFansPart('accounts', notFound)

  const result: NewCodeResult =
    typeof ref === 'string' ? await handleNewCode(getDatabase().db, ref, mailDeps()) : { answer: 'gone' }

  if (result.answer === 'gone') {
    redirect(goneLink)
  }

  // The words of the address of the page are the keys of `newCodeMessages`.
  const melding = { limited: 'limiet', sent: 'nieuw', wait: 'wacht' }[result.answer]

  redirect(`${signUpPaths.sent}?${new URLSearchParams({ melding, ref }).toString()}`)
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
  const result = await handleSignUp(getDatabase().db, values, mailDeps())

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
