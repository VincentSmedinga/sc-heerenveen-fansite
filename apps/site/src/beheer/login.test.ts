import type { TestDatabase } from '@fansite/db/test-database'

import { adminLoginAttempts, adminLoginLinks, adminUsers } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount, revokeAccount } from './accounts'
import { handleLoginRequest, loginLimits, minimumAnswerMilliseconds, noteAttempt } from './login'
import { hashOf, redeemLoginLink } from './sessions'

const start = new Date('2026-10-26T10:00:00Z')
const minute = 60 * 1000

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.db.delete(adminLoginAttempts)
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'jelle@example.org', 'beheerder', start)
  await createAccount(database.db, 'marijke@example.org', 'moderator', start)
  vi.restoreAllMocks()
})

/** Handles a request the way the action does, with the mails and the waiting recorded instead of done. */
async function request(value: string, now = start) {
  const mails: { to: string; url: string }[] = []
  const waits: number[] = []
  const deferred: (() => Promise<void>)[] = []
  const answer = await handleLoginRequest(database.db, value, {
    defer: (task) => deferred.push(task),
    deliver: (mail) => {
      mails.push(mail)

      return Promise.resolve()
    },
    now: () => now,
    origin: 'https://acc.sc.heerenveen.org',
    wait: (milliseconds) => {
      waits.push(milliseconds)

      return Promise.resolve()
    },
  })

  return { answer, deferred, mails, waits }
}

describe('a request for a login link', () => {
  it('for an account that is on makes a link and hands over one mail with its address, after the answer', async () => {
    const { answer, deferred, mails } = await request('Jelle@Example.org ')

    expect(answer).toBe('sent')
    expect(mails).toEqual([])
    expect(deferred).toHaveLength(1)

    await deferred[0]?.()

    expect(mails).toHaveLength(1)
    expect(mails[0]?.to).toBe('jelle@example.org')

    const url = new URL(mails[0]?.url ?? '')

    expect(url.origin + url.pathname).toBe('https://acc.sc.heerenveen.org/beheer/inloggen/bevestigen')
    expect([...url.searchParams.keys()]).toEqual(['token'])
    expect(await redeemLoginLink(database.db, url.searchParams.get('token') ?? '', start)).toEqual(expect.any(String))
  })

  it('gives the same answer for an address without an account, and sends no mail', async () => {
    const known = await request('jelle@example.org')
    const unknown = await request('niemand@example.org')

    expect(unknown.answer).toBe(known.answer)
    expect(unknown.answer).toBe('sent')
    expect(unknown.deferred).toEqual([])
    expect(await database.db.select().from(adminLoginLinks)).toHaveLength(1)
  })

  it('gives the same answer for an account that was turned off, and sends no mail', async () => {
    await revokeAccount(database.db, 'marijke@example.org', start)

    const { answer, deferred } = await request('marijke@example.org')

    expect(answer).toBe('sent')
    expect(deferred).toEqual([])
    expect(await database.db.select().from(adminLoginLinks)).toEqual([])
  })

  it('takes the same time for an address with an account and one without, however long the work took', async () => {
    const known = await request('jelle@example.org')
    const unknown = await request('niemand@example.org')

    // The work takes a few milliseconds, so what is left to wait is the minimum minus that, for both.
    for (const { waits } of [known, unknown]) {
      expect(waits).toHaveLength(1)
      expect(waits[0]).toBeGreaterThan(minimumAnswerMilliseconds - 300)
      expect(waits[0]).toBeLessThanOrEqual(minimumAnswerMilliseconds)
    }
  })

  it('does not wait for the mail: a mail server that is slow or down does not change the answer', async () => {
    const answer = await handleLoginRequest(database.db, 'jelle@example.org', {
      defer: () => undefined,
      deliver: () => new Promise(() => undefined),
      origin: 'https://acc.sc.heerenveen.org',
      wait: () => Promise.resolve(),
    })

    expect(answer).toBe('sent')
  })

  it('logs a mail that fails without the address or the message of the error', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const deferred: (() => Promise<void>)[] = []

    await handleLoginRequest(database.db, 'jelle@example.org', {
      defer: (task) => deferred.push(task),
      deliver: () => Promise.reject(new Error('550 jelle@example.org does not exist')),
      origin: 'https://acc.sc.heerenveen.org',
      wait: () => Promise.resolve(),
    })
    await expect(deferred[0]?.()).resolves.toBeUndefined()

    expect(error).toHaveBeenCalledExactlyOnceWith('Could not mail a login link (Error).')
  })

  it.each(['', 'geen adres', 'a@b', 'a@b.nl, b@c.nl', 'a@b.nl\nBcc: c@d.nl', `${'x'.repeat(250)}@example.org`])(
    'refuses %j as not an address, without touching the rate limit',
    async (value) => {
      const { answer, deferred } = await request(value)

      expect(answer).toBe('invalid')
      expect(deferred).toEqual([])
      expect(await database.db.select().from(adminLoginAttempts)).toEqual([])
    },
  )
})

