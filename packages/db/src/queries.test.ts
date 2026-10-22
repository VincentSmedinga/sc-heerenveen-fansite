import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { listEnabledSources } from './queries.ts'
import { sources } from './schema.ts'
import { realSources, seedSources, testSources } from './seed.ts'
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
      [...testSources.filter((source) => source.enabled !== false), ...realSources]
        .map((source) => source.name)
        .sort((a, b) => a.localeCompare(b, 'nl')),
    )
    expect(names).not.toContain('Uitgezette testbron')
  })

  it('gives the name, the domain, the kind and the description, and leaves the policy and the permission out', async () => {
    await database.db.insert(sources).values({
      allowImage: true,
      attribution: 'Voorbeeldkrant, met dank aan de redactie',
      consentDate: '2026-01-15',
      consentNote: 'Verzonnen: intro en foto.',
      consentStatus: 'given',
      description: 'Een verzonnen regionale krant.',
      domain: 'voorbeeldkrant.test',
      introMaxLength: 200,
      kind: 'news',
      name: 'Voorbeeldkrant',
    })

    expect(await listEnabledSources(database.db)).toEqual([
      {
        description: 'Een verzonnen regionale krant.',
        domain: 'voorbeeldkrant.test',
        kind: 'news',
        name: 'Voorbeeldkrant',
      },
    ])
  })

  it('gives no description when a source has none', async () => {
    await database.db.insert(sources).values({ domain: 'proefforum.test', kind: 'forum', name: 'Proefforum' })

    expect((await listEnabledSources(database.db))[0]?.description).toBeNull()
  })

  it('gives an empty list when the register is empty', async () => {
    expect(await listEnabledSources(database.db)).toEqual([])
  })
})
