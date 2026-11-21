import type { Database } from '@fansite/db/client'

import { supporterEmailChanges, supporterLoginLinks, supporters, supporterSessions } from '@fansite/db/schema'
import { and, count, eq, gt, gte, isNotNull, ne } from 'drizzle-orm'
import { setTimeout as sleep } from 'node:timers/promises'

import { normaliseEmail } from '../beheer/accounts'
import { takeCode } from '../login/sessions'
import { codeHashOf, hashOf, newCode, newToken } from '../login/tokens'
import { noteMail, removeEndedChanges } from './log-in'
import { isDuplicate } from './sign-up'
import { supporterKind } from './supporter-login'

// Changing the address of the account of a supporter (issue 1452). The new address gets a link
// and a code; the address of the account changes only when one of them is used, by the
// supporter who asked, in a session of the account. Until then the old address logs in. The
// form answers the same for an address that has an account already: that request is a row
// whose link and code never work, and no mail goes out, so the form doesn't tell who has an
// account. After the change the old address gets one message.

/** The pages of changing the address. */
export const changeEmailPaths = {
  confirm: '/fans/mijn-account/e-mailadres/bevestigen',
  form: '/fans/mijn-account/e-mailadres',
  sent: '/fans/mijn-account/e-mailadres/verstuurd',
} as const

/** The most requests to change the address that one supporter makes in 15 minutes. */
export const changesPerWindow = 3

export type ChangeEmailDeps = {
  /** The clock in milliseconds that the work is timed with; only a test passes another one. */
  clock?: () => number
  /** Runs a task after the response is sent (`after` of Next.js). */
  defer: (task: () => Promise<void>) => void
  /** Hands the mail to the new address over, after the answer has gone out. */
  deliver: (mail: ChangeEmailMail) => Promise<void>
  /** Mails the editors that the ceiling of mails was reached, once a quarter of an hour. */
  notifyMailCeiling: () => Promise<void>
  now?: () => Date
  /** The address of the site in this environment. */
  origin: string
  /** Waits; only a test passes another one. */
  wait?: (milliseconds: number) => Promise<unknown>
}

/** The settings of the login of supporters, but a wrong code never removes a request. */
const keepRequestsKind = { ...supporterKind, codeFailuresEndLink: false }

/** What a request mails to the new address: the link and the code. */
export type ChangeEmailMail = { code: string; to: string; url: string }

/**
 * What a request leads to: an error of the field, a limit, or the page "Kijk in je mail", the
 * same for every new address. `sent` carries a random reference that the page keeps in its
 * form, so the code belongs to this request.
 */
export type ChangeEmailResult =
  { answer: 'invalid'; error: 'empty' | 'invalid' | 'same' } | { answer: 'limited' } | { answer: 'sent'; ref: string }

/**
 * What using the link or the code leads to: the change, with the old address to tell, or
 * nothing for a link or a code that doesn't work, whatever the reason.
 */
export type ChangeResult = { answer: 'changed'; oldEmail: string } | { answer: 'gone' }

/** A request, as the pages of changing the address need it. */
type Request = { email: string; id: number; supporterId: number }

/**
 * The new address of the request with `ref`, of this supporter, for the page that says where
 * the mail went, or `undefined` when the request is gone. It is the address the supporter
 * typed, also when it has an account already, so the page says the same for every address.
 */
export async function changeAddress(db: Database, supporterId: number, ref: string, now = new Date()) {
  if (ref === '') {
    return undefined
  }

  return (await findRequest(db, eq(supporterEmailChanges.refHash, hashOf(ref)), supporterId, now))?.email
}

/** How many tries the code of the request with `ref` has left, like `codeTriesLeft`. */
export async function changeCodeTriesLeft(db: Database, supporterId: number, ref: string, now = new Date()) {
  const [request] = await db
    .select({ failedAttempts: supporterEmailChanges.failedAttempts })
    .from(supporterEmailChanges)
    .where(
      and(
        eq(supporterEmailChanges.refHash, hashOf(ref)),
        eq(supporterEmailChanges.supporterId, supporterId),
        gt(supporterEmailChanges.expiresAt, now),
        isNotNull(supporterEmailChanges.codeHash),
      ),
    )

  return request === undefined ? 0 : Math.max(0, supporterKind.codeAttempts - request.failedAttempts)
}

