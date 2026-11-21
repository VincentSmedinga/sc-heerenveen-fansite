import type { TestDatabase } from '@fansite/db/test-database'

import { adminSessions, adminUsers, supporters, supporterSessions } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { adminKind } from '../beheer/admin-login'
import { requireRole, sessionCookieName } from '../beheer/require-role'
import { cookieOptionsOf } from '../login/account-kind'
import { findSession, removeEnded, startSession } from '../login/sessions'
import {
  currentSupporter,
  requireSupporter,
  supporterCookieName,
  supporterCookieOptions,
  supporterLoginPath,
} from './require-supporter'
import { supporterKind } from './supporter-login'

// The settings of supporters in the shared code of the login, and the wall between them and the
// admin: a session of a supporter is never in the tables of the admin, and is never let in by
// requireRole, whichever cookie it is put in.

const { jar } = vi.hoisted(() => ({ jar: new Map<string, string>() }))

class Redirect extends Error {
  readonly url: string

  constructor(url: string) {
    super(`redirect to ${url}`)
    this.url = url
  }
}

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({ get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined) }),
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
  redirect: (url: string) => {
    throw new Redirect(url)
  },
}))
vi.mock('../database', () => ({ getDatabase: () => database }))

let database: TestDatabase
let supporterId: number
let adminId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  jar.clear()
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  await database.db.delete(supporters)
  await database.db.delete(adminUsers)

  // The same number and the same address in both tables: a mix-up of the tables would show.
  const [admin] = await database.db.insert(adminUsers).values({ email: 'tjalle@example.org', role: 'owner' })
  const [supporter] = await database.db
    .insert(supporters)
    .values({ email: 'tjalle@example.org', id: admin.insertId, screenName: 'Tjalle99', screenNameKey: 'tjalle99' })

  adminId = admin.insertId
  supporterId = supporter.insertId
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('the settings of supporters', () => {
  it('make the cookie fans-sessie, only under /fans, HttpOnly, Secure and SameSite=Lax', () => {
    expect(supporterCookieOptions).toEqual({
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60,
      path: '/fans',
      sameSite: 'lax',
      secure: true,
    })
    expect(supporterCookieName).toBe('fans-sessie')
  })

  it('give links of 15 minutes, 5 codes that end the link, and 3 mails an address in 15 minutes', () => {
    expect(supporterKind).toMatchObject({
      codeAttempts: 5,
      codeFailuresEndLink: true,
      limits: { perAddress: 3, windowMilliseconds: 15 * 60 * 1000 },
      linkLifetime: 15 * 60 * 1000,
    })
    expect(cookieOptionsOf(adminKind).path).toBe('/beheer')
  })
})

describe('a session of a supporter', () => {
  it('lands in supporter_sessions and never in admin_sessions', async () => {
    const token = await startSession(database.db, supporterKind, supporterId)

    expect(supporterId).toBe(adminId)
    expect(await database.db.select().from(supporterSessions)).toHaveLength(1)
    expect(await database.db.select().from(adminSessions)).toEqual([])
    expect(await findSession(database.db, adminKind, token)).toBeUndefined()
    expect(await findSession(database.db, supporterKind, token)).toMatchObject({ screenName: 'Tjalle99' })
  })

  it('never passes requireRole, in the cookie of the admin either', async () => {
    const token = await startSession(database.db, supporterKind, supporterId)

    jar.set(supporterCookieName, token)
    await expect(requireRole('owner')).rejects.toMatchObject({ url: '/beheer/inloggen' })

    jar.set(sessionCookieName, token)
    await expect(requireRole('owner', 'editor', 'author')).rejects.toMatchObject({ url: '/beheer/inloggen' })
  })

  it('passes requireSupporter, and a session of the admin does not', async () => {
    const token = await startSession(database.db, supporterKind, supporterId)

    jar.set(supporterCookieName, token)
    await expect(requireSupporter()).resolves.toEqual({
      blocked: false,
      email: 'tjalle@example.org',
      screenName: 'Tjalle99',
      supporterId,
    })

    jar.set(supporterCookieName, await startSession(database.db, adminKind, adminId))
    await expect(requireSupporter()).rejects.toMatchObject({ url: supporterLoginPath })
  })

  it('answers not found while accounts are off, before it looks at the cookie', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'off')
    jar.set(supporterCookieName, await startSession(database.db, supporterKind, supporterId))

    await expect(requireSupporter()).rejects.toThrow('not found')
  })
})

