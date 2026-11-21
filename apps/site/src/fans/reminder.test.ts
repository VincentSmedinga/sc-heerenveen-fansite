import type { TestDatabase } from '@fansite/db/test-database'

import { supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { setReminder } from './reminder'

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
