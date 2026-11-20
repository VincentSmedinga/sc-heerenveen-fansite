import type { TestDatabase } from '@fansite/db/test-database'

import { adminSessions, adminUsers, supporters, supporterSessions } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { adminKind } from '../beheer/admin-login'
import { requireRole, sessionCookieName } from '../beheer/require-role'
import { cookieOptionsOf } from '../login/account-kind'
import { findSession, startSession } from '../login/sessions'
import { requireSupporter, supporterCookieName, supporterCookieOptions, supporterLoginPath } from './require-supporter'
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
