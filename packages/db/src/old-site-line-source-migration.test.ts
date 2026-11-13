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

const migration = '0066_add_old_site_line_source'

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
  it('lets a line come from the old fansite, and the rows that were there stay as they are', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query(
      `INSERT INTO persons (wikipedia_page, line, line_source, country, country_source)
       VALUES ('Van Wikidata', 'verdediger', 'wikidata', 'NL', 'wikidata'),
              ('Van De Selectie', 'aanvaller', 'squad', NULL, NULL),
              ('Van De Redactie', 'doelman', 'manual', 'DK', 'manual'),
              ('Zonder', NULL, NULL, NULL, NULL)`,
    )
    await database.pool.query("INSERT INTO player_list_titles (title, read_at) VALUES ('Van Wikidata', now())")

    const before = await rows('SELECT * FROM persons ORDER BY id')

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    // Later migrations add `slug` (#1079), the date of death (#1147), the source of the birth
    // date (#1164) and the side (#1194), which stay empty here: these persons have none.
    expect(await rows('SELECT * FROM persons ORDER BY id')).toEqual(
      before.map((row) => ({
        ...row,
        birth_date_source: null,
        death_date: null,
        death_date_precision: null,
        death_date_source: null,
        side: null,
        slug: null,
      })),
    )
    expect(await rows('SELECT title, country FROM player_list_titles')).toEqual([
      { country: null, title: 'Van Wikidata' },
    ])
    expect(await rows("SHOW COLUMNS FROM persons LIKE 'line_source'")).toMatchObject([
      { Null: 'YES', Type: "enum('wikidata','squad','manual','old-site')" },
    ])
    expect(await rows("SHOW COLUMNS FROM persons LIKE 'country_source'")).toMatchObject([
      { Null: 'YES', Type: "enum('manual','wikidata','list','squad','old-site')" },
    ])
    expect(await rows("SHOW COLUMNS FROM player_list_titles LIKE 'country'")).toMatchObject([
      { Null: 'YES', Type: 'char(2)' },
    ])
  })

  it('can run again after it stopped halfway, and keeps what is stored', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await database.pool.query(
      "INSERT INTO persons (wikipedia_page, line, line_source) VALUES ('Van De Oude Site', 'doelman', 'old-site')",
    )
    await database.pool.query(
      "INSERT INTO player_list_titles (title, country, read_at) VALUES ('Van De Oude Site', 'NL', now())",
    )

    const file = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of file.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    expect(await rows('SELECT line, line_source FROM persons')).toEqual([{ line: 'doelman', line_source: 'old-site' }])
    expect(await rows('SELECT country FROM player_list_titles')).toEqual([{ country: 'NL' }])
  })
})
