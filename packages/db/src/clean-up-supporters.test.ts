import type { Mail } from '@fansite/shared/mail'

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { cleanUpSupporters, describeCleanUp, mailsPerDay } from './clean-up-supporters.ts'
import { supporterBlockedAddresses, supporterLoginLinks, supporters, supporterSessions } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

const now = new Date('2026-11-21T10:00:00Z')
const day = 24 * 60 * 60 * 1000
const env = { FANS_ACCOUNTS: 'on', SITE_ENV: 'acceptance' }

let database: TestDatabase
let mails: Mail[]
let failFor: string[]

beforeAll(async () => {
  database = await createTestDatabase()
  await database.pool.query(
    'CREATE TABLE test_predictions (id int unsigned AUTO_INCREMENT PRIMARY KEY, supporter_id int unsigned, score varchar(5) NOT NULL, FOREIGN KEY (supporter_id) REFERENCES supporters (id) ON DELETE SET NULL)',
  )
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  mails = []
  failFor = []
  vi.restoreAllMocks()
  vi.spyOn(console, 'info').mockImplementation(() => undefined)
  await database.pool.query('DELETE FROM test_predictions')
  await database.db.delete(supporterBlockedAddresses)
  await database.db.delete(supporterLoginLinks)
  await database.db.delete(supporters)
})

async function add(name: string, values: Partial<typeof supporters.$inferInsert> = {}) {
  const [row] = await database.db.insert(supporters).values({
    email: `${name}@example.org`,
    screenName: name,
    screenNameKey: name.toLowerCase(),
    ...values,
  })

  return row.insertId
}

async function remaining() {
  const rows = await database.db.select({ screenName: supporters.screenName }).from(supporters)

  return rows.map((row) => row.screenName).sort()
}

function run(at = now, settings: Record<string, string> = env) {
  return cleanUpSupporters(database.db, at, { env: settings, send })
}

function send(mail: Mail) {
  if (failFor.includes(mail.to)) {
    return Promise.reject(new Error('mail server down'))
  }

  mails.push(mail)

  return Promise.resolve()
}

