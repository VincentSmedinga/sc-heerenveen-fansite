import type { Database } from '@fansite/db/client'

import { and, count, eq, gt, gte, isNotNull } from 'drizzle-orm'
import { setTimeout as sleep } from 'node:timers/promises'

import { normaliseEmail } from '../beheer/accounts'
import { checkAttempt, issueLoginLink } from '../login/request'
import { removeEnded } from '../login/sessions'
import { hashOf, newToken } from '../login/tokens'
import { returnParameter } from './log-in-form'
import { supporterKind } from './supporter-login'

// Logging in as a supporter (issue 1448), with a link or a code by mail, like signing up and
// with the same shared code (`src/login`). The form answers the same for every address, with an
// account or without, blocked or not; only an address with an account gets a mail.

/** The pages of logging in, and where a supporter lands. */
export const logInPaths = {
  blocked: '/fans/geblokkeerd',
  confirm: '/fans/inloggen/bevestigen',
  form: '/fans/inloggen',
  home: '/fans',
  sent: '/fans/inloggen/verstuurd',
} as const

/** The most mails with a link and a code in a quarter of an hour of the clock, for the site. */
export const mailsPerQuarter = 60

const quarter = 15 * 60 * 1000

/** The pages a supporter is not sent back to: the way in itself. */
const wayIn = ['/fans/aanmelden', '/fans/inloggen']

export type LogInDeps = {
  /** The clock in milliseconds that the work is timed with; only a test passes another one. */
  clock?: () => number
  /** Runs a task after the response is sent (`after` of Next.js). */
  defer: (task: () => Promise<void>) => void
  /** Hands the mail over, after the answer has gone out. */
  deliver: (mail: LogInMail) => Promise<void>
  /** Mails the editors that the ceiling of mails was reached, once a quarter of an hour. */
  notifyCeiling: () => Promise<void>
  now?: () => Date
  /** The address of the site in this environment. */
  origin: string
  /** Waits; only a test passes another one. */
  wait?: (milliseconds: number) => Promise<unknown>
}

/** What logging in mails: the link and the code. */
export type LogInMail = { code: string; to: string; url: string }

/**
 * What a request to log in leads to: an error of the field, one of the two limits, or the page
 * "Kijk in je mail", the same for every address. `sent` carries a random reference that the
 * page keeps in its form, so the code belongs to this request.
 */
export type LogInResult =
  | { answer: 'ceiling' | 'limited' }
  | { answer: 'invalid'; error: 'empty' | 'invalid' }
  | { answer: 'sent'; ref: string }

/**
 * Handles the form of logging in: checks the address, the limit of the address and the ceiling
 * of the site, and makes the link and the code for an address with an account, blocked or not.
 * The link takes `returnTo` along. The mail goes after the answer, and the answer takes at
 * least the minimum time of the login of supporters, so no answer tells whether an address has
 * an account.
 */
export async function handleLogIn(
  db: Database,
  value: string,
  returnTo: string | undefined,
  deps: LogInDeps,
): Promise<LogInResult> {
  const { clock = Date.now, defer, deliver, notifyCeiling, now = () => new Date(), origin, wait = sleep } = deps
  const started = clock()
  const result = await decide(db, value, returnTo, now(), origin)

  if (result.answer === 'ceiling' && result.first) {
    defer(async () => {
      try {
        await notifyCeiling()
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
        console.error(`Could not mail a link to log in (${errorName(error)}).`)
      }
    })
  }

  await wait(Math.max(0, supporterKind.minimumAnswerMilliseconds - (clock() - started)))

  switch (result.answer) {
    case 'ceiling':
    case 'limited':
      return { answer: result.answer }
    case 'invalid':
      return { answer: 'invalid', error: result.error }
    case 'sent':
      return { answer: 'sent', ref: result.ref }
  }
}

/** Where a supporter goes after logging in: back, or to Fans, or to the page of a block. */
export async function landingOf(db: Database, supporterId: number, returnTo: string | undefined) {
  const { users } = supporterKind.tables
  const [account] = await db.select({ disabledAt: users.disabledAt }).from(users).where(eq(users.id, supporterId))

  return account?.disabledAt === null || account === undefined ? (returnTo ?? logInPaths.home) : logInPaths.blocked
}

