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

const migration = '0084_drop_club_stadiums'

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

describe('the migration that drops club_stadiums', () => {
  it('drops the empty table, and does nothing the second time', async () => {
    await prepare(oldFolder)
    expect(await rows("SHOW TABLES LIKE 'club_stadiums'")).toHaveLength(1)

    await prepare(migrationsFolder)
    expect(await rows("SHOW TABLES LIKE 'club_stadiums'")).toEqual([])

    await prepare(migrationsFolder)
    expect(await rows("SHOW TABLES LIKE 'club_stadiums'")).toEqual([])
  })

  it('refuses a table that has a row, names why, and leaves the row where it is', async () => {
    await prepare(oldFolder)
    await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('Oefenstad', 'oefenstad')")
    await database.pool.query(
      "INSERT INTO club_stadiums (club_id, position, name) SELECT id, 0, 'Oefenveld' FROM clubs WHERE slug = 'oefenstad'",
    )

    await expect(prepare(migrationsFolder)).rejects.toThrow(/club_stadiums_still_has_rows/u)
    expect(await rows('SELECT name FROM club_stadiums')).toMatchObject([{ name: 'Oefenveld' }])
  })
})
