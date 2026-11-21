import type { TestDatabase } from '@fansite/db/test-database'

import { supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { maySupporterTakePart, mayTakePart } from './take-part'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

describe('who may take part in a game', () => {
  it('is an account that exists and is not blocked', () => {
    expect(mayTakePart({ disabledAt: null })).toBe(true)
    expect(mayTakePart({ disabledAt: new Date() })).toBe(false)
    expect(mayTakePart(undefined)).toBe(false)
  })

  it('follows the block of the database, both ways, and says no for an account that is gone', async () => {
    const [inserted] = await database.db
      .insert(supporters)
      .values({ email: 'tjalle@example.org', screenName: 'Tjalle99', screenNameKey: 'tlalle99' })

    expect(await maySupporterTakePart(database.db, inserted.insertId)).toBe(true)

    await database.db
      .update(supporters)
      .set({ disabledAt: new Date(), disabledReason: 'misbruik van een spel' })
      .where(eq(supporters.id, inserted.insertId))

    expect(await maySupporterTakePart(database.db, inserted.insertId)).toBe(false)

    await database.db.update(supporters).set({ disabledAt: null }).where(eq(supporters.id, inserted.insertId))

    expect(await maySupporterTakePart(database.db, inserted.insertId)).toBe(true)
    expect(await maySupporterTakePart(database.db, inserted.insertId + 1)).toBe(false)
  })
})