/** What a link of the mail is now, without using it up: for the page the link opens. */
export async function logInLinkState(db: Database, token: string, now = new Date()) {
  const { links, users } = supporterKind.tables
  const [link] = await db
    .select({ screenName: users.screenName })
    .from(links)
    .innerJoin(users, eq(links.userId, users.id))
    .where(and(eq(links.tokenHash, hashOf(token)), gt(links.expiresAt, now)))

  return link === undefined ? { state: 'gone' as const } : { screenName: link.screenName, state: 'log-in' as const }
}

/**
 * Notes one mail with a link and a code, to sign up or to log in, and says whether it may go:
 * not when this address has had 3 in 15 minutes (the limit of `supporterKind`), and not when
 * the site has sent `mailsPerQuarter` in this quarter of an hour of the clock. The ceiling
 * holds until the quarter ends. The first request over it keeps its row, as the mark that the
 * editors have had their mail for this quarter; the ones after it are not kept.
 */
export async function noteMail(
  db: Database,
  email: string,
  now: Date,
): Promise<{ answer: 'address' } | { answer: 'ceiling'; first: boolean } | { answer: 'within' }> {
  const noted = await checkAttempt(db, supporterKind, email, now)

  if (noted.answer !== 'within') {
    return { answer: 'address' }
  }

  const { attempts } = supporterKind.tables
  const quarterStart = new Date(Math.floor(now.getTime() / quarter) * quarter)
  const [counted] = await db
    .select({ total: count() })
    .from(attempts)
    .where(and(isNotNull(attempts.addressHash), gte(attempts.attemptedAt, quarterStart)))
  const total = counted?.total ?? 0

  if (total <= mailsPerQuarter) {
    return { answer: 'within' }
  }

  if (total === mailsPerQuarter + 1) {
    console.info(`Mails to log in reached the ceiling of ${mailsPerQuarter} in 15 minutes; the editors get a mail.`)

    return { answer: 'ceiling', first: true }
  }

  await db.delete(attempts).where(eq(attempts.id, noted.id))

  return { answer: 'ceiling', first: false }
}

/**
 * The page to go back to after logging in, from the value in a form or an address: only a path
 * under /fans, not the way in itself, and `undefined` for anything else, so the site never
 * sends a supporter to another site or outside Fans.
 */
export function returnPathOf(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return undefined
  }

  const base = 'https://fansite.invalid'
  let url: URL

  try {
    url = new URL(value, base)
  } catch {
    return undefined
  }

  const under = (path: string) => url.pathname === path || url.pathname.startsWith(`${path}/`)

  if (url.origin !== base || !under('/fans') || wayIn.some(under)) {
    return undefined
  }

  return `${url.pathname}${url.search}`
}

async function decide(db: Database, value: string, returnTo: string | undefined, now: Date, origin: string) {
  const email = normaliseEmail(value)

  if (value.trim() === '' || email === undefined) {
    return { answer: 'invalid' as const, error: value.trim() === '' ? ('empty' as const) : ('invalid' as const) }
  }

  await removeEnded(db, supporterKind, now)

  const { users } = supporterKind.tables
  const [account] = await db.select({ id: users.id }).from(users).where(eq(users.email, email))
  const noted = await noteMail(db, email, now)

  if (noted.answer === 'address') {
    console.info(
      `A request to log in reached the limit of mails for one address${account === undefined ? '' : ` (supporter ${account.id})`}.`,
    )

    return { answer: 'limited' as const }
  }

  if (noted.answer === 'ceiling') {
    return { answer: 'ceiling' as const, first: noted.first }
  }

  const ref = newToken()

  if (account === undefined) {
    return { answer: 'sent' as const, ref }
  }

  const page = new URL(logInPaths.confirm, origin)

  if (returnTo !== undefined) {
    page.searchParams.set(returnParameter, returnTo)
  }

  const mail = await issueLoginLink(db, supporterKind, account.id, ref, now, page)

  return { answer: 'sent' as const, mail: { ...mail, to: email }, ref }
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : 'unknown error'
}
