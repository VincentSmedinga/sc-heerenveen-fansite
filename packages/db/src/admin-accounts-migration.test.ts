import type { RowDataPacket } from 'mysql2/promise'

import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

const migration = '0072_manage_admin_accounts'

let database: TestDatabase
let oldFolder: string

beforeEach(async () => {
  database = await createTestDatabase({ migrate: false })

  // The migrations as they were before this one: the same files, without it and the ones after
  // it in the journal.
  oldFolder = await mkdtemp(join(tmpdir(), 'fansite-migrations-'))
  await cp(migrationsFolder, oldFolder, { recursive: true })

  const journalPath = join(oldFolder, 'meta', '_journal.json')
  const journal = JSON.parse(await readFile(journalPath, 'utf8')) as { entries: { tag: string }[] }

  journal.entries = journal.entries.slice(
    0,
    journal.entries.findIndex((entry) => entry.tag === migration),
  )
  await writeFile(journalPath, JSON.stringify(journal))
})

afterEach(async () => {
  await rm(oldFolder, { force: true, recursive: true })
  // Undefined when the server wasn't there, which beforeEach has already reported.
  await database?.drop()
})

async function rows(sql: string) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql)

  return result
}

describe(`the migration ${migration}`, () => {
  it('makes every beheerder and moderator an editor, with an empty first name and the mail on', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query(
      "INSERT INTO admin_users (email, role, disabled_at) VALUES ('sanne@example.test', 'beheerder', NULL), ('jelle@example.test', 'moderator', NULL), ('oud@example.test', 'moderator', '2026-11-01 12:00:00')",
    )

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(
      await rows(
        "SELECT email, role, first_name, conflict_mail, DATE_FORMAT(disabled_at, '%Y-%m-%d') AS disabled_at FROM admin_users ORDER BY id",
      ),
    ).toEqual([
      { conflict_mail: 1, disabled_at: null, email: 'sanne@example.test', first_name: '', role: 'editor' },
      { conflict_mail: 1, disabled_at: null, email: 'jelle@example.test', first_name: '', role: 'editor' },
      { conflict_mail: 1, disabled_at: '2026-11-01', email: 'oud@example.test', first_name: '', role: 'editor' },
    ])
    expect((await rows("SHOW COLUMNS FROM admin_users LIKE 'role'"))[0]?.['Type']).toBe(
      "enum('owner','editor','author')",
    )
  })

  it('can run again after it stopped halfway', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('eigenaar@example.test', 'owner')")

    const file = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of file.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    expect(await rows('SELECT email, role FROM admin_users')).toEqual([
      { email: 'eigenaar@example.test', role: 'owner' },
    ])
  })
})
