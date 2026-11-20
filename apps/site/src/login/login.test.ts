import type { TestDatabase } from '@fansite/db/test-database'

import { adminLoginAttempts, adminLoginLinks, adminSessions, adminUsers } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AccountKind } from './account-kind'

import { cookieOptionsOf } from './account-kind'
import { handleLoginRequest, noteAttempt } from './request'
import { findSession, redeemLoginCode, redeemLoginLink, removeEnded, startSession } from './sessions'
import { hashOf } from './tokens'

// A second kind of account that exists only here: the same tables, other numbers, so a test
// shows that the code takes every value from the settings and from nowhere else.

const minute = 60 * 1000
const start = new Date('2026-10-26T10:00:00Z')

const other = {
  absoluteLifetime: 120 * minute,
  codeAttempts: 2,
  codeFailuresEndLink: false,
  cookie: { maxAge: 7200, name: 'other-session', path: '/other' },
  idleLifetime: 30 * minute,
  limits: { perAddress: 1, perSite: 2, windowMilliseconds: 5 * minute },
  linkLifetime: 3 * minute,
  minimumAnswerMilliseconds: 50,
  tables: { attempts: adminLoginAttempts, links: adminLoginLinks, sessions: adminSessions, users: adminUsers },
} as const satisfies AccountKind

const rules = { normalise: (value: string) => value.trim().toLowerCase() || undefined, path: '/other/confirm' }

let database: TestDatabase
let userId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.db.delete(adminLoginAttempts)
  await database.db.delete(adminUsers)

  const [inserted] = await database.db.insert(adminUsers).values({ email: 'sanne@example.org', role: 'author' })

  userId = inserted.insertId
  vi.restoreAllMocks()
})

async function request(value: string, now = start, clock: () => number = Date.now) {
  const mails: { code: string; to: string; url: string }[] = []
  const waits: number[] = []
  const result = await handleLoginRequest(
    database.db,
    other,
    value,
    {
      clock,
      defer: (task) => void task(),
      deliver: (mail) => {
        mails.push(mail)

        return Promise.resolve()
      },
      now: () => now,
      origin: 'https://example.org',
      wait: (milliseconds) => {
        waits.push(milliseconds)

        return Promise.resolve()
      },
    },
    rules,
  )

  return { mails, result, waits }
}

describe('the cookie of a kind of account', () => {
  it('comes from its settings', () => {
    expect(cookieOptionsOf(other)).toMatchObject({ httpOnly: true, maxAge: 7200, path: '/other', sameSite: 'lax' })
  })
})

describe('a session', () => {
  it('ends after the idle time of its own kind', async () => {
    const token = await startSession(database.db, other, userId, start)

    expect(await findSession(database.db, other, token, new Date(start.getTime() + 29 * minute))).toBeDefined()
    // That request renewed it; 30 minutes without another one ends it.
    expect(await findSession(database.db, other, token, new Date(start.getTime() + 58 * minute))).toBeDefined()
    expect(await findSession(database.db, other, token, new Date(start.getTime() + 88 * minute))).toBeUndefined()
  })

  it('ends after the absolute time of its own kind, however often it was used', async () => {
    const token = await startSession(database.db, other, userId, start)

    for (let at = 25; at < 120; at += 25) {
      expect(await findSession(database.db, other, token, new Date(start.getTime() + at * minute))).toBeDefined()
    }

    expect(await findSession(database.db, other, token, new Date(start.getTime() + 120 * minute))).toBeUndefined()
  })

  it('is removed with the sessions that ended, by the idle time of its own kind', async () => {
    const token = await startSession(database.db, other, userId, start)

    await removeEnded(database.db, other, new Date(start.getTime() + 31 * minute))

    expect(await database.db.select().from(adminSessions)).toHaveLength(0)
    expect(token).not.toBe('')
  })
})