describe('the length of a session of a supporter', () => {
  const day = 24 * 60 * 60 * 1000
  const start = new Date('2026-11-21T10:00:00Z')
  const onDay = (days: number) => new Date(start.getTime() + days * day)

  it('still works on day 89 without a visit, and no longer on day 91', async () => {
    const token = await startSession(database.db, supporterKind, supporterId, start)

    expect(await findSession(database.db, supporterKind, token, onDay(89))).toBeDefined()

    const other = await startSession(database.db, supporterKind, supporterId, start)

    expect(await findSession(database.db, supporterKind, other, onDay(91))).toBeUndefined()
  })

  it('moves the 90 days on with each visit, but ends a year after logging in', async () => {
    const token = await startSession(database.db, supporterKind, supporterId, start)

    for (let days = 60; days < 365; days += 60) {
      expect(await findSession(database.db, supporterKind, token, onDay(days))).toBeDefined()
    }

    expect(await findSession(database.db, supporterKind, token, onDay(364))).toBeDefined()
    expect(await findSession(database.db, supporterKind, token, onDay(365))).toBeUndefined()
  })

  it('writes the visit at most once a day', async () => {
    const token = await startSession(database.db, supporterKind, supporterId, start)

    await findSession(database.db, supporterKind, token, new Date(start.getTime() + 23 * 60 * 60 * 1000))

    const [same] = await database.db.select().from(supporterSessions)

    expect(same?.lastSeenAt).toEqual(start)

    await findSession(database.db, supporterKind, token, onDay(1))

    const [next] = await database.db.select().from(supporterSessions)

    expect(next?.lastSeenAt).toEqual(onDay(1))
  })

  it('keeps the day of the last visit of the account, and not the time', async () => {
    jar.set(supporterCookieName, await startSession(database.db, supporterKind, supporterId, start))

    await currentSupporter(new Date('2026-11-22T23:30:00Z'))

    const [row] = await database.db.select().from(supporters).where(eq(supporters.id, supporterId))

    expect(row?.lastVisitOn).toBe('2026-11-22')
  })

  it('takes back the mail about an unused account, so a new term of 24 months starts', async () => {
    await database.db
      .update(supporters)
      .set({ lastVisitOn: '2024-01-01', unusedMailSentAt: new Date('2026-11-01T10:00:00Z') })
      .where(eq(supporters.id, supporterId))
    jar.set(supporterCookieName, await startSession(database.db, supporterKind, supporterId, start))

    await currentSupporter(new Date('2026-11-22T10:00:00Z'))

    const [row] = await database.db.select().from(supporters).where(eq(supporters.id, supporterId))

    expect(row?.unusedMailSentAt).toBeNull()
    expect(row?.lastVisitOn).toBe('2026-11-22')
  })

  it('is removed with the sessions that ended, at a later request', async () => {
    await startSession(database.db, supporterKind, supporterId, start)
    await removeEnded(database.db, supporterKind, onDay(91))

    expect(await database.db.select().from(supporterSessions)).toEqual([])
  })
})

describe('a blocked supporter', () => {
  beforeEach(async () => {
    await database.db.update(supporters).set({ disabledAt: new Date(), disabledReason: 'Test' })
    jar.set(supporterCookieName, await startSession(database.db, supporterKind, supporterId))
  })

  it('keeps the session, and is sent to the page of the block', async () => {
    await expect(requireSupporter()).rejects.toMatchObject({ url: '/fans/geblokkeerd' })
  })

  it('reaches a page that allows it, such as Mijn account', async () => {
    await expect(requireSupporter({ blocked: 'allow' })).resolves.toMatchObject({ blocked: true, supporterId })
  })
})

describe('a page that needs an account', () => {
  it('sends a visitor without a session to log in, with the page to come back to', async () => {
    await expect(requireSupporter({ from: '/fans/mijn-account' })).rejects.toMatchObject({
      url: '/fans/inloggen?terug=%2Ffans%2Fmijn-account',
    })
    await expect(requireSupporter({ from: 'https://example.com/fans' })).rejects.toMatchObject({
      url: '/fans/inloggen',
    })
  })
})
