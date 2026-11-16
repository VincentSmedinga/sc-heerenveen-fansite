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

const migration = '0080_add_country_for_sport_and_birth'

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
  it('keeps every row, with its source, and takes the two new sources and the new facts', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query(
      "INSERT INTO persons (wikipedia_page, name, country, country_source) VALUES ('Een Nederlander', 'Een Nederlander', 'NL', 'wikidata'), ('Door De Redactie', 'Door De Redactie', 'RS', 'manual')",
    )

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(
      await rows(
        'SELECT name, country, country_source, birth_country_id, country_facts_read_at FROM persons ORDER BY id',
      ),
    ).toEqual([
      {
        birth_country_id: null,
        country: 'NL',
        country_facts_read_at: null,
        country_source: 'wikidata',
        name: 'Een Nederlander',
      },
      {
        birth_country_id: null,
        country: 'RS',
        country_facts_read_at: null,
        country_source: 'manual',
        name: 'Door De Redactie',
      },
    ])

    await database.pool.query("INSERT INTO wikidata_items (id, label) VALUES ('Q1246', 'Kosovo')")
    await database.pool.query(
      "UPDATE persons SET country = 'XK', country_source = 'wikidata-sport', birth_country_id = 'Q1246' WHERE name = 'Een Nederlander'",
    )
    await database.pool.query(
      "INSERT INTO person_sport_countries (person_id, position, item_id) SELECT id, 0, 'Q1246' FROM persons WHERE name = 'Een Nederlander'",
    )
    await database.pool.query("INSERT INTO wikidata_place_countries (id, country_id) VALUES ('Q100', NULL)")

    expect(await rows("SELECT country_source FROM persons WHERE name = 'Een Nederlander'")).toEqual([
      { country_source: 'wikidata-sport' },
    ])
    expect(
      await rows(
        "SELECT TABLE_NAME, TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('person_sport_countries', 'wikidata_place_countries') ORDER BY TABLE_NAME",
      ),
    ).toEqual([
      { TABLE_COLLATION: 'utf8mb4_unicode_ci', TABLE_NAME: 'person_sport_countries' },
      { TABLE_COLLATION: 'utf8mb4_unicode_ci', TABLE_NAME: 'wikidata_place_countries' },
    ])
  })

  it('can run again after it stopped halfway, and keeps what is stored', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await database.pool.query(
      "INSERT INTO persons (wikipedia_page, name, country, country_source) VALUES ('Een Nederlander', 'Een Nederlander', 'NL', 'wikidata')",
    )

    const file = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of file.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    expect(await rows('SELECT country, country_source FROM persons')).toEqual([
      { country: 'NL', country_source: 'wikidata' },
    ])
  })
})
