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

const migration = '0065_add_country_of_persons'

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
  it('adds two empty columns, and the persons that were there stay as they are', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query(
      "INSERT INTO persons (wikipedia_page, name, line, line_source) VALUES ('Joost van Aken', 'Joost van Aken', 'verdediger', 'wikidata')",
    )

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT name, line, line_source, country, country_source FROM persons')).toEqual([
      { country: null, country_source: null, line: 'verdediger', line_source: 'wikidata', name: 'Joost van Aken' },
    ])
    expect(await rows("SHOW COLUMNS FROM persons LIKE 'country'")).toMatchObject([{ Null: 'YES', Type: 'char(2)' }])
    expect(await rows("SHOW COLUMNS FROM persons LIKE 'country_source'")).toMatchObject([
      { Null: 'YES', Type: "enum('manual','wikidata','list','squad','old-site')" },
    ])
  })

  it('can run again after it stopped halfway, and keeps the countries that are stored', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await database.pool.query(
      "INSERT INTO persons (wikipedia_page, country, country_source) VALUES ('Joost van Aken', 'NL', 'manual')",
    )

    const file = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of file.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    expect(await rows('SELECT country, country_source FROM persons')).toEqual([
      { country: 'NL', country_source: 'manual' },
    ])
  })
})
