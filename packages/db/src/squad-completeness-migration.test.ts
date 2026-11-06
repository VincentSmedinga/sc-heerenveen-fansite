import type { RowDataPacket } from 'mysql2/promise'

import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { playerSources, squadCompletenessLevels } from './schema.ts'
import { seedSquad } from './seed.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

let database: TestDatabase

beforeEach(async () => {
  database = await createTestDatabase({ migrate: false })
})

afterEach(async () => {
  // Undefined when the server wasn't there, which beforeEach has already reported.
  await database?.drop()
})

async function rows(sql: string) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql)

  return result
}

describe('the migration 0043_add_squad_completeness', () => {
  it('adds a table next to the seeded players, and does nothing the second time', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    expect(await seedSquad(database.db)).toBe(true)

    const before = await rows('SELECT COUNT(*) AS n FROM players')

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    // The only row is the chance of the made-up squad, which the seed puts in with the players.
    expect(await rows('SELECT COUNT(*) AS n FROM squad_completeness')).toEqual([{ n: 1 }])
    expect(await rows('SELECT COUNT(*) AS n FROM players')).toEqual(before)
  })

  it('keeps the levels and the sources in the database in the order of the lists', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows("SHOW COLUMNS FROM squad_completeness LIKE 'level'")).toMatchObject([
      { Type: `enum(${squadCompletenessLevels.map((level) => `'${level}'`).join(',')})` },
    ])
    expect(await rows("SHOW COLUMNS FROM squad_completeness LIKE 'best_source'")).toMatchObject([
      { Type: `enum(${playerSources.map((source) => `'${source}'`).join(',')})` },
    ])
  })

  it('takes a chance from 0 to 100 and one row for each season, and leaves the sums empty', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    const insert = (probability: number) =>
      database.pool.query(
        `INSERT INTO squad_completeness (season, probability, level, player_count, best_source, checks, calculated_at)
         VALUES ('2025/26', ${probability}, 'compleet', 26, 'selectie', '[]', '2026-11-06 10:00:00')`,
      )

    await insert(100)

    expect(await rows('SELECT matches_total, goals_total FROM squad_completeness')).toEqual([
      { goals_total: null, matches_total: null },
    ])
    await expect(insert(100)).rejects.toThrow()
    await expect(insert(101)).rejects.toThrow()
  })
})