describe('the rate limit', () => {
  it('is 5 links per address and 30 for the site in 15 minutes', () => {
    expect(loginLimits).toEqual({ perAddress: 5, perSite: 30, windowMilliseconds: 15 * minute })
  })

  it('lets an address ask 5 times and refuses the sixth, for an address with an account and one without alike', async () => {
    for (const address of ['jelle@example.org', 'niemand@example.org']) {
      const answers = []

      for (let attempt = 0; attempt < 6; attempt++) {
        answers.push((await request(address)).answer)
      }

      expect(answers, address).toEqual(['sent', 'sent', 'sent', 'sent', 'sent', 'limited'])
    }
  })

  it('counts an address in any spelling as the same address', async () => {
    for (const address of [
      'jelle@example.org',
      'JELLE@example.org',
      ' Jelle@Example.org',
      'jelle@EXAMPLE.org',
      'jelle@example.org',
    ]) {
      expect((await request(address)).answer).toBe('sent')
    }

    expect((await request('jelle@example.org ')).answer).toBe('limited')
  })

  it('makes no link and sends no mail for a refused request', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await request('jelle@example.org')
    }

    const linksBefore = await database.db.select().from(adminLoginLinks)
    const { answer, deferred } = await request('jelle@example.org')

    expect(answer).toBe('limited')
    expect(deferred).toEqual([])
    expect(await database.db.select().from(adminLoginLinks)).toHaveLength(linksBefore.length)
  })

  it('does not count a refused request, so it does not keep the window shut', async () => {
    for (let attempt = 0; attempt < 20; attempt++) {
      await request('jelle@example.org')
    }

    expect(await database.db.select().from(adminLoginAttempts)).toHaveLength(5)
  })

  it('lets the address ask again 15 minutes after the first request', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await request('jelle@example.org', start)
    }

    expect((await request('jelle@example.org', new Date(start.getTime() + 15 * minute - 1))).answer).toBe('limited')
    expect((await request('jelle@example.org', new Date(start.getTime() + 15 * minute))).answer).toBe('sent')
  })

  it('refuses the 31st request of the site in 15 minutes, whatever the address', async () => {
    for (let attempt = 0; attempt < 30; attempt++) {
      expect((await request(`lid${attempt}@example.org`)).answer, `attempt ${attempt}`).toBe('sent')
    }

    expect((await request('jelle@example.org')).answer).toBe('limited')
    expect((await request('nog-een@example.org')).answer).toBe('limited')
  })

  it('keeps the limit in the database, so a second process counts the same requests', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await request('jelle@example.org')
    }

    // Another process has its own connection to the same database and no memory of the first one.
    expect(await noteAttempt(database.db, 'jelle@example.org', start)).toBe(false)
  })

  it('does not let requests at the same time slip under the limit', async () => {
    const results = await Promise.all(
      Array.from({ length: 12 }, () => noteAttempt(database.db, 'jelle@example.org', start)),
    )

    expect(results.filter(Boolean).length).toBeLessThanOrEqual(5)
    expect((await database.db.select().from(adminLoginAttempts)).length).toBeLessThanOrEqual(5)
  })

  it('keeps the hash of the address and the time, and no address and no IP address', async () => {
    await request('jelle@example.org')

    const rows = await database.db.select().from(adminLoginAttempts)

    expect(rows).toEqual([{ addressHash: hashOf('jelle@example.org'), attemptedAt: start, id: expect.any(Number) }])
    expect(Object.keys(rows[0] ?? {}).toSorted()).toEqual(['addressHash', 'attemptedAt', 'id'])
    expect(JSON.stringify(rows)).not.toContain('jelle')
  })

  it('removes the requests older than 15 minutes with the next request', async () => {
    await request('niemand@example.org', start)
    await request('jelle@example.org', new Date(start.getTime() + 16 * minute))

    expect(await database.db.select({ hash: adminLoginAttempts.addressHash }).from(adminLoginAttempts)).toEqual([
      { hash: hashOf('jelle@example.org') },
    ])
  })
})
