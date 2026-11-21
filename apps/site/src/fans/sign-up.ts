import type { Database } from '@fansite/db/client'
import type { supporterLoginLinks } from '@fansite/db/schema'

import { supporters } from '@fansite/db/schema'
import { and, count, eq, gt, gte, isNotNull, isNull, lt } from 'drizzle-orm'
import { setTimeout as sleep } from 'node:timers/promises'

import type { ScreenNameProblem } from './screen-name'

import { normaliseEmail } from '../beheer/accounts'
import { issueLoginLink } from '../login/request'
import { removeEnded, startSession, startSessionIfOn, takeLink, takeLinkWithCode } from '../login/sessions'
import { codeHashOf, hashOf, newCode, newToken } from '../login/tokens'
import { endEarlierCodes, logInPaths, noteMail, removeEndedChanges } from './log-in'
import { checkScreenName } from './screen-name'
import { supporterKind } from './supporter-login'

// Signing up as a supporter (issue 1446). The account is made only when the address is
// confirmed: until then the sign-up is a row of `supporter_login_links` with the address and
// the screen name, which is removed 15 minutes later when nobody confirms it. The same form
// answers the same for an address that has an account already; that address gets the mail to
// log in instead, so the form doesn't tell who has an account.

/** The pages of signing up. */
export const signUpPaths = {
  account: '/fans/mijn-account',
  confirm: '/fans/aanmelden/bevestigen',
  form: '/fans/aanmelden',
  sent: '/fans/aanmelden/verstuurd',
} as const

/** The most sign-ups in one hour of the clock, for the whole site. */
export const signUpsPerHour = 30

const hour = 60 * 60 * 1000

/**
 * What using a link or a code leads to: a session (with the number of the account, and whether
 * it was just made), a screen name that another supporter confirmed in the meantime, or nothing
 * for a link or a code that doesn't work, whatever the reason.
 */
export type ConfirmResult =
  | { answer: 'gone' }
  | { answer: 'session'; created: boolean; supporterId: number; token: string }
  | { answer: 'taken'; screenName: string }

export type SignUpDeps = {
  /** The clock in milliseconds that the work is timed with; only a test passes another one. */
  clock?: () => number
  /** Runs a task after the response is sent (`after` of Next.js). */
  defer: (task: () => Promise<void>) => void
  /** Hands the mail over, after the answer has gone out. */
  deliver: (mail: SignUpMail) => Promise<void>
  /** Mails the editors that the ceiling of sign-ups was reached, once an hour. */
  notifyCeiling: () => Promise<void>
  /** Mails the editors that the ceiling of mails was reached, once a quarter of an hour. */
  notifyMailCeiling: () => Promise<void>
  now?: () => Date
  /** The address of the site in this environment. */
  origin: string
  /** Waits; only a test passes another one. */
  wait?: (milliseconds: number) => Promise<unknown>
}

/** The problems a field of the form can have. */
export type SignUpErrors = {
  email?: 'empty' | 'invalid'
  screenName?: ScreenNameProblem | { problem: 'taken' }
}

/** What a sign-up mails: a link and a code to confirm, or, for a known address, to log in. */
export type SignUpMail = { code: string; kind: 'log-in' | 'sign-up'; to: string; url: string }

/**
 * What a sign-up leads to: the errors of the fields, one of the two limits, or the page "Kijk
 * in je mail", the same for every address. `sent` carries a random reference that the page
 * keeps in its form, so the code belongs to this request.
 */
export type SignUpResult =
  { answer: 'ceiling' | 'limited' } | { answer: 'invalid'; errors: SignUpErrors } | { answer: 'sent'; ref: string }

type Link = typeof supporterLoginLinks.$inferSelect

/**
 * How many tries the code of the request with `ref` has left: 0 when it is used, has expired or
 * was tried too often, and for a reference nobody asked for.
 */
export async function codeTriesLeft(db: Database, ref: string, now = new Date()) {
  const { links } = supporterKind.tables
  const [link] = await db
    .select({ failedAttempts: links.failedAttempts })
    .from(links)
    .where(and(eq(links.refHash, hashOf(ref)), gt(links.expiresAt, now), isNotNull(links.codeHash)))

  return link === undefined ? 0 : Math.max(0, supporterKind.codeAttempts - link.failedAttempts)
}

/** Uses the code of the mail up, for the request with `ref`, like `confirmWithLink`. */
export async function confirmWithCode(db: Database, ref: string, code: string, now = new Date()) {
  return finish(db, await takeLinkWithCode(db, supporterKind, ref, code, now), now)
}

/** Uses the link of the mail up: makes the account of a sign-up, or logs in. */
export async function confirmWithLink(db: Database, token: string, now = new Date()): Promise<ConfirmResult> {
  return finish(db, await takeLink(db, supporterKind, token, now), now)
}

