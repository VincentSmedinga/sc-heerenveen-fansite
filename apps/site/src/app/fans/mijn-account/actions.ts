'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { after } from 'next/server'

import { getDatabase } from '#src/database'
import { originOf } from '#src/env'
import {
  accountFields,
  type AccountFormState,
  changeEmailErrorMessages,
  nameWaitError,
  type RankingsState,
} from '#src/fans/account-form'
import {
  changeEmailPaths,
  type ChangeResult,
  changeWithCode,
  changeWithLink,
  handleChangeEmail,
} from '#src/fans/change-email'
import { changeScreenName } from '#src/fans/change-name'
import { closeAccount, closePaths, isFreshConfirmation } from '#src/fans/close-account'
import { logInPaths } from '#src/fans/log-in'
import { setInRankings } from '#src/fans/rankings'
import { requireSupporter, supporterCookieName, supporterToken } from '#src/fans/require-supporter'
import { signUpPaths } from '#src/fans/sign-up'
import { errorMessages } from '#src/fans/sign-up-form'
import { sendChangeEmailMail, sendEmailChangedMail, sendMailCeilingMail } from '#src/fans/sign-up-mail'
import { supporterKind } from '#src/fans/supporter-login'
import { endSession, endSessionsOf } from '#src/login/sessions'

// The actions of Mijn account. Each one checks the session first, with requireSupporter, and
// works only on the account of that session. A blocked supporter can log out and close the
// account, but changes nothing else.

const loggedOut = `${logInPaths.home}?uitgelogd=1`
const goneLink = `${changeEmailPaths.confirm}?fout=link`

/**
 * Handles the form of a new name. It returns the state the form shows when the name is wrong or
 * can't be changed yet, and goes back to Mijn account with a notice otherwise.
 */
export async function changeName(_previous: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const { supporterId } = await requireSupporter({ from: signUpPaths.account })
  const value = textOf(formData, accountFields.screenName)
  const result = await changeScreenName(getDatabase().db, supporterId, value)

  if (result.answer === 'invalid') {
    return { error: errorMessages({ screenName: result.error }).screenName, value }
  }

  if (result.answer === 'wait') {
    return { error: nameWaitError(result.wait), value }
  }

  redirect(result.answer === 'changed' ? `${signUpPaths.account}?melding=schermnaam` : signUpPaths.account)
}

/**
 * Closes the account, from the page "Weet je het zeker?": only with a proof of that page from
 * this session that is at most 10 minutes old, so the session alone is not enough. It removes
 * the cookie and goes to the page that says the account is gone. Without a fresh proof it goes
 * back to the first page of closing.
 */
export async function closeMyAccount(formData: FormData) {
  const { supporterId } = await requireSupporter({ blocked: 'allow', from: closePaths.form })
  const token = await supporterToken()
  const issuedAt = Number(textOf(formData, 'gemaakt'))

  if (token === undefined || !isFreshConfirmation(token, issuedAt, textOf(formData, 'bewijs'))) {
    redirect(`${closePaths.form}?melding=verlopen`)
  }

  await closeAccount(getDatabase().db, supporterId)
  ;(await cookies()).delete({ name: supporterCookieName, path: supporterKind.cookie.path })
  redirect(closePaths.closed)
}

/** Changes the address with the code from the mail, on "Kijk in je mail", which binds `ref`. */
export async function confirmEmailCode(ref: string, formData: FormData) {
  const { supporterId } = await requireSupporter({ from: signUpPaths.account })
  const code = formData.get('code')
  const token = await supporterToken()
  const result: ChangeResult =
    typeof ref === 'string' && typeof code === 'string' && token !== undefined
      ? await changeWithCode(getDatabase().db, supporterId, token, ref, code)
      : { answer: 'gone' }

  if (result.answer === 'gone') {
    redirect(`${changeEmailPaths.sent}?${new URLSearchParams({ fout: 'code', ref: String(ref) }).toString()}`)
  }

  changed(result.oldEmail)
}

/** Changes the address with the link: the page of the link binds its token to the action. */
export async function confirmEmailLink(token: string) {
  const { supporterId } = await requireSupporter({ from: signUpPaths.account })
  const session = await supporterToken()
  const result: ChangeResult =
    typeof token === 'string' && session !== undefined
      ? await changeWithLink(getDatabase().db, supporterId, session, token)
      : { answer: 'gone' }

  if (result.answer === 'gone') {
    redirect(goneLink)
  }

  changed(result.oldEmail)
}

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

/**
 * Handles the form of a new address. It returns the state the form shows when the address is
 * wrong or a limit is reached, and goes to "Kijk in je mail" otherwise, for every address.
 */
export async function requestEmailChange(_previous: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const { supporterId } = await requireSupporter({ from: signUpPaths.account })
  const value = textOf(formData, accountFields.email)
  const result = await handleChangeEmail(getDatabase().db, supporterId, value, {
    defer: after,
    deliver: sendChangeEmailMail,
    notifyMailCeiling: sendMailCeilingMail,
    origin: originOf(),
  })

  switch (result.answer) {
    case 'invalid':
      return { error: changeEmailErrorMessages[result.error], value }
    case 'limited':
      return { failure: 'limited', value }
    case 'sent':
      redirect(`${changeEmailPaths.sent}?${new URLSearchParams({ ref: result.ref }).toString()}`)
  }
}

/**
 * Saves the switch "Naam in de standen". A form without JavaScript sends the box only when it
 * is on, so a missing box is off.
 */
export async function saveRankings(_previous: RankingsState, formData: FormData): Promise<RankingsState> {
  const { supporterId } = await requireSupporter({ from: signUpPaths.account })
  const on = formData.get(accountFields.inRankings) === 'aan'

  await setInRankings(getDatabase().db, supporterId, on)

  return { on, saved: true }
}

/** After a change of address: the message to the old address, and back to Mijn account. */
function changed(oldEmail: string): never {
  after(async () => {
    try {
      await sendEmailChangedMail(oldEmail)
    } catch (error) {
      // Not the address, and not the error itself: its message can quote the address.
      console.error(
        `Could not mail the old address about the change (${error instanceof Error ? error.name : 'unknown error'}).`,
      )
    }
  })
  redirect(`${signUpPaths.account}?melding=e-mailadres`)
}

function textOf(formData: FormData, name: string) {
  const value = formData.get(name)

  return typeof value === 'string' ? value : ''
}
