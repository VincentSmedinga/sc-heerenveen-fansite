import type { TestDatabase } from '@fansite/db/test-database'

import { supporterBlockedAddresses, supporterLoginAttempts, supporterLoginLinks, supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'

import type { SignUpMail } from './sign-up'

import { blockedAddressHash, isBlockedAddress, oldestKept } from './blocked-addresses'
import { closeAccount } from './close-account'
import { confirmWithLink, handleSignUp } from './sign-up'

// The hash of the address of a blocked account that was closed (issue 1458): what is kept, what
// it stops, and when it goes.

const day = 24 * 60 * 60 * 1000
const start = new Date('2026-11-21T10:00:00Z')

let database: TestDatabase
let log: MockInstance<typeof console.info>
let error: MockInstance<typeof console.error>

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM audit_log')
  await database.db.delete(supporterBlockedAddresses)
  await database.db.delete(supporterLoginAttempts)
  await database.db.delete(supporterLoginLinks)
  await database.db.delete(supporters)
  vi.restoreAllMocks()
  log = vi.spyOn(console, 'info').mockImplementation(() => undefined)
  error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

async function account(blocked: boolean, email = 'tjalle@example.org') {
  const [inserted] = await database.db.insert(supporters).values({
    disabledAt: blocked ? start : null,
    disabledReason: blocked ? 'ongepaste schermnaam' : null,
    email,
    screenName: 'Tjalle99',
    screenNameKey: 'tlalle99',
  })

  return inserted.insertId
}

async function signUp(email: string, now: Date, screenName = 'Sietske') {
  const mails: SignUpMail[] = []
  const result = await handleSignUp(
    database.db,
    { email, screenName },
    {
      clock: () => 1000,
      defer: (task) => void task(),
      deliver: (mail) => {
        mails.push(mail)

        return Promise.resolve()
      },
      notifyCeiling: () => Promise.resolve(),
      notifyMailCeiling: () => Promise.resolve(),
      now: () => now,
      origin: 'https://example.org',
      wait: () => Promise.resolve(),
    },
  )

  return { mails, result }
}

describe('closing a blocked account', () => {
  it('keeps the hash of the address and the moment, and nothing else', async () => {
    const id = await account(true)

    expect(await closeAccount(database.db, id, start)).toBe(true)

    const rows = await database.db.select().from(supporterBlockedAddresses)

    expect(rows).toEqual([
      { addressHash: blockedAddressHash('tjalle@example.org'), blockedAt: start, id: expect.any(Number) as number },
    ])
    expect(Object.keys(rows[0] ?? {}).toSorted()).toEqual(['addressHash', 'blockedAt', 'id'])
    expect(await database.db.select().from(supporters)).toEqual([])
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/tjalle|Tjalle|ongepaste|\d/u)
  })

  it('keeps nothing of an account that was not blocked, or after the block was lifted', async () => {
    await closeAccount(database.db, await account(false), start)

    expect(await database.db.select().from(supporterBlockedAddresses)).toEqual([])
    expect(await signUp('tjalle@example.org', start)).toMatchObject({ mails: [{ kind: 'sign-up' }] })
  })
})

describe('signing up with a blocked address', () => {
  it('gives the same answer, makes no account and sends no mail', async () => {
    await closeAccount(database.db, await account(true), start)

    const known = await signUp('Tjalle@Example.org', new Date(start.getTime() + day))
    const unknown = await signUp('sietske@example.org', new Date(start.getTime() + day), 'Sietske2')

    expect(known.result.answer).toBe('sent')
    expect(unknown.result.answer).toBe('sent')
    expect(Object.keys(known.result).toSorted()).toEqual(Object.keys(unknown.result).toSorted())
    expect(known.mails).toEqual([])
    expect(unknown.mails).toHaveLength(1)
    expect(await database.db.select().from(supporters)).toEqual([])
    expect(await database.db.select().from(supporterLoginLinks)).toHaveLength(1)
    expect(JSON.stringify([...log.mock.calls, ...error.mock.calls])).not.toMatch(/tjalle@|sietske@/iu)
  })

  it('does not make an account of a sign-up that was asked for before, either', async () => {
    const before = await signUp('tjalle@example.org', start, 'Tjalle99')
    const token = new URL(before.mails[0]?.url ?? 'https://example.org').searchParams.get('token') ?? ''

    await database.db.insert(supporterBlockedAddresses).values({
      addressHash: blockedAddressHash('tjalle@example.org'),
      blockedAt: start,
    })

    expect(await confirmWithLink(database.db, token, new Date(start.getTime() + 60 * 1000))).toEqual({
      answer: 'gone',
    })
    expect(await database.db.select().from(supporters)).toEqual([])
  })

  it('lets the address in again after 12 months, at the next request, and removes the row', async () => {
    await closeAccount(database.db, await account(true), start)

    const lastDay = new Date(start.getTime() + 364 * day)
    const exactly = new Date(Date.UTC(2027, 10, 21, 10, 0, 0))
    const after = new Date(exactly.getTime() + 1000)

    expect(oldestKept(after).toISOString()).toBe('2026-11-21T10:00:01.000Z')
    expect(await isBlockedAddress(database.db, 'tjalle@example.org', lastDay)).toBe(true)
    expect(await isBlockedAddress(database.db, 'tjalle@example.org', exactly)).toBe(true)
    // A moment over the 12 months the hash is too old, and goes.
    expect(await isBlockedAddress(database.db, 'tjalle@example.org', after)).toBe(false)
    expect(await database.db.select().from(supporterBlockedAddresses)).toEqual([])
    expect(await signUp('tjalle@example.org', new Date(after.getTime() + 1000))).toMatchObject({
      mails: [{ kind: 'sign-up' }],
    })
  })
})