/**
 * Handles the form of signing up: checks the fields, the limit of the address and the ceiling
 * of the site, and makes the link and the code that confirm the address, or the link and the
 * code that log in for an address with an account. The mail goes after the answer, and the
 * answer takes at least the minimum time of the login of supporters, so the two can't be told
 * apart.
 */
export async function handleSignUp(
  db: Database,
  values: { email: string; screenName: string },
  deps: SignUpDeps,
): Promise<SignUpResult> {
  const {
    clock = Date.now,
    defer,
    deliver,
    notifyCeiling,
    notifyMailCeiling,
    now = () => new Date(),
    origin,
    wait = sleep,
  } = deps
  const started = clock()
  const at = now()
  const result = await decide(db, values, at, origin)

  if (result.answer === 'ceiling' && result.first) {
    console.info(`Sign-ups reached the ceiling of ${signUpsPerHour} an hour; the editors get a mail.`)
    defer(async () => {
      try {
        await notifyCeiling()
      } catch (error) {
        console.error(`Could not mail the editors about the sign-ups (${errorName(error)}).`)
      }
    })
  }

  if (result.answer === 'mail-ceiling' && result.first) {
    defer(async () => {
      try {
        await notifyMailCeiling()
      } catch (error) {
        console.error(`Could not mail the editors about the mails to log in (${errorName(error)}).`)
      }
    })
  }

  if (result.answer === 'sent' && result.mail !== undefined) {
    const { mail } = result

    defer(async () => {
      try {
        await deliver(mail)
      } catch (error) {
        // Not the address, and not the error itself: its message can quote the address.
        console.error(`Could not mail a link to sign up (${errorName(error)}).`)
      }
    })
  }

  await wait(Math.max(0, supporterKind.minimumAnswerMilliseconds - (clock() - started)))

  return result.answer === 'sent'
    ? { answer: 'sent', ref: result.ref }
    : result.answer === 'invalid'
      ? { answer: 'invalid', errors: result.errors }
      : { answer: result.answer === 'mail-ceiling' ? 'ceiling' : result.answer }
}

/** Whether the error is the database refusing a second row with the same unique value. */
export function isDuplicate(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const { cause, code, errno } = error as { cause?: unknown; code?: unknown; errno?: unknown }

  return code === 'ER_DUP_ENTRY' || errno === 1062 || isDuplicate(cause)
}

/**
 * Notes one sign-up for the ceiling of the whole site, and says whether it is within it: at
 * most `signUpsPerHour` in one hour of the clock. The row holds a time and no address, and goes
 * once its hour is over. The first sign-up over the ceiling keeps its row, as the mark that the
 * editors have had their mail for this hour; the ones after it are not kept.
 */
export async function noteSignUp(db: Database, now: Date): Promise<{ first: boolean; within: boolean }> {
  const { attempts } = supporterKind.tables
  const hourStart = new Date(Math.floor(now.getTime() / hour) * hour)

  await db.delete(attempts).where(and(isNull(attempts.addressHash), lt(attempts.attemptedAt, hourStart)))

  const [inserted] = await db.insert(attempts).values({ addressHash: null, attemptedAt: now })
  const [counted] = await db
    .select({ total: count() })
    .from(attempts)
    .where(and(isNull(attempts.addressHash), gte(attempts.attemptedAt, hourStart)))
  const total = counted?.total ?? 0

  if (total <= signUpsPerHour) {
    return { first: false, within: true }
  }

  if (total === signUpsPerHour + 1) {
    return { first: true, within: false }
  }

  await db.delete(attempts).where(eq(attempts.id, inserted.insertId))

  return { first: false, within: false }
}

/** What a link of the mail is now, without using it up: for the page the link opens. */
export async function signUpLinkState(db: Database, token: string, now = new Date()) {
  const { links } = supporterKind.tables
  const [link] = await db
    .select({ screenName: links.screenName, userId: links.userId })
    .from(links)
    .where(and(eq(links.tokenHash, hashOf(token)), gt(links.expiresAt, now)))

  if (link === undefined) {
    return { state: 'gone' as const }
  }

  if (link.userId === null) {
    return { screenName: link.screenName ?? '', state: 'sign-up' as const }
  }

  // A link to log in, which a sign-up mails to an address with an account: blocked or not, it
  // goes on to the page of logging in.
  return { state: 'log-in' as const }
}

