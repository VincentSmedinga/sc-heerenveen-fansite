import type { TestDatabase } from '@fansite/db/test-database'

import { adminLoginLinks, adminSessions, adminUsers } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createAccount, revokeAccount } from './accounts'
import {
  absoluteLifetime,
  endSession,
  findSession,
  hashOf,
  idleLifetime,
  linkLifetime,
  loginLinkWorks,
  newToken,
  redeemLoginLink,
  removeEnded,
  startSession,
} from './sessions'

const hour = 60 * 60 * 1000
const start = new Date('2026-10-26T10:00:00Z')

let database: TestDatabase
let userId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'jelle@example.org', 'beheerder', start)
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
})

/** Puts a login link in the table the way requesting one does, and returns its token. */
async function addLink(expiresAt = new Date(start.getTime() + linkLifetime)) {
  const token = newToken()

  await database.db.insert(adminLoginLinks).values({ expiresAt, tokenHash: hashOf(token), userId })

  return token
}

describe('the lifetimes', () => {
  it('are 15 minutes for a link, 12 hours without a request and 7 days at most for a session', () => {
    expect(linkLifetime).toBe(15 * 60 * 1000)
    expect(idleLifetime).toBe(12 * hour)
    expect(absoluteLifetime).toBe(7 * 24 * hour)
  })
})

describe('tokens', () => {
  it('are 256 random bits in base64url, and never the same twice', () => {
    const tokens = new Set(Array.from({ length: 50 }, newToken))

    expect(tokens.size).toBe(50)
    expect([...tokens].every((token) => /^[\w-]{43}$/.test(token))).toBe(true)
  })

  it('are kept as a SHA-256, so the database holds neither a link nor a session token', async () => {
    const link = await addLink()
    const session = await startSession(database.db, userId, start)
    const stored = JSON.stringify([
      ...(await database.db.select().from(adminLoginLinks)),
      ...(await database.db.select().from(adminSessions)),
    ])

    expect(stored).not.toContain(link)
    expect(stored).not.toContain(session)
    expect(stored).toContain(hashOf(link))
    expect(stored).toContain(hashOf(session))
  })
})

describe('a login link', () => {
  it('logs in once: a second use is refused', async () => {
    const link = await addLink()

    expect(await redeemLoginLink(database.db, link, start)).toEqual(expect.any(String))
    expect(await redeemLoginLink(database.db, link, start)).toBeUndefined()
  })

  it('logs in only once when two requests use it at the same time', async () => {
    const link = await addLink()
    const results = await Promise.all(Array.from({ length: 5 }, () => redeemLoginLink(database.db, link, start)))

    expect(results.filter((result) => result !== undefined)).toHaveLength(1)
    expect(await database.db.select().from(adminSessions)).toHaveLength(1)
  })

  it('works until 15 minutes after it was made, and not at 15 minutes', async () => {
    const link = await addLink()

    expect(await loginLinkWorks(database.db, link, new Date(start.getTime() + linkLifetime - 1))).toBe(true)
    expect(await loginLinkWorks(database.db, link, new Date(start.getTime() + linkLifetime))).toBe(false)
    expect(await redeemLoginLink(database.db, link, new Date(start.getTime() + linkLifetime))).toBeUndefined()
  })

  it('is not used up by looking at it, so a mail scanner that opens the link does not spoil it', async () => {
    const link = await addLink()

    expect(await loginLinkWorks(database.db, link, start)).toBe(true)
    expect(await loginLinkWorks(database.db, link, start)).toBe(true)
    expect(await redeemLoginLink(database.db, link, start)).toEqual(expect.any(String))
  })

  it('does not work for a token that was never made', async () => {
    expect(await loginLinkWorks(database.db, newToken(), start)).toBe(false)
    expect(await redeemLoginLink(database.db, newToken(), start)).toBeUndefined()
    expect(await redeemLoginLink(database.db, '', start)).toBeUndefined()
  })

  it('does not work for an account that has been turned off since', async () => {
    const link = await addLink()

    await database.db.update(adminUsers).set({ disabledAt: start })

    expect(await loginLinkWorks(database.db, link, start)).toBe(false)
    expect(await redeemLoginLink(database.db, link, start)).toBeUndefined()
    expect(await database.db.select().from(adminSessions)).toEqual([])
  })
})

