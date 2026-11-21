import type { RowDataPacket } from 'mysql2/promise'

import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

let database: TestDatabase

beforeEach(async () => {
  database = await createTestDatabase({ migrate: false })
  await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
})

afterEach(async () => {
  // Undefined when the server wasn't there, which beforeEach has already reported.
  await database?.drop()
})

async function rows(sql: string) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql)

  return result
}

describe('the migration 0100_add_supporter_reminders', () => {
  it('makes the table, with one row for each supporter and match', async () => {
    await database.pool.query(
      "INSERT INTO supporters (screen_name, screen_name_key, email) VALUES ('Tjalle99', 'tjalle99', 'tjalle@example.test')",
    )
    await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('FC Twente', 'fc-twente')")
    await database.pool.query(
      "INSERT INTO matches (season, competition, round, opponent, club_id, home, status, match_date, kickoff_at) VALUES ('2026/27', 'Eredivisie', 'Speelronde 1', 'FC Twente', 1, 1, 'scheduled', '2026-11-21', '2026-11-21 15:45:00')",
    )
    await database.pool.query('INSERT INTO supporter_reminders (supporter_id, match_id) VALUES (1, 1)')

    await expect(
      database.pool.query('INSERT INTO supporter_reminders (supporter_id, match_id) VALUES (1, 1)'),
    ).rejects.toThrow()
    expect(await rows('SELECT supporter_id AS supporter, match_id AS m FROM supporter_reminders')).toEqual([
      { m: 1, supporter: 1 },
    ])

    await database.pool.query('DELETE FROM supporters')

    expect(await rows('SELECT id FROM supporter_reminders')).toEqual([])
  })

  it('can run again without an error', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows("SHOW TABLES LIKE 'supporter_reminders'")).toHaveLength(1)
  })
})
