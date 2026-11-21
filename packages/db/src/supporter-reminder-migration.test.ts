import type { RowDataPacket } from 'mysql2/promise'

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

const migration = '0096_add_supporter_reminder'

let database: TestDatabase

beforeEach(async () => {
  database = await createTestDatabase({ migrate: false })
  await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
})

afterEach(async () => {
  // Undefined when the server wasn't there, which beforeEach has already reported.
  await database?.drop()
})

async function addSupporter() {
  await database.pool.query(
    "INSERT INTO supporters (screen_name, screen_name_key, email) VALUES ('Tjalle99', 'tjalle99', 'tjalle@example.test')",
  )
}

async function rows(sql: string) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql)

  return result
}

describe(`the migration ${migration}`, () => {
  it('adds the column, off for a new supporter', async () => {
    await addSupporter()

    expect(await rows('SELECT remind_by_email AS remind FROM supporters')).toEqual([{ remind: 0 }])
    expect(
      await rows(
        "SELECT IS_NULLABLE AS nullable FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supporters' AND COLUMN_NAME = 'remind_by_email'",
      ),
    ).toEqual([{ nullable: 'NO' }])
  })

  it('can run again after it stopped halfway, and keeps the choice', async () => {
    await addSupporter()
    await database.pool.query('UPDATE supporters SET remind_by_email = TRUE')

    const file = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of file.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    expect(await rows('SELECT remind_by_email AS remind FROM supporters')).toEqual([{ remind: 1 }])
  })
})
