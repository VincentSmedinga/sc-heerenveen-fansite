import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

const migration = '0101_add_supporter_ratings'

let database: TestDatabase

beforeEach(async () => {
  database = await createTestDatabase({ migrate: false })
  await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
})

afterEach(async () => {
  // Undefined when the server wasn't there, which beforeEach has already reported.
  await database?.drop()
})

async function addMatchAndPlayer() {
  await database.pool.query("INSERT IGNORE INTO clubs (slug, name) VALUES ('nec', 'NEC')")

  const [match] = await database.pool.query<ResultSetHeader>(
    "INSERT INTO matches (competition, round, season, match_date, kickoff_at, opponent, club_id, home, status) VALUES ('Eredivisie', 'Speelronde 1', '2001/02', '2001-09-01', '2001-09-01 20:00:00', 'NEC', (SELECT id FROM clubs WHERE slug = 'nec'), 1, 'scheduled')",
  )
  const [player] = await database.pool.query<ResultSetHeader>(
    "INSERT INTO players (season, name, search_term) VALUES ('2001/02', 'Hans Vonk', 'Vonk')",
  )

  return { matchId: match.insertId, playerId: player.insertId }
}

async function rows(sql: string, values: unknown[] = []) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql, values)

  return result
}

const rate = (matchId: number, playerId: number, average: number, count = 10, source = 'oude-fansite') =>
  database.pool.query(
    'INSERT INTO match_player_ratings (match_id, player_id, source, average, rating_count, spread) VALUES (?, ?, ?, ?, ?, 1.1)',
    [matchId, playerId, source, average, count],
  )

describe(`the migration ${migration}`, () => {
  it('makes the three tables in utf8mb4, empty', async () => {
    for (const table of ['match_player_ratings', 'old_season_ratings', 'old_season_winners']) {
      expect(await rows(`SELECT COUNT(*) AS total FROM ${table}`)).toEqual([{ total: 0 }])
      expect(
        await rows(
          'SELECT TABLE_COLLATION AS collation FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
          [table],
        ),
      ).toEqual([{ collation: 'utf8mb4_unicode_ci' }])
    }
  })

  it('keeps one average for each match, player and source', async () => {
    const { matchId, playerId } = await addMatchAndPlayer()

    await rate(matchId, playerId, 7.25)

    await expect(rate(matchId, playerId, 8)).rejects.toThrow(/Duplicate entry/)
    await expect(rate(matchId, playerId, 8, 10, 'fans')).resolves.toBeDefined()
    expect(
      await rows('SELECT average, rating_count FROM match_player_ratings WHERE source = ?', ['oude-fansite']),
    ).toEqual([{ average: '7.25', rating_count: 10 }])
  })

  it('accepts a grade from 1 to 10 and refuses another grade, a count of zero and an unknown source', async () => {
    const { matchId, playerId } = await addMatchAndPlayer()

    await expect(rate(matchId, playerId, 1, 1, 'fans')).resolves.toBeDefined()
    await expect(rate(matchId, playerId, 10)).resolves.toBeDefined()
    await expect(
      database.pool.query('UPDATE match_player_ratings SET average = 10.5 WHERE source = ?', ['fans']),
    ).rejects.toThrow(/CONSTRAINT|Out of range/)
    await expect(database.pool.query('UPDATE match_player_ratings SET average = 0.5')).rejects.toThrow()
    await expect(database.pool.query('UPDATE match_player_ratings SET rating_count = 0')).rejects.toThrow(/CONSTRAINT/)
    await expect(rate(matchId, playerId, 7, 5, 'iemand')).rejects.toThrow()
  })

  it('removes the averages with the match, and with the player', async () => {
    const { matchId, playerId } = await addMatchAndPlayer()

    await rate(matchId, playerId, 7)
    await database.pool.query('DELETE FROM players WHERE id = ?', [playerId])

    expect(await rows('SELECT COUNT(*) AS total FROM match_player_ratings')).toEqual([{ total: 0 }])
  })

  it('keeps the season rating and the winner by name when the player goes', async () => {
    const { playerId } = await addMatchAndPlayer()

    await database.pool.query(
      "INSERT INTO old_season_ratings (season, player_id, name, average) VALUES ('2000/01', ?, 'Hans Vonk', 6.8)",
      [playerId],
    )
    await database.pool.query(
      "INSERT INTO old_season_winners (season, player_id, name) VALUES ('2000/01', ?, 'Hans Vonk')",
      [playerId],
    )
    await database.pool.query('DELETE FROM players WHERE id = ?', [playerId])

    expect(await rows('SELECT name, player_id FROM old_season_ratings')).toEqual([
      { name: 'Hans Vonk', player_id: null },
    ])
    expect(await rows('SELECT name, player_id FROM old_season_winners')).toEqual([
      { name: 'Hans Vonk', player_id: null },
    ])
    await expect(
      database.pool.query("INSERT INTO old_season_winners (season, name) VALUES ('2000/01', 'Een ander')"),
    ).rejects.toThrow(/Duplicate entry/)
  })
})
