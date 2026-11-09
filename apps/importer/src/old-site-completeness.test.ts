import type { TestDatabase } from '@fansite/db/test-database'

import { players, squadCompleteness } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { importOldSiteCompleteness } from './old-site-completeness.ts'

const first = new Date('2026-11-09T10:00:00Z')
const later = new Date('2026-11-09T12:00:00Z')

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  for (const table of ['players', 'squad_completeness']) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
})

async function addPlayers(season: string, source: 'selectie' | 'verslag', count: number, prefix: string) {
  await database.db.insert(players).values(
    Array.from({ length: count }, (_, index) => ({
      name: `${prefix} ${index}`,
      searchTerm: `${prefix} ${index}`,
      season,
      source,
    })),
  )
}

describe('importOldSiteCompleteness', () => {
  it('stores a row with the best source verslag for a season with only players from the reports', async () => {
    await addPlayers('2004/05', 'verslag', 25, 'Verslag')

    const report = await importOldSiteCompleteness(database.db, first)
    const rows = await database.db.select().from(squadCompleteness)

    expect(report).toMatchObject({ changed: 0, created: 1, unchanged: 0 })
    expect(rows).toMatchObject([{ bestSource: 'verslag', playerCount: 25, season: '2004/05' }])
  })

  it('writes nothing in a second run without new data', async () => {
    await addPlayers('2004/05', 'verslag', 25, 'Verslag')
    await importOldSiteCompleteness(database.db, first)

    const report = await importOldSiteCompleteness(database.db, later)
    const [row] = await database.db.select().from(squadCompleteness)

    expect(report).toMatchObject({ changed: 0, created: 0, unchanged: 1 })
    expect(row?.calculatedAt).toEqual(first)
  })

  it('keeps the better source of a season that has a selection', async () => {
    await addPlayers('2013/14', 'selectie', 25, 'Selectie')
    await addPlayers('2013/14', 'verslag', 3, 'Verslag')

    await importOldSiteCompleteness(database.db, first)

    expect(await database.db.select().from(squadCompleteness)).toMatchObject([
      { bestSource: 'selectie', playerCount: 28, season: '2013/14' },
    ])
  })

  it('makes no row for a season without players from the reports', async () => {
    await addPlayers('2013/14', 'selectie', 25, 'Selectie')

    const report = await importOldSiteCompleteness(database.db, first)

    expect(report).toMatchObject({ changed: 0, created: 0, unchanged: 0 })
    expect(await database.db.select().from(squadCompleteness)).toEqual([])
  })
})
