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

const migration = '0069_add_person_slugs'

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
  it('adds the table and the column, and the site gives the players their addresses after it', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    // A made-up player of ours and a made-up player of an opponent.
    await database.pool.query("INSERT INTO persons (id, name) VALUES (1, 'Jan de Vries'), (2, 'Piet Tegenstander')")
    await database.pool.query(
      "INSERT INTO players (season, name, search_term, person_id) VALUES ('2004/05', 'Jan de Vries', 'jan de vries', 1)",
    )

    await prepareDatabase({ addresses: true, migrationsFolder, seed: false, url: database.url })
    await prepareDatabase({ addresses: true, migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT id, slug FROM persons ORDER BY id')).toEqual([
      { id: 1, slug: 'jan-de-vries' },
      { id: 2, slug: null },
    ])
    expect(await rows('SELECT slug, person_id FROM person_slugs')).toEqual([{ person_id: 1, slug: 'jan-de-vries' }])
  })

  it('can run again after it stopped halfway, and keeps the slugs that are stored', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    const file = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of file.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    await database.pool.query("INSERT INTO persons (id, slug) VALUES (1, 'jan-de-vries')")
    await expect(database.pool.query("INSERT INTO persons (id, slug) VALUES (2, 'jan-de-vries')")).rejects.toThrow()
    await expect(database.pool.query("INSERT INTO person_slugs VALUES ('Jan', 1)")).rejects.toThrow()
  })
})
