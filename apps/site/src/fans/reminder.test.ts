import type { TestDatabase } from '@fansite/db/test-database'

import { supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { makeReminderCode, reminderCodeLifetime } from '@fansite/shared/reminder-code'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { setReminder, turnOffWithCode } from './reminder'

let database: TestDatabase
let tjalle: number
let sietske: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.db.delete(supporters)
  vi.spyOn(console, 'info').mockImplementation(() => undefined)

  const [first] = await database.db
    .insert(supporters)
    .values({ email: 'tjalle@example.org', screenName: 'Tjalle99', screenNameKey: 'tjalle99' })
  const [second] = await database.db
    .insert(supporters)
    .values({ email: 'sietske@example.org', screenName: 'Sietske', screenNameKey: 'sletske' })

  tjalle = first.insertId
  sietske = second.insertId
})

const choiceOf = async (id: number) =>
  (await database.db.select({ on: supporters.remindByEmail }).from(supporters).where(eq(supporters.id, id)))[0]?.on

describe('the reminder by e-mail', () => {
  it('is off by default', async () => {
    expect(await choiceOf(tjalle)).toBe(false)
    expect(await choiceOf(sietske)).toBe(false)
  })

  it('is saved, on and off again, and leaves the other supporters alone', async () => {
    await setReminder(database.db, tjalle, true)
    expect(await choiceOf(tjalle)).toBe(true)
    expect(await choiceOf(sietske)).toBe(false)

    await setReminder(database.db, tjalle, false)
    expect(await choiceOf(tjalle)).toBe(false)
  })
})

describe('the code of the link in a reminder', () => {
  const secret = 'een-geheim-van-minstens-tweeendertig-tekens'
  const source = { FANS_REMINDER_SECRET: secret }
  const now = new Date('2026-11-20T10:00:00Z')

  it('turns the reminder off for the supporter in the code, without a session', async () => {
    await setReminder(database.db, tjalle, true)
    await setReminder(database.db, sietske, true)

    expect(await turnOffWithCode(database.db, makeReminderCode(tjalle, secret, now), now, source)).toBe(true)
    expect(await choiceOf(tjalle)).toBe(false)
    expect(await choiceOf(sietske)).toBe(true)
  })

  it('changes nothing for a code that is wrong, expired, from another secret or not text', async () => {
    await setReminder(database.db, tjalle, true)

    const code = makeReminderCode(tjalle, secret, now)
    const later = new Date(now.getTime() + reminderCodeLifetime + 1000)

    expect(await turnOffWithCode(database.db, `${code}x`, now, source)).toBe(false)
    expect(await turnOffWithCode(database.db, code, later, source)).toBe(false)
    expect(await turnOffWithCode(database.db, code, now, { FANS_REMINDER_SECRET: `${secret}x` })).toBe(false)
    expect(await turnOffWithCode(database.db, undefined, now, source)).toBe(false)
    expect(await turnOffWithCode(database.db, code, now, {})).toBe(false)
    expect(await choiceOf(tjalle)).toBe(true)
  })
})
