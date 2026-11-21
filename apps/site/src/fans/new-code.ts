import type { Database } from '@fansite/db/client'

import { and, eq, gt } from 'drizzle-orm'

import type { SignUpDeps } from './sign-up'

import { issueLoginLink } from '../login/request'
import { removeEnded } from '../login/sessions'
import { codeHashOf, hashOf, newCode, newToken } from '../login/tokens'
import { logInPaths, noteMail } from './log-in'
import { signUpPaths } from './sign-up'
import { supporterKind } from './supporter-login'

// A new code on the page "Kijk in je mail" after signing up (issue 1496). The new mail takes
// the place of the earlier one: its link and its code stop working, and the page keeps its
// `ref`. The wait of a minute is kept here, on the server, so a page that skips its button
// can't ask for more mails.

/** How long after a mail the next one may be asked for. */
export const newCodeAfter = 60 * 1000

/**
 * What asking for a new code leads to: a new mail, the wait of a minute, one of the limits of
 * mails, or nothing to send a code for (the sign-up expired, was used, or never existed).
 */
export type NewCodeResult = { answer: 'gone' | 'limited' | 'sent' | 'wait' }

type Request = {
  email: string
  id: number
  screenName: null | string
  screenNameKey: null | string
  sentAt: Date
  userId: null | number
}

/**
 * Sends a new link and code for the request with `ref`, to the same address and, for a
 * sign-up, with the same screen name. It sends nothing earlier than a minute after the mail
 * before, and counts for the same limits as any other mail, of the address and of the whole
 * site. The old row goes first, so the old link and code stop and the new ones start their 15
 * minutes now.
 */
export async function handleNewCode(db: Database, ref: string, deps: SignUpDeps): Promise<NewCodeResult> {
  const { defer, deliver, notifyMailCeiling, now = () => new Date(), origin } = deps
  const at = now()

  await removeEnded(db, supporterKind, at)

  const found = await findRequest(db, ref, at)

  if (found === undefined) {
    return { answer: 'gone' }
  }

  if (at.getTime() < found.sentAt.getTime() + newCodeAfter) {
    return { answer: 'wait' }
  }

  const noted = await noteMail(db, found.email, at)

  if (noted.answer !== 'within') {
    if (noted.answer === 'ceiling' && noted.first) {
      defer(async () => {
        try {
          await notifyMailCeiling()
        } catch (error) {
          console.error(`Could not mail the editors about the mails to log in (${errorName(error)}).`)
        }
      })
    }

    return { answer: 'limited' }
  }

  const { links } = supporterKind.tables
  const [deleted] = await db.delete(links).where(eq(links.id, found.id))

  // Somebody asked at the same moment, and that request has the new mail.
  if (deleted.affectedRows !== 1) {
    return { answer: 'gone' }
  }

  const mail = await issue(db, found, ref, at, origin)

  defer(async () => {
    try {
      await deliver(mail)
    } catch (error) {
      // Not the address, and not the error itself: its message can quote the address.
      console.error(`Could not mail a new link and code (${errorName(error)}).`)
    }
  })

  return { answer: 'sent' }
}

/**
 * The address a sign-up was made for, from the request with `ref`, for the page that says where
 * the mail went. It is `undefined` for a request that is gone, expired or unknown, and for one
 * that holds no address: the decoy of a login. The address is never in the address of the page.
 */
export async function signUpAddress(db: Database, ref: string, now = new Date()) {
  const found = await findRequest(db, ref, now)

  return found?.email
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : 'unknown error'
}

/** The request with this reference, when it still works and holds an address to mail. */
async function findRequest(db: Database, ref: string, now: Date): Promise<Request | undefined> {
  const { links, users } = supporterKind.tables
  const [link] = await db
    .select({
      accountEmail: users.email,
      email: links.email,
      expiresAt: links.expiresAt,
      id: links.id,
      screenName: links.screenName,
      screenNameKey: links.screenNameKey,
      userId: links.userId,
    })
    .from(links)
    .leftJoin(users, eq(links.userId, users.id))
    .where(and(eq(links.refHash, hashOf(ref)), gt(links.expiresAt, now)))

  if (link === undefined || ref === '') {
    return undefined
  }

  // A request for an address with an account has the account, and one for a new address holds
  // it. The decoy of a login holds neither a screen name nor an address.
  const email = link.userId === null ? (link.screenName === null ? null : link.email) : link.accountEmail

  if (email === null || !email.includes('@')) {
    return undefined
  }

  return {
    email,
    id: link.id,
    screenName: link.screenName,
    screenNameKey: link.screenNameKey,
    sentAt: new Date(link.expiresAt.getTime() - supporterKind.linkLifetime),
    userId: link.userId,
  }
}

/** Makes the new link and code, and gives the mail: to log in for an account, or to confirm. */
async function issue(db: Database, found: Request, ref: string, now: Date, origin: string) {
  if (found.userId !== null) {
    const mail = await issueLoginLink(db, supporterKind, found.userId, ref, now, new URL(logInPaths.confirm, origin))

    return { ...mail, kind: 'log-in' as const, to: found.email }
  }

  const token = newToken()
  const code = newCode()
  const { links } = supporterKind.tables

  await db.insert(links).values({
    codeHash: codeHashOf(ref, code),
    email: found.email,
    expiresAt: new Date(now.getTime() + supporterKind.linkLifetime),
    refHash: hashOf(ref),
    screenName: found.screenName,
    screenNameKey: found.screenNameKey,
    tokenHash: hashOf(token),
  })

  const url = new URL(signUpPaths.confirm, origin)

  url.searchParams.set('token', token)

  return { code, kind: 'sign-up' as const, to: found.email, url: url.href }
}