describe('a login link', () => {
  it('works for the lifetime of its own kind, and for the page of its own kind', async () => {
    const { mails } = await request('Sanne@Example.org')
    const url = new URL(mails[0]?.url ?? '')

    expect(url.pathname).toBe('/other/confirm')
    expect(mails[0]?.to).toBe('sanne@example.org')

    const token = url.searchParams.get('token') ?? ''

    expect(await redeemLoginLink(database.db, other, token, new Date(start.getTime() + 4 * minute))).toBeUndefined()

    // The limits of this kind allow one request an address in 5 minutes, so the next one waits.
    const later = new Date(start.getTime() + 10 * minute)
    const again =
      new URL((await request('sanne@example.org', later)).mails[0]?.url ?? '').searchParams.get('token') ?? ''

    expect(await redeemLoginLink(database.db, other, again, new Date(later.getTime() + 2 * minute))).toBeDefined()
  })

  it('takes the number of wrong codes of its own kind', async () => {
    const { mails, result } = await request('sanne@example.org')
    const ref = 'ref' in result ? result.ref : ''
    const code = mails[0]?.code ?? ''
    const wrong = code === '000000' ? '111111' : '000000'

    expect(await redeemLoginCode(database.db, other, ref, wrong, start)).toBeUndefined()
    expect(await redeemLoginCode(database.db, other, ref, wrong, start)).toBeUndefined()
    // Two wrong codes are all this kind takes: the right code is refused as well.
    expect(await redeemLoginCode(database.db, other, ref, code, start)).toBeUndefined()
  })

  it('takes a right code within the number of tries of its own kind', async () => {
    const { mails, result } = await request('sanne@example.org')
    const ref = 'ref' in result ? result.ref : ''

    const code = mails[0]?.code ?? ''
    const wrong = code === '000000' ? '111111' : '000000'

    expect(await redeemLoginCode(database.db, other, ref, wrong, start)).toBeUndefined()
    expect(await redeemLoginCode(database.db, other, ref, code, start)).toBeDefined()
  })
})

describe('the rate limit', () => {
  it('uses the limits of its own kind', async () => {
    expect(await noteAttempt(database.db, other, 'a@example.org', start)).toBe(true)
    expect(await noteAttempt(database.db, other, 'a@example.org', start)).toBe(false)
    expect(await noteAttempt(database.db, other, 'b@example.org', start)).toBe(true)
    expect(await noteAttempt(database.db, other, 'c@example.org', start)).toBe(false)
  })

  it('uses the window of its own kind', async () => {
    expect(await noteAttempt(database.db, other, 'a@example.org', start)).toBe(true)
    expect(await noteAttempt(database.db, other, 'a@example.org', new Date(start.getTime() + 6 * minute))).toBe(true)
  })

  it('keeps only the hash of the address', async () => {
    await noteAttempt(database.db, other, 'a@example.org', start)

    const rows = await database.db.select().from(adminLoginAttempts)

    expect(rows[0]?.addressHash).toBe(hashOf('a@example.org'))
  })
})

describe('the answer to a request', () => {
  it('takes the minimum time of its own kind', async () => {
    const { waits } = await request('sanne@example.org', start, () => 1000)

    expect(waits).toEqual([50])
  })

  it('is the same for an address without an account', async () => {
    const known = await request('sanne@example.org')
    const unknown = await request('nobody@example.org', new Date(start.getTime() + 10 * minute))

    expect(known.result.answer).toBe('sent')
    expect(unknown.result.answer).toBe('sent')
    expect(unknown.mails).toHaveLength(0)
  })

  it('writes no address, token or code in the log when the mail fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await handleLoginRequest(
      database.db,
      other,
      'sanne@example.org',
      {
        defer: (task) => void task(),
        deliver: () => Promise.reject(new Error('rejected sanne@example.org')),
        now: () => start,
        origin: 'https://example.org',
        wait: () => Promise.resolve(),
      },
      rules,
    )

    expect(error).toHaveBeenCalledWith('Could not mail a login link (Error).')
    expect(JSON.stringify(error.mock.calls)).not.toContain('sanne')
  })
})
