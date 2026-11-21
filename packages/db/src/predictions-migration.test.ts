import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

const migration = '0098_add_predictions'

let database: TestDatabase

beforeEach(async () => {
  database = await createTestDatabase({ migrate: false })
  await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
})

afterEach(async () => {
  // Undefined when the server wasn't there, which beforeEach has already reported.
  await database?.drop()
})

async function addMatch(round = 'Speelronde 1') {
  await database.pool.query("INSERT IGNORE INTO clubs (slug, name) VALUES ('willem-ii', 'Willem II')")

  const [match] = await database.pool.query<ResultSetHeader>(
    "INSERT INTO matches (competition, round, season, match_date, kickoff_at, opponent, club_id, home, status) VALUES ('Eredivisie', ?, '2026/27', '2026-11-28', '2026-11-28 15:45:00', 'Willem II', (SELECT id FROM clubs WHERE slug = 'willem-ii'), 1, 'scheduled')",
    [round],
  )

  return match.insertId
}

async function addSupporter(name = 'Tjalle99') {
  const [supporter] = await database.pool.query<ResultSetHeader>(
    'INSERT INTO supporters (screen_name, screen_name_key, email) VALUES (?, ?, ?)',
    [name, name.toLowerCase(), `${name.toLowerCase()}@example.test`],
  )

  return supporter.insertId
}

async function rows(sql: string, values: unknown[] = []) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql, values)

  return result
}

const predict = (supporterId: null | number, matchId: number, goals: [number, number, number, number] = [1, 0, 2, 1]) =>
  database.pool.query(
    'INSERT INTO predictions (supporter_id, match_id, halftime_home, halftime_away, full_time_home, full_time_away) VALUES (?, ?, ?, ?, ?, ?)',
    [supporterId, matchId, ...goals],
  )

describe(`the migration ${migration}`, () => {
  it('makes the table in utf8mb4, empty', async () => {
    expect(await rows('SELECT COUNT(*) AS total FROM predictions')).toEqual([{ total: 0 }])
    expect(
      await rows(
        "SELECT TABLE_COLLATION AS collation FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'predictions'",
      ),
    ).toEqual([{ collation: 'utf8mb4_unicode_ci' }])
  })

  it('keeps one prediction per supporter and match', async () => {
    const supporter = await addSupporter()
    const match = await addMatch()

    await predict(supporter, match)

    await expect(predict(supporter, match)).rejects.toThrow(/Duplicate entry/)
    await expect(predict(await addSupporter('Pompebled'), match)).resolves.toBeDefined()
    await expect(predict(supporter, await addMatch('Speelronde 2'))).resolves.toBeDefined()
  })

  it('accepts goals from 0 to 9 and refuses a goal above 9 or below 0', async () => {
    const supporter = await addSupporter()
    const match = await addMatch()

    await expect(predict(supporter, match, [0, 0, 9, 9])).resolves.toBeDefined()
    await expect(predict(supporter, await addMatch('Speelronde 2'), [0, 0, 10, 0])).rejects.toThrow(/CONSTRAINT/)
    await expect(predict(supporter, await addMatch('Speelronde 3'), [0, 10, 1, 1])).rejects.toThrow(/CONSTRAINT/)
    await expect(predict(supporter, await addMatch('Speelronde 4'), [-1, 0, 1, 1])).rejects.toThrow()
  })

  it('refuses a prediction that has no value for a score', async () => {
    const supporter = await addSupporter()
    const match = await addMatch()

    await expect(
      database.pool.query(
        'INSERT INTO predictions (supporter_id, match_id, halftime_home, halftime_away, full_time_home) VALUES (?, ?, 1, 0, 2)',
        [supporter, match],
      ),
    ).rejects.toThrow()
  })

  it('sets the creation and the change to the time in UTC', async () => {
    await predict(await addSupporter(), await addMatch())

    expect(
      await rows(
        'SELECT ABS(TIMESTAMPDIFF(SECOND, created_at, UTC_TIMESTAMP())) < 60 AS fresh, created_at = updated_at AS same FROM predictions',
      ),
    ).toEqual([{ fresh: 1, same: 1 }])
  })

  it('empties the supporter when the account is closed, and keeps the prediction', async () => {
    const supporter = await addSupporter()
    const match = await addMatch()

    await predict(supporter, match)
    await database.pool.query('DELETE FROM supporters WHERE id = ?', [supporter])

    expect(await rows('SELECT supporter_id, full_time_home FROM predictions')).toEqual([
      { full_time_home: 2, supporter_id: null },
    ])
  })

  it('keeps several predictions without a supporter for the same match', async () => {
    const match = await addMatch()

    await predict(null, match)

    await expect(predict(null, match)).resolves.toBeDefined()
  })

  it('removes the predictions with the match', async () => {
    const match = await addMatch()

    await predict(await addSupporter(), match)
    await database.pool.query('DELETE FROM matches WHERE id = ?', [match])

    expect(await rows('SELECT id FROM predictions')).toEqual([])
  })

  it('can run again after it stopped halfway', async () => {
    await predict(await addSupporter(), await addMatch())

    const file = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of file.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    expect(await rows('SELECT full_time_home FROM predictions')).toEqual([{ full_time_home: 2 }])
  })
})
