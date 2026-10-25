import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount, revokeAccount } from './accounts'
import { loginPath, requireRole, sessionCookieName, sessionCookieOptions, sessionToken } from './require-role'
import { absoluteLifetime, endSession, idleLifetime, startSession } from './sessions'

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
let userId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  jar.clear()
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'jelle@example.org', 'moderator')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
})

describe('requireRole', () => {
  it('sends a visitor without a cookie to the login page', async () => {
    await expect(requireRole('beheerder', 'moderator')).rejects.toMatchObject({ url: loginPath })
    expect(loginPath).toBe('/beheer/inloggen')
  })

  it('sends a visitor with an empty cookie or a token that was never made to the login page', async () => {
    jar.set(sessionCookieName, '')
    await expect(requireRole('moderator')).rejects.toMatchObject({ url: loginPath })

    jar.set(sessionCookieName, 'x'.repeat(43))
    await expect(requireRole('moderator')).rejects.toMatchObject({ url: loginPath })
  })

  it('lets in an account with an allowed role, and says who it is', async () => {
    jar.set(sessionCookieName, await startSession(database.db, userId))

    await expect(requireRole('beheerder', 'moderator')).resolves.toEqual({
      email: 'jelle@example.org',
      role: 'moderator',
      userId,
    })
  })

  it('answers as if the page is not there for an account with another role', async () => {
    jar.set(sessionCookieName, await startSession(database.db, userId))

    await expect(requireRole('beheerder')).rejects.toThrow('not found')
  })

  it('refuses a session that was ended by logging out, at once', async () => {
    const token = await startSession(database.db, userId)

    jar.set(sessionCookieName, token)
    await expect(requireRole('moderator')).resolves.toBeDefined()

    await endSession(database.db, token)

    await expect(requireRole('moderator')).rejects.toMatchObject({ url: loginPath })
  })

  it('refuses a session of an account that was revoked, at once', async () => {
    jar.set(sessionCookieName, await startSession(database.db, userId))
    await expect(requireRole('moderator')).resolves.toBeDefined()

    await revokeAccount(database.db, 'jelle@example.org')

    await expect(requireRole('moderator')).rejects.toMatchObject({ url: loginPath })
  })

  it('refuses a session that ended after 12 hours without a request or 7 days since it began', async () => {
    const now = Date.now()

    jar.set(sessionCookieName, await startSession(database.db, userId, new Date(now - idleLifetime - 1000)))
    await expect(requireRole('moderator')).rejects.toMatchObject({ url: loginPath })

    jar.set(sessionCookieName, await startSession(database.db, userId, new Date(now - absoluteLifetime - 1000)))
    await expect(requireRole('moderator')).rejects.toMatchObject({ url: loginPath })
  })
})

describe('sessionToken', () => {
  it('is the token in the cookie, or nothing', async () => {
    expect(await sessionToken()).toBeUndefined()

    jar.set(sessionCookieName, '')
    expect(await sessionToken()).toBeUndefined()

    jar.set(sessionCookieName, 'abc')
    expect(await sessionToken()).toBe('abc')
  })
})

describe('the cookie of the admin', () => {
  it('is HttpOnly, Secure and SameSite=Lax, only under /beheer, and lasts as long as a session can', () => {
    expect(sessionCookieOptions).toEqual({
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60,
      path: '/beheer',
      sameSite: 'lax',
      secure: true,
    })
  })

  it('has a name that says nothing about who is logged in', () => {
    expect(sessionCookieName).toBe('beheer-sessie')
  })
})
