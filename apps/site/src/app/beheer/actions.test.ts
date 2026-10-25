import type { TestDatabase } from '@fansite/db/test-database'

import { adminLoginAttempts, adminLoginLinks, adminSessions, adminUsers } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '../../beheer/accounts'
import { sessionCookieName, sessionCookieOptions } from '../../beheer/require-role'
import { hashOf } from '../../beheer/sessions'
import { logOut } from './actions'
import { logIn, requestLoginLink } from './inloggen/actions'

const { deferred, jar, sent, set } = vi.hoisted(() => ({
  deferred: [] as (() => Promise<void>)[],
  jar: new Map<string, string>(),
  sent: [] as { to: string; url: string }[],
  set: vi.fn(),
}))

class Redirect extends Error {
  readonly url: string

  constructor(url: string) {
    super(`redirect to ${url}`)
    this.url = url
  }
}

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
      set: (name: string, value: string, options: unknown) => {
        set(name, value, options)
        jar.set(name, value)
      },
    }),
}))
// The answer waits at least 400 milliseconds (see handleLoginRequest); the tests don't.
vi.mock('node:timers/promises', () => ({ setTimeout: () => Promise.resolve() }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
  redirect: (url: string) => {
    throw new Redirect(url)
  },
}))
vi.mock('next/server', () => ({ after: (task: () => Promise<void>) => deferred.push(task) }))
vi.mock('../../beheer/login-mail', () => ({
  sendLoginMail: (mail: { to: string; url: string }) => {
    sent.push(mail)

    return Promise.resolve()
  },
}))
vi.mock('../../database', () => ({ getDatabase: () => database }))

let database: TestDatabase

beforeAll(async () => {
  vi.stubEnv('SITE_ENV', 'acceptance')
  database = await createTestDatabase()
})

afterAll(async () => {
  vi.unstubAllEnvs()
  await database?.drop()
})

beforeEach(async () => {
  jar.clear()
  sent.length = 0
  deferred.length = 0
  set.mockClear()
  await database.db.delete(adminLoginAttempts)
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'jelle@example.org', 'beheerder')
})

/** Calls an action with a form and returns where it redirected to. */
async function redirectOf(action: (formData: FormData) => Promise<void>, fields: Record<string, string>) {
  const formData = new FormData()

  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value)
  }

  try {
    await action(formData)
  } catch (error) {
    if (error instanceof Redirect) {
      return error.url
    }

    throw error
  }

  return undefined
}

/** The token of the link in the one mail that was sent. */
const linkToken = () => new URL(sent[0]?.url ?? '').searchParams.get('token') ?? ''

describe('requestLoginLink', () => {
  it('leads every address with a good form to the same page, with an account or without', async () => {
    const known = await redirectOf(requestLoginLink, { email: 'jelle@example.org' })
    const unknown = await redirectOf(requestLoginLink, { email: 'niemand@example.org' })

    expect(known).toBe('/beheer/inloggen/verstuurd')
    expect(unknown).toBe(known)
  })

  it('mails the link after the answer, to an address with an account only, with the address of the environment', async () => {
    await redirectOf(requestLoginLink, { email: 'niemand@example.org' })
    await redirectOf(requestLoginLink, { email: 'jelle@example.org' })

    expect(sent).toEqual([])

    for (const task of deferred) {
      await task()
    }

    expect(sent).toHaveLength(1)
    expect(sent[0]?.to).toBe('jelle@example.org')
    expect(sent[0]?.url).toMatch(/^https:\/\/acc\.sc\.heerenveen\.org\/beheer\/inloggen\/bevestigen\?token=[\w-]{43}$/)
  })

  it('leads back to the form with a message for something that is no address, or no field at all', async () => {
    expect(await redirectOf(requestLoginLink, { email: 'geen adres' })).toBe('/beheer/inloggen?fout=ongeldig')
    expect(await redirectOf(requestLoginLink, {})).toBe('/beheer/inloggen?fout=ongeldig')
  })

  it('leads back to the form with a message when the rate limit is reached, also for an address without an account', async () => {
    for (const address of ['jelle@example.org', 'niemand@example.org']) {
      for (let attempt = 0; attempt < 5; attempt++) {
        expect(await redirectOf(requestLoginLink, { email: address })).toBe('/beheer/inloggen/verstuurd')
      }

      expect(await redirectOf(requestLoginLink, { email: address })).toBe('/beheer/inloggen?fout=te-veel')
    }
  })

  it('puts no address in the address of the page it leads to', async () => {
    expect(await redirectOf(requestLoginLink, { email: 'jelle@example.org' })).not.toContain('jelle')
    expect(await redirectOf(requestLoginLink, { email: 'geen adres' })).not.toContain('adres')
  })
})

describe('logIn', () => {
  async function mailedToken() {
    await redirectOf(requestLoginLink, { email: 'jelle@example.org' })
    await deferred[0]?.()

    return linkToken()
  }

  it('starts a session with the link, puts only its token in the cookie, and leads to the admin', async () => {
    const token = await mailedToken()

    expect(await redirectOf(() => logIn(token), {})).toBe('/beheer')
    expect(set).toHaveBeenCalledExactlyOnceWith(
      sessionCookieName,
      expect.stringMatching(/^[\w-]{43}$/),
      sessionCookieOptions,
    )

    const cookie = jar.get(sessionCookieName) ?? ''
    const [session] = await database.db.select().from(adminSessions)

    expect(session?.tokenHash).toBe(hashOf(cookie))
    expect(cookie).not.toBe(token)
    expect(cookie).not.toContain('jelle')
  })

  it('works once: the same link a second time leads back to the form', async () => {
    const token = await mailedToken()

    expect(await redirectOf(() => logIn(token), {})).toBe('/beheer')

    jar.clear()
    set.mockClear()

    expect(await redirectOf(() => logIn(token), {})).toBe('/beheer/inloggen?fout=link')
    expect(set).not.toHaveBeenCalled()
    expect(await database.db.select().from(adminSessions)).toHaveLength(1)
  })

  it('does not log in with a token that was never made or no token', async () => {
    expect(await redirectOf(() => logIn('x'.repeat(43)), {})).toBe('/beheer/inloggen?fout=link')
    expect(await redirectOf(() => logIn(''), {})).toBe('/beheer/inloggen?fout=link')
    expect(jar.size).toBe(0)
    expect(await database.db.select().from(adminLoginLinks)).toEqual([])
  })
})

describe('logOut', () => {
  it('deletes the session on the server and clears the cookie, so the old token is worth nothing', async () => {
    await redirectOf(requestLoginLink, { email: 'jelle@example.org' })
    await deferred[0]?.()
    await redirectOf(() => logIn(linkToken()), {})

    const token = jar.get(sessionCookieName) ?? ''

    expect(await database.db.select().from(adminSessions)).toHaveLength(1)

    expect(await redirectOf(() => logOut(), {})).toBe('/beheer/inloggen')
    expect(await database.db.select().from(adminSessions)).toEqual([])
    expect(set).toHaveBeenLastCalledWith(sessionCookieName, '', { ...sessionCookieOptions, maxAge: 0 })

    jar.set(sessionCookieName, token)
    await expect(logOut()).rejects.toMatchObject({ url: '/beheer/inloggen' })
  })
})
