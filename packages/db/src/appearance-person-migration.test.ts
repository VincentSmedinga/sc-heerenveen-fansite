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

describe('the migration of the person of an appearance (#1544)', () => {
  it('adds an empty column with an index, pointing to persons', async () => {
    const [columns] = await database.pool.query<RowDataPacket[]>(
      "SELECT is_nullable AS nullable FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'match_appearances' AND column_name = 'person_id'",
    )
    const [indexes] = await database.pool.query<RowDataPacket[]>(
      "SELECT index_name AS name FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'match_appearances' AND index_name = 'match_appearances_person_id_idx'",
    )
    const [keys] = await database.pool.query<RowDataPacket[]>(
      "SELECT delete_rule AS rule, referenced_table_name AS target FROM information_schema.referential_constraints WHERE constraint_schema = DATABASE() AND constraint_name = 'match_appearances_person_id_persons_id_fk'",
    )

    expect(columns).toEqual([{ nullable: 'YES' }])
    expect(indexes).toHaveLength(1)
    expect(keys).toEqual([{ rule: 'SET NULL', target: 'persons' }])
  })
})