async function decide(db: Database, values: { email: string; screenName: string }, now: Date, origin: string) {
  const errors = await fieldErrors(db, values)
  const email = normaliseEmail(values.email)
  const name = checkScreenName(values.screenName)

  if (errors.email !== undefined || errors.screenName !== undefined || email === undefined || name.problem) {
    return { answer: 'invalid' as const, errors }
  }

  await removeEnded(db, supporterKind, now)
  await removeEndedChanges(db, now)

  const noted = await noteMail(db, email, now)

  if (noted.answer === 'address') {
    console.info('A sign-up reached the limit of mails for one address.')

    return { answer: 'limited' as const }
  }

  if (noted.answer === 'ceiling') {
    return { answer: 'mail-ceiling' as const, first: noted.first }
  }

  const ceiling = await noteSignUp(db, now)

  if (!ceiling.within) {
    return { answer: 'ceiling' as const, first: ceiling.first }
  }

  const ref = newToken()
  const { links } = supporterKind.tables
  const [account] = await db.select({ id: supporters.id }).from(supporters).where(eq(supporters.email, email))

  if (account !== undefined) {
    console.info(`A sign-up came for the address of supporter ${account.id}; it gets the mail to log in.`)

    // A blocked account gets the mail too: it can log in, to see that it is blocked (#1448).
    const mail = await issueLoginLink(db, supporterKind, account.id, ref, now, new URL(logInPaths.confirm, origin))

    return { answer: 'sent' as const, mail: { ...mail, kind: 'log-in' as const, to: email }, ref }
  }

  const token = newToken()
  const code = newCode()

  // One code at a time, like a login link: an earlier sign-up or login of this address keeps
  // its link, but its code stops.
  await endEarlierCodes(db, email)
  await db.insert(links).values({
    codeHash: codeHashOf(ref, code),
    email,
    expiresAt: new Date(now.getTime() + supporterKind.linkLifetime),
    refHash: hashOf(ref),
    screenName: name.name,
    screenNameKey: name.key,
    tokenHash: hashOf(token),
  })
  console.info('A supporter signed up; the account is made when the address is confirmed.')

  const url = new URL(signUpPaths.confirm, origin)

  url.searchParams.set('token', token)

  return { answer: 'sent' as const, mail: { code, kind: 'sign-up' as const, to: email, url: url.href }, ref }
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : 'unknown error'
}

/** The problems of the two fields. A screen name of an account that exists is taken. */
async function fieldErrors(db: Database, values: { email: string; screenName: string }): Promise<SignUpErrors> {
  const errors: SignUpErrors = {}
  const name = checkScreenName(values.screenName)

  if (name.problem) {
    errors.screenName = name
  } else {
    const [taken] = await db
      .select({ id: supporters.id })
      .from(supporters)
      .where(eq(supporters.screenNameKey, name.key))

    if (taken !== undefined) {
      errors.screenName = { problem: 'taken' }
    }
  }

  if (values.email.trim() === '') {
    errors.email = 'empty'
  } else if (normaliseEmail(values.email) === undefined) {
    errors.email = 'invalid'
  }

  return errors
}

async function finish(db: Database, link: Link | undefined, now: Date): Promise<ConfirmResult> {
  if (link === undefined) {
    return { answer: 'gone' }
  }

  if (link.userId !== null) {
    return session(db, link.userId, now, false)
  }

  // A row without an address is the decoy of a login for an unknown address (see log-in.ts).
  if (!isFilled(link.email) || !isFilled(link.screenName) || !isFilled(link.screenNameKey)) {
    return { answer: 'gone' }
  }

  try {
    const [inserted] = await db
      .insert(supporters)
      .values({ createdAt: now, email: link.email, screenName: link.screenName, screenNameKey: link.screenNameKey })

    console.info(`Supporter ${inserted.insertId} confirmed the sign-up and is logged in.`)

    return {
      answer: 'session',
      created: true,
      supporterId: inserted.insertId,
      token: await startSession(db, supporterKind, inserted.insertId, now),
    }
  } catch (error) {
    if (!isDuplicate(error)) {
      throw error
    }
  }

  // The address or the name was confirmed in the meantime. The same address is the same
  // person, who signed up twice: the account is there, so this logs in. A name of somebody
  // else is taken, and the supporter chooses another.
  const [account] = await db.select({ id: supporters.id }).from(supporters).where(eq(supporters.email, link.email))

  return account === undefined ? { answer: 'taken', screenName: link.screenName } : session(db, account.id, now, false)
}

function isFilled(value: null | string): value is string {
  return value !== null && value !== ''
}

async function session(db: Database, supporterId: number, now: Date, created: boolean): Promise<ConfirmResult> {
  const token = await startSessionIfOn(db, supporterKind, supporterId, now)

  if (token === undefined) {
    return { answer: 'gone' }
  }

  console.info(`Supporter ${supporterId} logged in.`)

  return { answer: 'session', created, supporterId, token }
}
