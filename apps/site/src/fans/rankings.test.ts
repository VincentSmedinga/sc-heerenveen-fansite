import type { TestDatabase } from '@fansite/db/test-database'

import { supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { inRankings, setInRankings } from './rankings'

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

const ranked = async () =>
  (
    await database.db
      .select({ name: supporters.screenName })
      .from(supporters)
      .where(inRankings())
      .orderBy(supporters.id)
  ).map(({ name }) => name)

describe('the name in the rankings', () => {
  it('is on by default', async () => {
    expect(await ranked()).toEqual(['Tjalle99', 'Sietske'])
  })

  it('goes off and on again at once, for the own account only', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    await setInRankings(database.db, tjalle, false)

    // The log says what changed, not the new value.
    expect(log).toHaveBeenLastCalledWith(`Supporter ${tjalle} changed the choice for the rankings.`)

    expect(await ranked()).toEqual(['Sietske'])

    await setInRankings(database.db, tjalle, true)

    expect(await ranked()).toEqual(['Tjalle99', 'Sietske'])
  })

  it('leaves out a blocked account', async () => {
    await database.db.update(supporters).set({ disabledAt: new Date() }).where(eq(supporters.id, sietske))

    expect(await ranked()).toEqual(['Tjalle99'])
  })
})
