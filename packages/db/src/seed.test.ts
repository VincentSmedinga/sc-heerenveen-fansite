import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { consentStatuses, sourceKinds, sources } from './schema.ts'
import { seedSources, testSources } from './seed.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

describe('the seed', () => {
  it('makes no duplicates when it runs again', async () => {
    await seedSources(database.db)
    await seedSources(database.db)

    const rows = await database.db.select().from(sources)

    expect(rows).toHaveLength(testSources.length)
  })

  it('holds made-up sources only', () => {
    for (const source of testSources) {
      expect(source.domain, source.name).toMatch(/\.test$/)
    }
  })

  it('covers every kind, every permission, and a source that is switched off', () => {
    expect(new Set(testSources.map((source) => source.kind))).toEqual(new Set(sourceKinds))
    expect(new Set(testSources.map((source) => source.consentStatus ?? 'none'))).toEqual(new Set(consentStatuses))
    expect(testSources.some((source) => source.enabled === false)).toBe(true)
  })

  it('has sources with different policies', () => {
    expect(testSources.some((source) => (source.introMaxLength ?? 0) > 0)).toBe(true)
    expect(testSources.some((source) => source.allowImage === true)).toBe(true)
    expect(testSources.some((source) => source.allowEmbed === true)).toBe(true)
    expect(testSources.some((source) => source.attribution !== undefined)).toBe(true)
  })

  it('has sources with a description and a source without one', () => {
    expect(testSources.some((source) => source.description !== undefined)).toBe(true)
    expect(testSources.some((source) => source.enabled !== false && source.description === undefined)).toBe(true)
  })
})
