import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

const migration = '0103_add_match_prediction_counts'

let database: TestDatabase

beforeEach(async () => {
  database = await createTestDatabase({ migrate: false })
  await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
})

afterEach(async () => {
  // Undefined when the server wasn't there, which beforeEach has already reported.
  await database?.drop()
})

async function addMatch() {
  await database.pool.query("INSERT IGNORE INTO clubs (slug, name) VALUES ('nec', 'NEC')")

  const [match] = await database.pool.query<ResultSetHeader>(
    "INSERT INTO matches (competition, round, season, match_date, kickoff_at, opponent, club_id, home, status) VALUES ('Eredivisie', 'Speelronde 1', '2001/02', '2001-09-01', '2001-09-01 20:00:00', 'NEC', (SELECT id FROM clubs WHERE slug = 'nec'), 1, 'scheduled')",
  )

  return match.insertId
}

const count = (matchId: number, kind: string, home: number, away: number, predictionCount: number) =>
  database.pool.query(
    "INSERT INTO match_prediction_counts (match_id, source, kind, home, away, prediction_count) VALUES (?, 'oude-fansite', ?, ?, ?, ?)",
    [matchId, kind, home, away, predictionCount],
  )

describe(`the migration ${migration}`, () => {
  it('makes the table in utf8mb4, empty', async () => {
    const [rows] = await database.pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM match_prediction_counts')
    const [collation] = await database.pool.query<RowDataPacket[]>(
      "SELECT TABLE_COLLATION AS collation FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'match_prediction_counts'",
    )

    expect(rows).toEqual([{ total: 0 }])
    expect(collation).toEqual([{ collation: 'utf8mb4_unicode_ci' }])
  })

  it('keeps one row for each match, kind and score, and refuses a count of zero', async () => {
    const matchId = await addMatch()

    await count(matchId, 'full_time', 2, 1, 14)
    await count(matchId, 'half_time', 2, 1, 3)
    await expect(count(matchId, 'full_time', 2, 1, 5)).rejects.toThrow()
    await expect(count(matchId, 'full_time', 1, 1, 0)).rejects.toThrow()
  })

  it('goes with the match', async () => {
    const matchId = await addMatch()

    await count(matchId, 'full_time', 2, 1, 14)
    await database.pool.query('DELETE FROM matches WHERE id = ?', [matchId])

    const [rows] = await database.pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM match_prediction_counts')

    expect(rows).toEqual([{ total: 0 }])
  })
})
