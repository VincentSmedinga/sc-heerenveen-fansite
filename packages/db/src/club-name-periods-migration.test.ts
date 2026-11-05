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

const migration = '0039_add_club_name_periods'

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
  it('makes the table club_name_periods empty, with the character set of the other tables, and does nothing the second time', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })

    expect(await rows("SHOW TABLES LIKE 'club_name_periods'")).toEqual([])

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT COUNT(*) AS n FROM club_name_periods')).toMatchObject([{ n: 0 }])
    expect(
      await rows(
        "SELECT table_collation FROM information_schema.tables WHERE table_name = 'club_name_periods' AND table_schema = DATABASE()",
      ),
    ).toMatchObject([{ table_collation: 'utf8mb4_unicode_ci' }])
  })

  it('lets the log take the two actions of the names of a club and keeps the rows that were there', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query(
      "INSERT INTO audit_log (created_at, action, item_id, detail) VALUES ('2026-10-21 10:00:00', 'match.keep', 7, 'x')",
    )
    await expect(
      database.pool.query(
        "INSERT INTO audit_log (created_at, action, item_id) VALUES ('2026-10-21 10:00:00', 'club-name.save', 1)",
      ),
    ).rejects.toBeDefined()

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    for (const action of ['club-name.save', 'club-name.reset']) {
      await database.pool.query(
        "INSERT INTO audit_log (created_at, action, item_id) VALUES ('2026-11-04 10:00:00', ?, 1)",
        [action],
      )
    }

    expect(await rows('SELECT action, item_id FROM audit_log ORDER BY id')).toEqual([
      { action: 'match.keep', item_id: 7 },
      { action: 'club-name.save', item_id: 1 },
      { action: 'club-name.reset', item_id: 1 },
    ])
  })
})