describe('the clean-up of unused accounts', () => {
  it('mails an account after 24 months and a day, not one day short', async () => {
    await add('Oud', { lastVisitOn: '2024-11-20' })
    await add('Net', { lastVisitOn: '2024-11-21' })
    await add('Jong', { lastVisitOn: '2024-11-22' })

    const report = await run()

    expect(report).toMatchObject({ closed: 0, failed: 0, mailed: 1 })
    expect(mails.map((mail) => mail.to)).toEqual(['Oud@example.org'])
    expect(mails[0]?.text).toContain('over 30 dagen'.replace('over', 'Over'))
    expect(mails[0]?.text).toContain('https://acc.sc.heerenveen.org/fans/inloggen')
    expect(mails[0]?.text).toContain('zonder je naam')
  })

  it('uses the day of sign-up for an account that never came back', async () => {
    await add('Nooit', { createdAt: new Date('2024-11-01T10:00:00Z') })

    expect((await run()).mailed).toBe(1)
  })

  it('mails an account once, and closes it on day 30 but not on day 29', async () => {
    await add('Oud', { lastVisitOn: '2024-01-01' })
    await run()

    await run(new Date(now.getTime() + 15 * day))
    expect(mails).toHaveLength(1)

    expect((await run(new Date(now.getTime() + 29 * day))).closed).toBe(0)
    expect(await remaining()).toEqual(['Oud'])

    expect((await run(new Date(now.getTime() + 30 * day + 1000))).closed).toBe(1)
    expect(await remaining()).toEqual([])
    expect(mails).toHaveLength(1)
  })

  it('keeps an account whose supporter visited after the mail, and starts a new term', async () => {
    const id = await add('Oud', { lastVisitOn: '2024-01-01' })

    await run()

    // What the site does for a visit.
    await database.pool.query('UPDATE supporters SET last_visit_on = ?, unused_mail_sent_at = NULL WHERE id = ?', [
      '2026-12-01',
      id,
    ])

    expect((await run(new Date(now.getTime() + 40 * day))).closed).toBe(0)
    expect(await remaining()).toEqual(['Oud'])
    expect(mails).toHaveLength(1)
  })

  it('does not close an account that was visited since the mail, even if the mark stayed', async () => {
    const id = await add('Oud', { lastVisitOn: '2024-01-01' })

    await run()
    await database.pool.query('UPDATE supporters SET last_visit_on = ? WHERE id = ?', ['2026-12-01', id])

    expect((await run(new Date(now.getTime() + 40 * day))).closed).toBe(0)
  })

  it('counts a mail as sent only when it went out, and tries again at the next run', async () => {
    await add('Oud', { lastVisitOn: '2024-01-01' })
    failFor = ['Oud@example.org']

    expect(await run()).toMatchObject({ failed: 1, mailed: 0 })
    expect((await run(new Date(now.getTime() + 31 * day))).closed).toBe(0)
    expect(await remaining()).toEqual(['Oud'])

    failFor = []

    const later = new Date(now.getTime() + 32 * day)

    expect((await run(later)).mailed).toBe(1)
    expect((await run(new Date(later.getTime() + 29 * day))).closed).toBe(0)
    expect((await run(new Date(later.getTime() + 31 * day))).closed).toBe(1)
  })

  it('mails at most 20 accounts a day, the longest unused first, and the rest the next day', async () => {
    for (let index = 0; index < 25; index += 1) {
      await add(`Oud${String(index).padStart(2, '0')}`, {
        lastVisitOn: `2024-01-${String(index + 1).padStart(2, '0')}`,
      })
    }

    expect((await run()).mailed).toBe(mailsPerDay)
    expect((await run(new Date(now.getTime() + 3600_000))).mailed).toBe(0)
    expect(mails[0]?.to).toBe('Oud00@example.org')

    expect((await run(new Date(now.getTime() + day))).mailed).toBe(5)
    expect(mails).toHaveLength(25)
  })

  it('removes the account like closing it: sessions and links go, the games stay without a person', async () => {
    const id = await add('Oud', { lastVisitOn: '2024-01-01' })

    await database.db
      .insert(supporterSessions)
      .values({ createdAt: now, lastSeenAt: now, tokenHash: 'a'.repeat(64), userId: id })
    await database.pool.query("INSERT INTO test_predictions (supporter_id, score) VALUES (?, '2-1')", [id])
    await run()
    await run(new Date(now.getTime() + 31 * day))

    const [sessions] = await database.pool.query<never[]>('SELECT * FROM supporter_sessions')
    const [predictions] = await database.pool.query<never[] & { supporter_id: null | number }[]>(
      'SELECT supporter_id FROM test_predictions',
    )

    expect(sessions).toEqual([])
    expect(predictions).toEqual([{ supporter_id: null }])
  })

  it('keeps the hash of the address of a blocked account, which follows the same rules', async () => {
    await add('Rotzak', { disabledAt: new Date('2025-01-01T00:00:00Z'), lastVisitOn: '2024-01-01' })
    await run()
    await run(new Date(now.getTime() + 31 * day))

    expect(await remaining()).toEqual([])
    expect(await database.db.select().from(supporterBlockedAddresses)).toHaveLength(1)
  })

  it('does nothing while accounts are off, and the 30 days start at a mail once they are on', async () => {
    await add('Oud', { lastVisitOn: '2024-01-01' })

    const off = { ...env, FANS_ACCOUNTS: 'off' }

    expect(await run(now, off)).toEqual({ closed: 0, failed: 0, mailed: 0, signUpsRemoved: 0 })
    expect(await run(new Date(now.getTime() + 90 * day), off)).toMatchObject({ closed: 0, mailed: 0 })
    expect(mails).toEqual([])

    const back = new Date(now.getTime() + 91 * day)

    expect(await run(back)).toMatchObject({ closed: 0, mailed: 1 })
    expect(await remaining()).toEqual(['Oud'])
  })

  it('removes a sign-up nobody confirmed once it has expired, and keeps one that is still open', async () => {
    const base = { screenName: 'Nieuw', screenNameKey: 'nieuw' }

    await database.db.insert(supporterLoginLinks).values([
      { ...base, email: 'oud@example.org', expiresAt: new Date(now.getTime() - 1000), tokenHash: 'a'.repeat(64) },
      { ...base, email: 'lopend@example.org', expiresAt: new Date(now.getTime() + 60_000), tokenHash: 'b'.repeat(64) },
    ])

    const report = await run(now, { ...env, FANS_ACCOUNTS: 'off' })
    const rows = await database.db.select({ email: supporterLoginLinks.email }).from(supporterLoginLinks)

    expect(report.signUpsRemoved).toBe(1)
    expect(rows).toEqual([{ email: 'lopend@example.org' }])
  })

  it('logs counts only', async () => {
    expect(describeCleanUp({ closed: 0, failed: 0, mailed: 0, signUpsRemoved: 0 })).toEqual([])
    expect(describeCleanUp({ closed: 2, failed: 1, mailed: 3, signUpsRemoved: 4 })).toEqual([
      'Supporter accounts: 3 mailed about being unused, 2 closed, 1 mails failed; 4 unconfirmed sign-ups removed',
    ])
  })
})
