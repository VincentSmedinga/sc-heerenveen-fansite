import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

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

async function rows(sql: string, values: unknown[] = []) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql, values)

  return result
}

describe('the migration 0094_add_supporter_blocking', () => {
  it('makes the table for the hashes in utf8mb4, empty, with a unique hash', async () => {
    expect(await rows('SELECT COUNT(*) AS total FROM supporter_blocked_addresses')).toEqual([{ total: 0 }])
    expect(
      await rows(
        "SELECT TABLE_COLLATION AS collation FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supporter_blocked_addresses'",
      ),
    ).toEqual([{ collation: 'utf8mb4_unicode_ci' }])

    await database.pool.query(
      "INSERT INTO supporter_blocked_addresses (address_hash, blocked_at) VALUES ('h', UTC_TIMESTAMP())",
    )

    await expect(
      database.pool.query(
        "INSERT INTO supporter_blocked_addresses (address_hash, blocked_at) VALUES ('h', UTC_TIMESTAMP())",
      ),
    ).rejects.toThrow(/Duplicate/u)
  })

  it('gives an account that is not told about a change of name, and accepts the new actions in the log', async () => {
    const [supporter] = await database.pool.query<ResultSetHeader>(
      "INSERT INTO supporters (screen_name, screen_name_key, email) VALUES ('Tjalle99', 'tjalle99', 'tjalle@example.test')",
    )

    expect(
      await rows('SELECT screen_name_edited_by_editors AS edited FROM supporters WHERE id = ?', [supporter.insertId]),
    ).toEqual([{ edited: 0 }])

    await database.pool.query(
      "INSERT INTO audit_log (created_at, action, item_id) VALUES (UTC_TIMESTAMP(), 'supporter.block', 1)",
    )
    expect(await rows('SELECT COUNT(*) AS total FROM audit_log')).toEqual([{ total: 1 }])
  })

  it('can run again without an error', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    expect(await rows('SELECT COUNT(*) AS total FROM supporter_blocked_addresses')).toEqual([{ total: 0 }])
  })
})
