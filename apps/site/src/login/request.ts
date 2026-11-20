import type { Database } from '@fansite/db/client'

import { and, count, eq, gt, lt } from 'drizzle-orm'
import { setTimeout as sleep } from 'node:timers/promises'

import type { AccountKind } from './account-kind'

import { removeEnded } from './sessions'
import { codeHashOf, hashOf, newCode, newToken } from './tokens'

/** A login link to mail: where to, the address of the page that logs in, and the code. */
export type LoginMail = { code: string; to: string; url: string }

export type LoginRequestDeps = {
  /** The clock in milliseconds that the work is timed with; only a test passes another one. */
  clock?: () => number
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

/**
 * What a request for a login link leads to: the same page for every address with a good
 * form, whether it has an account or not. `sent` carries a random reference that the page
 * "verstuurd" keeps in its form, so the code belongs to this request; an address without
 * an account gets one too, which leads nowhere.
 */
export type LoginRequestResult = { answer: 'invalid' | 'limited' } | { answer: 'sent'; ref: string }

/**
 * Handles a request for a login link: checks the address, the rate limit, and whether the
 * address has an account that is on. Only then it makes a link and hands it to `defer`, to mail
 * after the answer. The answer is `sent` for an address without an account too, takes at least
 * `minimumAnswerMilliseconds` of the kind, and nothing in it tells the two apart.
 *
 * `normalise` makes an address of the value that was typed, or `undefined` for one that isn't
 * an address, and `path` is the page that the link opens.
 */
export async function handleLoginRequest(
  db: Database,
  kind: AccountKind,
  value: string,
  deps: LoginRequestDeps,
  rules: { normalise: (value: string) => string | undefined; path: string },
): Promise<LoginRequestResult> {
  const { clock = Date.now, defer, deliver, now = () => new Date(), origin, wait = sleep } = deps
  const started = clock()
  const result = await decide(db, kind, value, now(), origin, rules)

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

  await wait(Math.max(0, kind.minimumAnswerMilliseconds - (clock() - started)))

  return result.answer === 'sent' ? { answer: 'sent', ref: result.ref } : { answer: result.answer }
}

/**
 * Notes one request for a login link in the rate limit, and says whether it is within the
 * limits: not when this address has had too many links in the window, or the whole site. The
 * request counts for every address, with an account or not. A request over the limit is
 * not kept, so a flood doesn't keep the window shut. It writes the row first and counts after,
 * so two requests at the same time can't both slip under the limit.
 */
export async function noteAttempt(db: Database, kind: AccountKind, email: string, now: Date) {
  const { attempts } = kind.tables
  const { limits } = kind
  const since = new Date(now.getTime() - limits.windowMilliseconds)
  const addressHash = hashOf(email)

  await db.delete(attempts).where(lt(attempts.attemptedAt, since))

  const [inserted] = await db.insert(attempts).values({ addressHash, attemptedAt: now })
  const [forAddress] = await db
    .select({ total: count() })
    .from(attempts)
    .where(and(eq(attempts.addressHash, addressHash), gt(attempts.attemptedAt, since)))
  const [forSite] = await db.select({ total: count() }).from(attempts).where(gt(attempts.attemptedAt, since))

  if ((forAddress?.total ?? 0) > limits.perAddress || (forSite?.total ?? 0) > limits.perSite) {
    await db.delete(attempts).where(eq(attempts.id, inserted.insertId))

    return false
  }

  return true
}

async function decide(
  db: Database,
  kind: AccountKind,
  value: string,
  now: Date,
  origin: string,
  rules: { normalise: (value: string) => string | undefined; path: string },
) {
  const { links, users } = kind.tables
  const email = rules.normalise(value)

  if (email === undefined) {
    return { answer: 'invalid' as const }
  }

  await removeEnded(db, kind, now)

  if (!(await noteAttempt(db, kind, email, now))) {
    return { answer: 'limited' as const }
  }

  const [account] = await db.select().from(users).where(eq(users.email, email))

  const ref = newToken()

  if (account === undefined || account.disabledAt !== null) {
    return { answer: 'sent' as const, ref }
  }

  const token = newToken()
  const code = newCode()

  // One code at a time: an earlier link keeps working, but its code doesn't, so asking again
  // doesn't give somebody more tries at a code.
  await db.update(links).set({ codeHash: null, refHash: null }).where(eq(links.userId, account.id))
  await db.insert(links).values({
    codeHash: codeHashOf(ref, code),
    expiresAt: new Date(now.getTime() + kind.linkLifetime),
    refHash: hashOf(ref),
    tokenHash: hashOf(token),
    userId: account.id,
  })

  const url = new URL(rules.path, origin)

  url.searchParams.set('token', token)

  return { answer: 'sent' as const, mail: { code, to: email, url: url.href }, ref }
}
