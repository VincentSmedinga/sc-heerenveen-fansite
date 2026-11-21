import type { TestDatabase } from '@fansite/db/test-database'

import {
  supporterEmailChanges,
  supporterLoginAttempts,
  supporterLoginLinks,
  supporters,
  supporterSessions,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'

import { findSession, startSession } from '../login/sessions'
import { hashOf } from '../login/tokens'
import { closeAccount, confirmationLifetime, isFreshConfirmation, newConfirmation } from './close-account'
import { handleSignUp } from './sign-up'
import { supporterKind } from './supporter-login'

const now = new Date('2026-11-21T10:00:00Z')

let database: TestDatabase
let log: MockInstance<typeof console.info>
let tjalle: number
let sietske: number

beforeAll(async () => {
  database = await createTestDatabase()
  // A made-up table of a game, as a game will have one: it refers to the supporter with
  // ON DELETE SET NULL, so what was filled in stays without a link to a person.
  await database.pool.query(
    'CREATE TABLE test_predictions (id int unsigned AUTO_INCREMENT PRIMARY KEY, supporter_id int unsigned, score varchar(5) NOT NULL, FOREIGN KEY (supporter_id) REFERENCES supporters (id) ON DELETE SET NULL)',
  )
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM test_predictions')
  await database.db.delete(supporterLoginAttempts)
  await database.db.delete(supporterEmailChanges)
  await database.db.delete(supporterLoginLinks)
  await database.db.delete(supporters)
  vi.restoreAllMocks()
  log = vi.spyOn(console, 'info').mockImplementation(() => undefined)

  const [first] = await database.db
    .insert(supporters)
    .values({ email: 'tjalle@example.org', screenName: 'Tjalle99', screenNameKey: 'tjalle99' })
  const [second] = await database.db
    .insert(supporters)
    .values({ email: 'sietske@example.org', screenName: 'Sietske', screenNameKey: 'sletske' })

  tjalle = first.insertId
  sietske = second.insertId
})

async function count(table: string) {
  const [rows] = await database.pool.query(`SELECT COUNT(*) AS total FROM ${table}`)

  return (rows as { total: number }[])[0]?.total
}

describe('closing an account', () => {
  it('removes the account, its sessions on every device, its links and its requests, and nothing of another', async () => {
    const phone = await startSession(database.db, supporterKind, tjalle, now)
    const laptop = await startSession(database.db, supporterKind, tjalle, now)
    const theirs = await startSession(database.db, supporterKind, sietske, now)

    await database.db.insert(supporterLoginLinks).values({ expiresAt: now, tokenHash: 'link', userId: tjalle })
    await database.db
      .insert(supporterEmailChanges)
      .values({ email: 'nieuw@example.org', expiresAt: now, supporterId: tjalle, tokenHash: 'change' })
    await database.db
      .insert(supporterLoginAttempts)
      .values({ addressHash: hashOf('tjalle@example.org'), attemptedAt: now })

    expect(await closeAccount(database.db, tjalle)).toBe(true)

    expect(await database.db.select({ id: supporters.id }).from(supporters)).toEqual([{ id: sietske }])
    expect(await findSession(database.db, supporterKind, phone, now)).toBeUndefined()
    expect(await findSession(database.db, supporterKind, laptop, now)).toBeUndefined()
    expect(await findSession(database.db, supporterKind, theirs, now)).toMatchObject({ id: sietske })
    expect(await database.db.select().from(supporterSessions).where(eq(supporterSessions.userId, tjalle))).toEqual([])
    expect(await count('supporter_login_links')).toBe(0)
    expect(await count('supporter_email_changes')).toBe(0)
    // The request of the limit holds only a hash, and goes after 15 minutes by itself.
    expect(await count('supporter_login_attempts')).toBe(1)
  })

  it('keeps what was filled in for a game, without a link to a person', async () => {
    await database.pool.query('INSERT INTO test_predictions (supporter_id, score) VALUES (?, ?), (?, ?)', [
      tjalle,
      '2-1',
      sietske,
      '0-0',
    ])

    await closeAccount(database.db, tjalle)

    const [rows] = await database.pool.query('SELECT supporter_id, score FROM test_predictions ORDER BY score')

    expect(rows).toEqual([
      { score: '0-0', supporter_id: sietske },
      { score: '2-1', supporter_id: null },
    ])
  })

  it('writes one line in the log, without the number, the name or the address', async () => {
    await closeAccount(database.db, tjalle)

    expect(log.mock.calls).toEqual([['A supporter account was closed.']])
  })

  it('does nothing for an account that is gone', async () => {
    await closeAccount(database.db, tjalle)
    log.mockClear()

    expect(await closeAccount(database.db, tjalle)).toBe(false)
    expect(log).not.toHaveBeenCalled()
  })

  it('lets somebody sign up again at once with the same address and name, as a new account', async () => {
    await closeAccount(database.db, tjalle)

    const result = await handleSignUp(
      database.db,
      { email: 'tjalle@example.org', screenName: 'Tjalle99' },
      {
        clock: () => 1000,
        defer: () => undefined,
        deliver: () => Promise.resolve(),
        notifyCeiling: () => Promise.resolve(),
        notifyMailCeiling: () => Promise.resolve(),
        now: () => now,
        origin: 'https://example.org',
        wait: () => Promise.resolve(),
      },
    )

    expect(result).toEqual({ answer: 'sent', ref: expect.any(String) })
    // The mail is to confirm a new account, not to log in to the old one.
    expect(await database.db.select({ email: supporterLoginLinks.email }).from(supporterLoginLinks)).toEqual([
      { email: 'tjalle@example.org' },
    ])
  })
})

describe('the confirmation', () => {
  const at = now.getTime()

  it('works from a page of the same session, for 10 minutes', () => {
    const { issuedAt, proof } = newConfirmation('sessie', at)

    expect(isFreshConfirmation('sessie', Number(issuedAt), proof, at + 1000)).toBe(true)
    expect(isFreshConfirmation('sessie', Number(issuedAt), proof, at + confirmationLifetime)).toBe(false)
  })

  it('does not work for another session, a changed moment or a moment to come', () => {
    const { issuedAt, proof } = newConfirmation('sessie', at)

    expect(isFreshConfirmation('andere', Number(issuedAt), proof, at)).toBe(false)
    expect(isFreshConfirmation('sessie', Number(issuedAt) + 1, proof, at + 1000)).toBe(false)
    expect(isFreshConfirmation('sessie', Number.NaN, proof, at)).toBe(false)

    const later = newConfirmation('sessie', at + 60_000)

    expect(isFreshConfirmation('sessie', Number(later.issuedAt), later.proof, at)).toBe(false)
  })
})
