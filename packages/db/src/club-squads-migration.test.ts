import type { RowDataPacket } from 'mysql2/promise'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

beforeEach(async () => {
  database = await createTestDatabase()
})

afterEach(async () => {
  await database?.drop()
})

describe('the migration of the squads of the clubs (#1541)', () => {
  it('makes the tables, which go with their club and leave the persons alone', async () => {
    const [keys] = await database.pool.query<RowDataPacket[]>(
      "SELECT table_name AS tbl, referenced_table_name AS target, delete_rule AS rule FROM information_schema.referential_constraints WHERE constraint_schema = DATABASE() AND table_name IN ('club_squad_players', 'club_squad_imports') ORDER BY tbl, target",
    )

    expect(keys).toEqual([
      { rule: 'CASCADE', target: 'clubs', tbl: 'club_squad_imports' },
      { rule: 'CASCADE', target: 'clubs', tbl: 'club_squad_players' },
      { rule: 'SET NULL', target: 'persons', tbl: 'club_squad_players' },
    ])
  })

  it('keeps one row for a name in a club', async () => {
    const [indexes] = await database.pool.query<RowDataPacket[]>(
      "SELECT index_name AS name FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'club_squad_players' AND non_unique = 0 AND index_name <> 'PRIMARY'",
    )

    expect(indexes).toEqual([{ name: 'club_squad_players_club_name_unique' }])
  })
})