describe('a session', () => {
  it('belongs to the account that logged in, with its role', async () => {
    const token = await startSession(database.db, userId, start)

    expect(await findSession(database.db, token, start)).toEqual({
      email: 'jelle@example.org',
      role: 'beheerder',
      userId,
    })
  })

  it('is not found for a token that was never made', async () => {
    expect(await findSession(database.db, newToken(), start)).toBeUndefined()
    expect(await findSession(database.db, '', start)).toBeUndefined()
  })

  it('ends after 12 hours without a request, and not before', async () => {
    const token = await startSession(database.db, userId, start)

    expect(await findSession(database.db, token, new Date(start.getTime() + idleLifetime - 1))).toBeDefined()
  })

  it('ends at 12 hours without a request', async () => {
    const token = await startSession(database.db, userId, start)

    expect(await findSession(database.db, token, new Date(start.getTime() + idleLifetime))).toBeUndefined()
    // Gone for good, also when somebody comes back with a clock that is set back.
    expect(await findSession(database.db, token, start)).toBeUndefined()
    expect(await database.db.select().from(adminSessions)).toEqual([])
  })

  it('stays open as long as a request comes within 12 hours', async () => {
    const token = await startSession(database.db, userId, start)
    let now = start

    for (let request = 0; request < 10; request++) {
      now = new Date(now.getTime() + 11 * hour)

      expect(await findSession(database.db, token, now), `at ${now.toISOString()}`).toBeDefined()
    }
  })

  it('ends 7 days after it began, however often it was used', async () => {
    const token = await startSession(database.db, userId, start)
    let now = start

    // Every 11 hours: the idle limit is never reached, the absolute limit is.
    while (now.getTime() - start.getTime() + 11 * hour < absoluteLifetime) {
      now = new Date(now.getTime() + 11 * hour)

      expect(await findSession(database.db, token, now)).toBeDefined()
    }

    expect(await findSession(database.db, token, new Date(start.getTime() + absoluteLifetime - 1))).toBeDefined()
    expect(await findSession(database.db, token, new Date(start.getTime() + absoluteLifetime))).toBeUndefined()
  })

  it('stops working when the user logs out, and only that session', async () => {
    const first = await startSession(database.db, userId, start)
    const second = await startSession(database.db, userId, start)

    await endSession(database.db, first)

    expect(await findSession(database.db, first, start)).toBeUndefined()
    expect(await findSession(database.db, second, start)).toBeDefined()
  })

  it('stops working at once when the account is revoked, and so do its unused links', async () => {
    const first = await startSession(database.db, userId, start)
    const second = await startSession(database.db, userId, start)
    const link = await addLink()

    expect(await revokeAccount(database.db, 'jelle@example.org', start)).toEqual({ result: 'revoked', sessions: 2 })

    expect(await findSession(database.db, first, start)).toBeUndefined()
    expect(await findSession(database.db, second, start)).toBeUndefined()
    expect(await redeemLoginLink(database.db, link, start)).toBeUndefined()
    expect(await database.db.select().from(adminLoginLinks)).toEqual([])
  })

  it('stops working when the account is turned off while the session row is still there', async () => {
    const token = await startSession(database.db, userId, start)

    await database.db.update(adminUsers).set({ disabledAt: start }).where(eq(adminUsers.id, userId))

    expect(await findSession(database.db, token, start)).toBeUndefined()
  })
})

describe('removeEnded', () => {
  it('removes the links and the sessions that have ended and keeps the others', async () => {
    const stale = await addLink(new Date(start.getTime() - 1))
    const fresh = await addLink()
    const idle = await startSession(database.db, userId, new Date(start.getTime() - idleLifetime))
    const old = await startSession(database.db, userId, new Date(start.getTime() - absoluteLifetime))
    const open = await startSession(database.db, userId, start)

    await removeEnded(database.db, start)

    expect(await database.db.select({ hash: adminLoginLinks.tokenHash }).from(adminLoginLinks)).toEqual([
      { hash: hashOf(fresh) },
    ])
    expect(await database.db.select({ hash: adminSessions.tokenHash }).from(adminSessions)).toEqual([
      { hash: hashOf(open) },
    ])
    expect([stale, idle, old]).toHaveLength(3)
  })
})
