import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { listEnabledSources } from './queries.ts'
import { sources } from './schema.ts'
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

beforeEach(async () => {
  await database.pool.query('DELETE FROM sources')
})

describe('listEnabledSources', () => {
  it('gives the sources that are switched on, by name', async () => {
    await seedSources(database.db)

    const names = (await listEnabledSources(database.db)).map((source) => source.name)

    expect(names).toEqual(
      testSources
        .filter((source) => source.enabled !== false)
        .map((source) => source.name)
        .sort((a, b) => a.localeCompare(b, 'nl')),
    )
    expect(names).not.toContain('Uitgezette testbron')
  })

  it('gives the policy and leaves the permission out', async () => {
    await database.db.insert(sources).values({
      allowImage: true,
      attribution: 'Voorbeeldkrant, met dank aan de redactie',
      consentDate: '2026-01-15',
      consentNote: 'Verzonnen: intro en foto.',
      consentStatus: 'given',
      domain: 'voorbeeldkrant.test',
      introMaxLength: 200,
      kind: 'news',
      name: 'Voorbeeldkrant',
    })

    expect(await listEnabledSources(database.db)).toEqual([
      {
        allowEmbed: false,
        allowImage: true,
        domain: 'voorbeeldkrant.test',
        introMaxLength: 200,
        kind: 'news',
        name: 'Voorbeeldkrant',
      },
    ])
  })

  it('gives an empty list when the register is empty', async () => {
    expect(await listEnabledSources(database.db)).toEqual([])
  })
})
