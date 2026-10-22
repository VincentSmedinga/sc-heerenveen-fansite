import type { TestDatabase } from '@fansite/db/test-database'

import { robotsTxt } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { robotsMaxAgeMs, robotsStoreFor } from './robots-store.ts'

const fetchedAt = new Date('2026-10-22T10:07:00Z')
const origin = 'https://krant.test'
const rules = [
  { allow: false, pattern: '/geheim/' },
  { allow: true, pattern: '/geheim/open' },
]

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM robots_txt')
})

const storeAt = (now: Date) => robotsStoreFor(database.db, () => now)

describe('the store for robots.txt', () => {
  it('gives back the rules of an origin for 24 hours, and then nothing', async () => {
    await storeAt(fetchedAt).set(origin, rules)

    expect(await storeAt(new Date(fetchedAt.getTime() + robotsMaxAgeMs - 1000)).get(origin)).toEqual(rules)
    expect(await storeAt(new Date(fetchedAt.getTime() + robotsMaxAgeMs)).get(origin)).toBeUndefined()
    expect(await storeAt(fetchedAt).get('https://andere.test')).toBeUndefined()
  })

  it('replaces the rules of an origin when they are read again', async () => {
    const later = new Date(fetchedAt.getTime() + robotsMaxAgeMs)

    await storeAt(fetchedAt).set(origin, rules)
    await storeAt(later).set(origin, [])

    expect(await database.db.select().from(robotsTxt)).toEqual([{ fetchedAt: later, origin, rules: '[]' }])
    expect(await storeAt(later).get(origin)).toEqual([])
  })

  it.each(['geen json', '{"allow":true}', '[{"allow":"ja","pattern":"/"}]'])(
    'gives nothing for rules it did not write, such as %s, so the fetcher reads robots.txt again',
    async (stored) => {
      await database.db.insert(robotsTxt).values({ fetchedAt, origin, rules: stored })

      expect(await storeAt(fetchedAt).get(origin)).toBeUndefined()
    },
  )
})