/**
 * The request with this link, of this supporter, while it works: for the page the link opens,
 * which shows the new address. It is `undefined` for a link that is gone, expired, unknown or
 * of another account.
 */
export async function changeLinkState(db: Database, supporterId: number, token: string, now = new Date()) {
  return findRequest(db, eq(supporterEmailChanges.tokenHash, hashOf(token)), supporterId, now)
}

/**
 * Uses the code up, for the request with `ref` of the supporter who is logged in, and changes
 * the address. `sessionToken` is the session that stays; every other one of the account ends.
 */
export async function changeWithCode(
  db: Database,
  supporterId: number,
  sessionToken: string,
  ref: string,
  code: string,
  now = new Date(),
): Promise<ChangeResult> {
  await removeEndedChanges(db, now)

  // The last wrong code doesn't remove the request, as it does for a login: the row stays until
  // it expires, so it still counts in the limit of requests of the supporter. Its link and its
  // code stop instead.
  const request = await takeCode(db, keepRequestsKind, supporterEmailChanges, ref, code, now)

  if (request === undefined) {
    await db
      .update(supporterEmailChanges)
      .set({ codeHash: null, refHash: null, tokenHash: hashOf(newToken()) })
      .where(
        and(
          eq(supporterEmailChanges.refHash, hashOf(ref)),
          gte(supporterEmailChanges.failedAttempts, supporterKind.codeAttempts),
        ),
      )
  }

  return finish(db, request, supporterId, sessionToken)
}

/** Uses the link up, like `changeWithCode`. */
export async function changeWithLink(
  db: Database,
  supporterId: number,
  sessionToken: string,
  token: string,
  now = new Date(),
): Promise<ChangeResult> {
  await removeEndedChanges(db, now)

  const request = await findRequest(db, eq(supporterEmailChanges.tokenHash, hashOf(token)), supporterId, now)

  if (request === undefined) {
    return { answer: 'gone' }
  }

  const [deleted] = await db.delete(supporterEmailChanges).where(eq(supporterEmailChanges.id, request.id))

  return finish(db, deleted.affectedRows === 1 ? request : undefined, supporterId, sessionToken)
}

/**
 * Handles the form of a new address: checks it, the limit of the supporter, the limit of the
 * new address and the ceiling of the site, and makes the link and the code. The mail goes after
 * the answer, and the answer takes at least the minimum time of the login of supporters, so an
 * address with an account can't be told from one without.
 */
export async function handleChangeEmail(
  db: Database,
  supporterId: number,
  value: string,
  deps: ChangeEmailDeps,
): Promise<ChangeEmailResult> {
  const { clock = Date.now, defer, deliver, notifyMailCeiling, now = () => new Date(), origin, wait = sleep } = deps
  const started = clock()
  const result = await decide(db, supporterId, value, now(), origin)

  if (result.answer === 'ceiling' && result.first) {
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
        console.error(`Could not mail a link to change the address (${errorName(error)}).`)
      }
    })
  }

  await wait(Math.max(0, supporterKind.minimumAnswerMilliseconds - (clock() - started)))

  switch (result.answer) {
    case 'ceiling':
    case 'limited':
      return { answer: 'limited' }
    case 'invalid':
      return { answer: 'invalid', error: result.error }
    case 'sent':
      return { answer: 'sent', ref: result.ref }
  }
}

