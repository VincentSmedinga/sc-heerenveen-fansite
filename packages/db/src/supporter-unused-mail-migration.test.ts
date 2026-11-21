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

describe('the migration 0098_add_supporter_unused_mail', () => {
  it('adds the column, empty for an account', async () => {
    await database.pool.query(
      "INSERT INTO supporters (screen_name, screen_name_key, email) VALUES ('Tjalle99', 'tjalle99', 'tjalle@example.test')",
    )

    expect(await rows('SELECT unused_mail_sent_at AS sent FROM supporters')).toEqual([{ sent: null }])
  })

  it('can run again without an error', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows("SHOW COLUMNS FROM supporters LIKE 'unused_mail_sent_at'")).toHaveLength(1)
  })
})
