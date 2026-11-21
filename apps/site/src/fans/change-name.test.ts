import type { TestDatabase } from '@fansite/db/test-database'

import { supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'

import { changeScreenName, nameWait } from './change-name'

// 4 December 2026, in the evening in the Netherlands.
const changed = new Date('2026-12-04T19:30:00Z')
const day = 24 * 60 * 60 * 1000

let database: TestDatabase
let log: MockInstance<typeof console.info>
let supporterId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.db.delete(supporters)
  vi.restoreAllMocks()
  log = vi.spyOn(console, 'info').mockImplementation(() => undefined)

  const [inserted] = await database.db
    .insert(supporters)
    .values({ email: 'tjalle@example.org', screenName: 'Tjalle99', screenNameKey: 'tjalle99' })

  supporterId = inserted.insertId
  await database.db
    .insert(supporters)
    .values({ email: 'sietske@example.org', screenName: 'Sietske', screenNameKey: 'sletske' })
})

async function account() {
  const [row] = await database.db
    .select({ changedAt: supporters.screenNameChangedAt, key: supporters.screenNameKey, name: supporters.screenName })
    .from(supporters)
    .where(eq(supporters.id, supporterId))

  return row
}

describe('changing the screen name', () => {
  it('changes it at once, keeps no old name, and logs the change without the names', async () => {
    expect(await changeScreenName(database.db, supporterId, ' Blauwwit_Sjoerd ', changed)).toEqual({
      answer: 'changed',
    })
    expect(await account()).toEqual({ changedAt: changed, key: 'blauwwltsjoerd', name: 'Blauwwit_Sjoerd' })
    expect(log).toHaveBeenCalledWith(`Supporter ${supporterId} changed the screen name.`)
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/Tjalle|Sjoerd/)
  })

  it('makes the old name free for somebody else at once', async () => {
    await changeScreenName(database.db, supporterId, 'Blauwwit_Sjoerd', changed)
    await expect(
      database.db
        .insert(supporters)
        .values({ email: 'ander@example.org', screenName: 'Tjalle99', screenNameKey: 'tjalle99' }),
    ).resolves.toBeDefined()
  })

  it('follows the rules of signing up', async () => {
    expect(await changeScreenName(database.db, supporterId, 'ab', changed)).toEqual({
      answer: 'invalid',
      error: { problem: 'length' },
    })
    expect(await changeScreenName(database.db, supporterId, 'SC Heer3nveen', changed)).toEqual({
      answer: 'invalid',
      error: { problem: 'refused' },
    })
    expect((await account())?.name).toBe('Tjalle99')
  })

  it('refuses a name of another supporter, also with other capitals or look-alikes', async () => {
    expect(await changeScreenName(database.db, supporterId, 'SIETSKE', changed)).toEqual({
      answer: 'invalid',
      error: { problem: 'taken' },
    })
    expect(await changeScreenName(database.db, supporterId, 'S1etske', changed)).toEqual({
      answer: 'invalid',
      error: { problem: 'taken' },
    })
  })

  it('takes only other capitals, accents or spaces in the own name as a change, which counts', async () => {
    expect(await changeScreenName(database.db, supporterId, 'TJÁLLE 99', changed)).toEqual({ answer: 'changed' })
    expect(await account()).toEqual({ changedAt: changed, key: 'tjalle99', name: 'TJÁLLE 99' })
  })

  it('changes nothing for the same name, and does not count it', async () => {
    expect(await changeScreenName(database.db, supporterId, 'Tjalle99', changed)).toEqual({ answer: 'unchanged' })
    expect((await account())?.changedAt).toBeNull()
  })

  it('refuses a second change on day 29, and allows it on day 30', async () => {
    await changeScreenName(database.db, supporterId, 'Blauwwit_Sjoerd', changed)

    // 2 January 2027, late in the evening in the Netherlands: day 29.
    expect(await changeScreenName(database.db, supporterId, 'Tjalle', new Date('2027-01-02T22:30:00Z'))).toEqual({
      answer: 'wait',
      wait: { changedOn: '4 december', from: '3 januari' },
    })
    expect((await account())?.name).toBe('Blauwwit_Sjoerd')

    // 3 January 2027, just after midnight in the Netherlands: day 30.
    expect(await changeScreenName(database.db, supporterId, 'Tjalle', new Date('2027-01-02T23:05:00Z'))).toEqual({
      answer: 'changed',
    })
    expect((await account())?.name).toBe('Tjalle')
  })
})

describe('the wait after a change', () => {
  it('is nothing without an earlier change', () => {
    expect(nameWait(null, changed)).toBeUndefined()
  })

  it('counts days of the calendar in the Netherlands, also over the change of the clock', () => {
    // 10 March 2027, 00:30 in the Netherlands; the clock moves on 28 March.
    const march = new Date('2027-03-09T23:30:00Z')

    expect(nameWait(march, new Date(march.getTime() + 28 * day))).toEqual({ changedOn: '10 maart', from: '9 april' })
    expect(nameWait(march, new Date('2027-04-08T22:00:00Z'))).toBeUndefined()
  })
})
