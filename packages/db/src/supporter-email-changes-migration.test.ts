import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

const migration = '0093_add_supporter_email_changes'

let database: TestDatabase

beforeEach(async () => {
  database = await createTestDatabase({ migrate: false })
  await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
})

afterEach(async () => {
  // Undefined when the server wasn't there, which beforeEach has already reported.
  await database?.drop()
})

async function addChange() {
  const [supporter] = await database.pool.query<ResultSetHeader>(
    "INSERT INTO supporters (screen_name, screen_name_key, email) VALUES ('Tjalle99', 'tjalle99', 'tjalle@example.test')",
  )

  await database.pool.query(
    "INSERT INTO supporter_email_changes (supporter_id, email, token_hash, expires_at) VALUES (?, 'nieuw@example.test', 't', UTC_TIMESTAMP())",
    [supporter.insertId],
  )

  return supporter.insertId
}

async function rows(sql: string, values: unknown[] = []) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql, values)

  return result
}

describe(`the migration ${migration}`, () => {
  it('makes the table in utf8mb4, empty', async () => {
    expect(await rows('SELECT COUNT(*) AS total FROM supporter_email_changes')).toEqual([{ total: 0 }])
    expect(
      await rows(
        "SELECT TABLE_COLLATION AS collation FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supporter_email_changes'",
      ),
    ).toEqual([{ collation: 'utf8mb4_unicode_ci' }])
  })

  it('removes the requests of a supporter with the account', async () => {
    const id = await addChange()

    await database.pool.query('DELETE FROM supporters WHERE id = ?', [id])

    expect(await rows('SELECT id FROM supporter_email_changes')).toEqual([])
  })

  it('can run again after it stopped halfway', async () => {
    await addChange()

    const file = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of file.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    expect(await rows('SELECT email FROM supporter_email_changes')).toEqual([{ email: 'nieuw@example.test' }])
  })
})
