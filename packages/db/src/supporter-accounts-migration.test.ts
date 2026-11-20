import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

const migration = '0092_add_supporter_accounts'

const tables = ['supporter_login_attempts', 'supporter_login_links', 'supporter_sessions', 'supporters']

let database: TestDatabase

beforeEach(async () => {
  database = await createTestDatabase({ migrate: false })
  await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
})

afterEach(async () => {
  // Undefined when the server wasn't there, which beforeEach has already reported.
  await database?.drop()
})

async function addSupporter(email = 'tjalle@example.test', key = 'tjalle99') {
  const [result] = await database.pool.query<ResultSetHeader>(
    'INSERT INTO supporters (screen_name, screen_name_key, email) VALUES (?, ?, ?)',
    ['Tjalle99', key, email],
  )

  return result.insertId
}

async function rows(sql: string, values: unknown[] = []) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql, values)

  return result
}

describe(`the migration ${migration}`, () => {
  it('makes the four tables in utf8mb4, empty', async () => {
    for (const table of tables) {
      expect(await rows('SELECT COUNT(*) AS total FROM ??', [table]), table).toEqual([{ total: 0 }])
      expect(
        (
          await rows(
            'SELECT TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
            [table],
          )
        )[0]?.['TABLE_COLLATION'],
        table,
      ).toBe('utf8mb4_unicode_ci')
    }
  })

  it('gives a supporter the defaults, and keeps the address and the normalised name unique', async () => {
    await addSupporter()

    expect(
      await rows(
        'SELECT in_rankings, last_visit_on, screen_name_changed_at, disabled_at, disabled_reason FROM supporters',
      ),
    ).toEqual([
      { disabled_at: null, disabled_reason: null, in_rankings: 1, last_visit_on: null, screen_name_changed_at: null },
    ])
    await expect(addSupporter('tjalle@example.test', 'other')).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' })
    await expect(addSupporter('other@example.test', 'tjalle99')).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' })
  })

  it('lets a link be a login of an account or a sign-up with an address and a name, and nothing in between', async () => {
    const id = await addSupporter()
    const insert = (values: string) =>
      database.pool.query(
        `INSERT INTO supporter_login_links (token_hash, expires_at, supporter_id, email, screen_name, screen_name_key) VALUES ${values}`,
      )

    await insert(`('a', UTC_TIMESTAMP(), ${id}, NULL, NULL, NULL)`)
    await insert("('b', UTC_TIMESTAMP(), NULL, 'sietske@example.test', 'Sietske', 'sletske')")
    // MariaDB says 4025; mysql2 knows that number under another name, so the message is
    // compared.
    const refused = /CONSTRAINT `supporter_login_links_login_or_sign_up` failed/

    await expect(insert("('c', UTC_TIMESTAMP(), NULL, NULL, NULL, NULL)")).rejects.toThrow(refused)
    await expect(insert(`('d', UTC_TIMESTAMP(), ${id}, 'x@example.test', 'X', 'x')`)).rejects.toThrow(refused)
  })

  it('removes the sessions and the links of a supporter with the account', async () => {
    const id = await addSupporter()

    await database.pool.query(
      'INSERT INTO supporter_sessions (token_hash, supporter_id, created_at, last_seen_at) VALUES (?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())',
      ['s', id],
    )
    await database.pool.query(
      'INSERT INTO supporter_login_links (token_hash, expires_at, supporter_id) VALUES (?, UTC_TIMESTAMP(), ?)',
      ['l', id],
    )
    await database.pool.query('DELETE FROM supporters WHERE id = ?', [id])

    expect(await rows('SELECT id FROM supporter_sessions')).toEqual([])
    expect(await rows('SELECT id FROM supporter_login_links')).toEqual([])
  })

  it('can run again after it stopped halfway', async () => {
    await addSupporter()

    const file = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of file.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    expect(await rows('SELECT email FROM supporters')).toEqual([{ email: 'tjalle@example.test' }])
  })
})
