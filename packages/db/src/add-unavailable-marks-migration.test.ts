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

const migration = '0085_add_unavailable_marks'

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

const prepare = (folder: string) => prepareDatabase({ migrationsFolder: folder, seed: false, url: database.url })

describe('the migration that adds unavailable_marks', () => {
  it('adds the table and the three log actions, and changes no row', async () => {
    await prepare(oldFolder)
    await database.pool.query(
      "INSERT INTO audit_log (action, created_at, item_id) VALUES ('person.edit', UTC_TIMESTAMP(), 7)",
    )
    expect(await rows("SHOW TABLES LIKE 'unavailable_marks'")).toEqual([])

    await prepare(migrationsFolder)

    expect(await rows("SHOW TABLES LIKE 'unavailable_marks'")).toHaveLength(1)
    expect(String((await rows("SHOW COLUMNS FROM audit_log LIKE 'action'"))[0]?.['Type'])).toContain("'gap.renew'")
    expect(await rows('SELECT action, item_id FROM audit_log')).toEqual([{ action: 'person.edit', item_id: 7 }])
    expect(String((await rows('SHOW CREATE TABLE unavailable_marks'))[0]?.['Create Table'])).toContain('utf8mb4')
  })

  it('has one mark for each field of a person, and a mark is empty of an account when it goes', async () => {
    await prepare(migrationsFolder)
    await database.pool.query(
      "INSERT INTO unavailable_marks (subject, subject_id, field, checked_on) VALUES ('person', 1, 'wikipedia', '2026-11-16')",
    )

    await expect(
      database.pool.query(
        "INSERT INTO unavailable_marks (subject, subject_id, field, checked_on) VALUES ('person', 1, 'wikipedia', '2026-11-17')",
      ),
    ).rejects.toThrow()
    await database.pool.query(
      "INSERT INTO unavailable_marks (subject, subject_id, field, checked_on) VALUES ('person', 1, 'geboren', '2026-11-17')",
    )
  })

  it('can run again', async () => {
    await prepare(migrationsFolder)
    await expect(prepare(migrationsFolder)).resolves.not.toThrow()
  })
})
