import type { Database } from '@fansite/db/client'

import { and, count, eq, gt, isNotNull, lt } from 'drizzle-orm'
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
 * Notes one request for a login link in the rate limit, and says which limit it is over: too
 * many links for this address in the window, or for the whole site. A request within the
 * limits gives the number of its row. The request counts for every address, with an account or
 * not. A request over the limit is not kept, so a flood doesn't keep the window shut. It writes
 * the row first and counts after, so two requests at the same time can't both slip under the
 * limit.
 */
export async function checkAttempt(
  db: Database,
  kind: AccountKind,
  email: string,
  now: Date,
): Promise<{ answer: 'address' | 'site' } | { answer: 'within'; id: number }> {
  const { attempts } = kind.tables
  const { limits } = kind
  const since = new Date(now.getTime() - limits.windowMilliseconds)
  const addressHash = hashOf(email)

  // A row without an address is not of this limit (the ceiling of sign-ups of supporters), so
  // it is left alone and not counted.
  await db.delete(attempts).where(and(isNotNull(attempts.addressHash), lt(attempts.attemptedAt, since)))

  const [inserted] = await db.insert(attempts).values({ addressHash, attemptedAt: now })
  const [forAddress] = await db
    .select({ total: count() })
    .from(attempts)
    .where(and(eq(attempts.addressHash, addressHash), gt(attempts.attemptedAt, since)))
  const over =
    (forAddress?.total ?? 0) > limits.perAddress
      ? ('address' as const)
      : limits.perSite !== undefined && (await siteTotal(db, kind, since)) > limits.perSite
        ? ('site' as const)
        : undefined

  if (over !== undefined) {
    await db.delete(attempts).where(eq(attempts.id, inserted.insertId))

    return { answer: over }
  }

  return { answer: 'within', id: inserted.insertId }
}

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
 * Makes a login link for an account, with its code bound to `ref`, and gives what goes in the
 * mail: the code and the address of `page` with the token. One code at a time: an earlier link
 * keeps working, but its code doesn't, so asking again doesn't give somebody more tries at a
 * code.
 */
export async function issueLoginLink(
  db: Database,
  kind: AccountKind,
  userId: number,
  ref: string,
  now: Date,
  page: URL,
) {
  const { links } = kind.tables
  const token = newToken()
  const code = newCode()

  await db.update(links).set({ codeHash: null, refHash: null }).where(eq(links.userId, userId))
  await db.insert(links).values({
    codeHash: codeHashOf(ref, code),
    expiresAt: new Date(now.getTime() + kind.linkLifetime),
    refHash: hashOf(ref),
    tokenHash: hashOf(token),
    userId,
  })

  const url = new URL(page)

  url.searchParams.set('token', token)

  return { code, url: url.href }
}

/**
 * Notes one request for a login link in the rate limit, and says whether it is within the
 * limits: not when this address has had too many links in the window, or the whole site (see
 * `checkAttempt`).
 */
export async function noteAttempt(db: Database, kind: AccountKind, email: string, now: Date) {
  return (await checkAttempt(db, kind, email, now)).answer === 'within'
}

async function decide(
  db: Database,
  kind: AccountKind,
  value: string,
  now: Date,
  origin: string,
  rules: { normalise: (value: string) => string | undefined; path: string },
) {
  const { users } = kind.tables
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

  if (account === undefined || (account.disabledAt !== null && !kind.turnedOffLogsIn)) {
    return { answer: 'sent' as const, ref }
  }

  const mail = await issueLoginLink(db, kind, account.id, ref, now, new URL(rules.path, origin))

  return { answer: 'sent' as const, mail: { ...mail, to: email }, ref }
}

async function siteTotal(db: Database, kind: AccountKind, since: Date) {
  const { attempts } = kind.tables
  const [forSite] = await db
    .select({ total: count() })
    .from(attempts)
    .where(and(isNotNull(attempts.addressHash), gt(attempts.attemptedAt, since)))

  return forSite?.total ?? 0
}