async function decide(db: Database, supporterId: number, value: string, now: Date, origin: string) {
  const email = normaliseEmail(value)

  if (value.trim() === '' || email === undefined) {
    return { answer: 'invalid' as const, error: value.trim() === '' ? ('empty' as const) : ('invalid' as const) }
  }

  const [own] = await db.select({ email: supporters.email }).from(supporters).where(eq(supporters.id, supporterId))

  if (own?.email === email) {
    return { answer: 'invalid' as const, error: 'same' as const }
  }

  await removeEndedChanges(db, now)

  // Every request is a row until it expires, so the rows count the requests of 15 minutes.
  const [asked] = await db
    .select({ total: count() })
    .from(supporterEmailChanges)
    .where(eq(supporterEmailChanges.supporterId, supporterId))

  if ((asked?.total ?? 0) >= changesPerWindow) {
    console.info(`Supporter ${supporterId} reached the limit of requests to change the address.`)

    return { answer: 'limited' as const }
  }

  const noted = await noteMail(db, email, now)

  if (noted.answer === 'address') {
    console.info(`A request of supporter ${supporterId} to change the address reached the limit of mails.`)

    return { answer: 'limited' as const }
  }

  if (noted.answer === 'ceiling') {
    return { answer: 'ceiling' as const, first: noted.first }
  }

  const [taken] = await db.select({ id: supporters.id }).from(supporters).where(eq(supporters.email, email))
  const ref = newToken()
  const token = newToken()
  const code = newCode()

  // One code at a time: an earlier request keeps its link, but its code stops.
  await db
    .update(supporterEmailChanges)
    .set({ codeHash: null, refHash: null })
    .where(eq(supporterEmailChanges.supporterId, supporterId))
  await db.insert(supporterEmailChanges).values({
    // For an address with an account, a hash of a value that is not 6 digits, which no code
    // matches, and a token that nobody gets.
    codeHash: codeHashOf(ref, taken === undefined ? code : 'none'),
    email,
    expiresAt: new Date(now.getTime() + supporterKind.linkLifetime),
    refHash: hashOf(ref),
    supporterId,
    tokenHash: hashOf(token),
  })
  console.info(`Supporter ${supporterId} asked to change the address.`)

  if (taken !== undefined) {
    return { answer: 'sent' as const, ref }
  }

  const url = new URL(changeEmailPaths.confirm, origin)

  url.searchParams.set('token', token)

  return { answer: 'sent' as const, mail: { code, to: email, url: url.href }, ref }
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : 'unknown error'
}

async function findRequest(
  db: Database,
  match: ReturnType<typeof eq>,
  supporterId: number,
  now: Date,
): Promise<Request | undefined> {
  const [request] = await db
    .select({
      email: supporterEmailChanges.email,
      id: supporterEmailChanges.id,
      supporterId: supporterEmailChanges.supporterId,
    })
    .from(supporterEmailChanges)
    .where(and(match, eq(supporterEmailChanges.supporterId, supporterId), gt(supporterEmailChanges.expiresAt, now)))

  return request
}

/**
 * Changes the address of a request that was just used up. Only a request of the supporter who
 * is logged in counts. The other requests of the account go, and so do its login links and its
 * sessions, apart from `sessionToken`: links to the old address no longer log in, and a session
 * elsewhere has to log in again.
 */
async function finish(
  db: Database,
  request: Request | undefined,
  supporterId: number,
  sessionToken: string,
): Promise<ChangeResult> {
  if (request === undefined || request.supporterId !== supporterId) {
    return { answer: 'gone' }
  }

  const [account] = await db.select({ email: supporters.email }).from(supporters).where(eq(supporters.id, supporterId))

  if (account === undefined) {
    return { answer: 'gone' }
  }

  try {
    await db.update(supporters).set({ email: request.email }).where(eq(supporters.id, supporterId))
  } catch (error) {
    // The address got an account in the meantime.
    if (isDuplicate(error)) {
      return { answer: 'gone' }
    }

    throw error
  }

  await db.delete(supporterEmailChanges).where(eq(supporterEmailChanges.supporterId, supporterId))
  await db.delete(supporterLoginLinks).where(eq(supporterLoginLinks.userId, supporterId))
  await db
    .delete(supporterSessions)
    .where(and(eq(supporterSessions.userId, supporterId), ne(supporterSessions.tokenHash, hashOf(sessionToken))))
  console.info(`Supporter ${supporterId} changed the address; the other sessions ended.`)

  return { answer: 'changed', oldEmail: account.email }
}
