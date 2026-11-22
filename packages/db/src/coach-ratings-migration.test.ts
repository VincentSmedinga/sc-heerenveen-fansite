import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

const migration = '0105_add_coach_ratings'

let database: TestDatabase

beforeEach(async () => {
  database = await createTestDatabase({ migrate: false })
  await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
})

afterEach(async () => {
  // Undefined when the server wasn't there, which beforeEach has already reported.
  await database?.drop()
})

async function addMatchCoachAndSupporter() {
  await database.pool.query("INSERT IGNORE INTO clubs (slug, name) VALUES ('nec', 'NEC')")

  const [match] = await database.pool.query<ResultSetHeader>(
    "INSERT INTO matches (competition, round, season, match_date, kickoff_at, opponent, club_id, home, status, goals_for, goals_against) VALUES ('Eredivisie', 'Speelronde 1', '2026/27', '2026-08-08', '2026-08-08 16:45:00', 'NEC', (SELECT id FROM clubs WHERE slug = 'nec'), 1, 'played', 1, 0)",
  )
  const [coach] = await database.pool.query<ResultSetHeader>(
    "INSERT INTO staff (role, name, start_date, start_precision) VALUES ('coach', 'Test Trainer', '2026-01-01', 'day')",
  )
  const [supporter] = await database.pool.query<ResultSetHeader>(
    "INSERT INTO supporters (screen_name, screen_name_key, email) VALUES ('Tjalle', 'tjalle', 'tjalle@example.test')",
  )

  return { matchId: match.insertId, staffId: coach.insertId, supporterId: supporter.insertId }
}

const rate = (supporterId: null | number, matchId: number, staffId: number, grade: number) =>
  database.pool.query('INSERT INTO coach_ratings (supporter_id, match_id, staff_id, grade) VALUES (?, ?, ?, ?)', [
    supporterId,
    matchId,
    staffId,
    grade,
  ])

const total = async () => {
  const [rows] = await database.pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM coach_ratings')

  return rows
}

describe(`the migration ${migration}`, () => {
  it('makes the table in utf8mb4, empty', async () => {
    const [collation] = await database.pool.query<RowDataPacket[]>(
      "SELECT TABLE_COLLATION AS collation FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'coach_ratings'",
    )

    expect(await total()).toEqual([{ total: 0 }])
    expect(collation).toEqual([{ collation: 'utf8mb4_unicode_ci' }])
  })

  it('accepts a grade from 1 to 10, one for each supporter and match, and refuses another grade', async () => {
    const { matchId, staffId, supporterId } = await addMatchCoachAndSupporter()

    await expect(rate(supporterId, matchId, staffId, 0)).rejects.toThrow()
    await expect(rate(supporterId, matchId, staffId, 11)).rejects.toThrow()
    await expect(rate(supporterId, matchId, staffId, 1)).resolves.toBeDefined()
    await expect(rate(supporterId, matchId, staffId, 10)).rejects.toThrow(/Duplicate entry/)
  })

  it('keeps the grade without a link when the account goes, and loses it with the match', async () => {
    const { matchId, staffId, supporterId } = await addMatchCoachAndSupporter()

    await rate(supporterId, matchId, staffId, 7)
    await database.pool.query('DELETE FROM supporters WHERE id = ?', [supporterId])

    const [kept] = await database.pool.query<RowDataPacket[]>('SELECT supporter_id, grade FROM coach_ratings')

    expect(kept).toEqual([{ grade: 7, supporter_id: null }])

    await database.pool.query('DELETE FROM matches WHERE id = ?', [matchId])

    expect(await total()).toEqual([{ total: 0 }])
  })
})
