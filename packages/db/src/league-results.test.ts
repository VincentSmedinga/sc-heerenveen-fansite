import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { NewLeagueResult } from './schema.ts'
import type { TestDatabase } from './test-database.ts'

import { leagueResults } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

const result = (overrides: Partial<NewLeagueResult> = {}): NewLeagueResult => ({
  awayClub: 'Feyenoord',
  awayGoals: 2,
  homeClub: 'Ajax',
  homeGoals: 1,
  playedOn: '2026-08-09',
  round: 1,
  season: '2026/27',
  ...overrides,
})

describe('the table league_results', () => {
  it('holds one match for a home club and an away club in a season', async () => {
    await database.db.insert(leagueResults).values(result())

    await expect(database.db.insert(leagueResults).values(result({ round: 18 }))).rejects.toThrow()
  })

  it('holds the same two clubs the other way round, and in another season', async () => {
    await database.db
      .insert(leagueResults)
      .values([result({ awayClub: 'Ajax', homeClub: 'Feyenoord', round: 18 }), result({ season: '2025/26' })])

    const rows = await database.db
      .select()
      .from(leagueResults)
      .where(and(eq(leagueResults.homeClub, 'Ajax'), eq(leagueResults.awayClub, 'Feyenoord')))

    expect(rows.map((row) => row.season).sort()).toEqual(['2025/26', '2026/27'])
  })

  it('reads the day back as the text it was written as', async () => {
    const [row] = await database.db
      .select()
      .from(leagueResults)
      .where(and(eq(leagueResults.season, '2026/27'), eq(leagueResults.homeClub, 'Ajax')))

    expect(row).toEqual(result())
  })
})
