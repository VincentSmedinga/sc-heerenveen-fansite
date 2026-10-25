import type { Database } from '@fansite/db/client'

import { adminLoginAttempts, adminLoginLinks, adminUsers } from '@fansite/db/schema'
import { and, count, eq, gt, lt } from 'drizzle-orm'
import { setTimeout as sleep } from 'node:timers/promises'

import { normaliseEmail } from './accounts'
import { hashOf, linkLifetime, newToken, removeEnded } from './sessions'

/** The rate limit: so many login links per address, and for the whole site, in one window. */
export const loginLimits = { perAddress: 5, perSite: 30, windowMilliseconds: 15 * 60 * 1000 }

/**
 * The answer to a request for a login link takes at least this long, so an address with an account (a row to write, a mail
 * to hand over) can't be told from one without by how long the answer takes.
 */
export const minimumAnswerMilliseconds = 400

/** A login link to mail: where to, and the address of the page that logs in. */
export type LoginMail = { to: string; url: string }

export type LoginRequestDeps = {
  /** Runs a task after the response is sent (`after` of Next.js). */
  defer: (task: () => Promise<void>) => void
  /** Hands the mail over, after the answer has gone out. */
  deliver: (mail: LoginMail) => Promise<void>
  now?: () => Date
  /** The address of the site in this environment. */
  origin: string
  /** Waits; only a test passes another one. */
  wait?: (milliseconds: number) => Promise<unknown>
}

/** What a request for a login link leads to: the same page for every address with a good form, whether it has an account or not. */
export type LoginRequestResult = 'invalid' | 'limited' | 'sent'

/**
 * Handles a request for a login link: checks the address, the rate limit, and whether the address has an account that is
 * on. Only then it makes a link and hands it to `defer`, to mail after the answer. The answer is `sent` for an address
 * without an account too, takes at least `minimumAnswerMilliseconds`, and nothing in it tells the two apart.
 */
export async function handleLoginRequest(
  db: Database,
  value: string,
  deps: LoginRequestDeps,
): Promise<LoginRequestResult> {
  const { defer, deliver, now = () => new Date(), origin, wait = sleep } = deps
  const started = Date.now()
  const result = await decide(db, value, now(), origin)

  if (result.mail !== undefined) {
    const { mail } = result

    defer(async () => {
      try {
        await deliver(mail)
      } catch (error) {
        // Not the address, and not the error itself: its message can quote the address.
        console.error(`Could not mail a login link (${error instanceof Error ? error.name : 'unknown error'}).`)
      }
    })
  }

  await wait(Math.max(0, minimumAnswerMilliseconds - (Date.now() - started)))

  return result.answer
}

/**
 * Notes one request for a login link in the rate limit, and says whether it is within the limits: `limited` when this
 * address has had 5 links in the last 15 minutes, or the whole site 30. The request counts for every address, with an
 * account or not. A request over the limit is not kept, so a flood doesn't keep the window shut. It writes the row
 * first and counts after, so two requests at the same time can't both slip under the limit.
 */
export async function noteAttempt(db: Database, email: string, now: Date) {
  const since = new Date(now.getTime() - loginLimits.windowMilliseconds)
  const addressHash = hashOf(email)

  await db.delete(adminLoginAttempts).where(lt(adminLoginAttempts.attemptedAt, since))

  const [inserted] = await db.insert(adminLoginAttempts).values({ addressHash, attemptedAt: now })
  const [forAddress] = await db
    .select({ total: count() })
    .from(adminLoginAttempts)
    .where(and(eq(adminLoginAttempts.addressHash, addressHash), gt(adminLoginAttempts.attemptedAt, since)))
  const [forSite] = await db
    .select({ total: count() })
    .from(adminLoginAttempts)
    .where(gt(adminLoginAttempts.attemptedAt, since))

  if ((forAddress?.total ?? 0) > loginLimits.perAddress || (forSite?.total ?? 0) > loginLimits.perSite) {
    await db.delete(adminLoginAttempts).where(eq(adminLoginAttempts.id, inserted.insertId))

    return false
  }

  return true
}

async function decide(db: Database, value: string, now: Date, origin: string) {
  const email = normaliseEmail(value)

  if (email === undefined) {
    return { answer: 'invalid' as const }
  }

  await removeEnded(db, now)

  if (!(await noteAttempt(db, email, now))) {
    return { answer: 'limited' as const }
  }

  const [account] = await db.select().from(adminUsers).where(eq(adminUsers.email, email))

  if (account === undefined || account.disabledAt !== null) {
    return { answer: 'sent' as const }
  }

  const token = newToken()

  await db
    .insert(adminLoginLinks)
    .values({ expiresAt: new Date(now.getTime() + linkLifetime), tokenHash: hashOf(token), userId: account.id })

  const url = new URL('/beheer/inloggen/bevestigen', origin)

  url.searchParams.set('token', token)

  return { answer: 'sent' as const, mail: { to: email, url: url.href } }
}
