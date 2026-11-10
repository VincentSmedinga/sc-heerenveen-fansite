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

const migration = '0052_add_wikidata_to_persons'

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
  it('adds eight empty columns and three empty tables, and the persons that were there stay', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO persons (wikipedia_page, name) VALUES ('Joost van Aken', 'Joost van Aken')")

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(
      await rows(
        'SELECT wikipedia_page, name, wikidata_id, wikipedia_page_id, birth_date, birth_date_precision, birth_place_id, line, line_source, wikidata_read_at FROM persons',
      ),
    ).toEqual([
      {
        birth_date: null,
        birth_date_precision: null,
        birth_place_id: null,
        line: null,
        line_source: null,
        name: 'Joost van Aken',
        wikidata_id: null,
        wikidata_read_at: null,
        wikipedia_page: 'Joost van Aken',
        wikipedia_page_id: null,
      },
    ])
    expect(await rows("SHOW COLUMNS FROM persons LIKE 'line_source'")).toMatchObject([
      { Null: 'YES', Type: "enum('wikidata','squad','manual','old-site')" },
    ])
    expect(await rows("SHOW COLUMNS FROM persons LIKE 'birth_date_precision'")).toMatchObject([
      { Null: 'YES', Type: "enum('day','month','year')" },
    ])
    expect(await rows('SELECT * FROM wikidata_items')).toEqual([])
    expect(await rows('SELECT * FROM person_nationalities')).toEqual([])
    expect(await rows('SELECT * FROM person_positions')).toEqual([])
  })

  it('can run again after it stopped halfway, and does not change a thing the second time', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO wikidata_items (id, label) VALUES ('Q29999', 'Koninkrijk der Nederlanden')")
    await database.pool.query(
      "INSERT INTO persons (wikipedia_page, wikidata_id) VALUES ('Joost van Aken', 'Q15943430')",
    )

    const file = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of file.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    expect(await rows('SELECT wikidata_id FROM persons')).toEqual([{ wikidata_id: 'Q15943430' }])
    expect(await rows('SELECT id FROM wikidata_items')).toEqual([{ id: 'Q29999' }])
  })

  it('keeps one person for a Q-number, and removes the nationalities and positions with the person', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await database.pool.query(
      "INSERT INTO wikidata_items (id, label) VALUES ('Q29999', 'Nederland'), ('Q155', 'Brazilië')",
    )
    await database.pool.query("INSERT INTO persons (wikipedia_page, wikidata_id) VALUES ('A', 'Q1')")
    await database.pool.query(
      "INSERT INTO person_nationalities (person_id, position, item_id) VALUES (1, 0, 'Q29999'), (1, 1, 'Q155')",
    )
    await database.pool.query("INSERT INTO person_positions (person_id, position, item_id) VALUES (1, 0, 'Q29999')")

    await expect(
      database.pool.query("INSERT INTO persons (wikipedia_page, wikidata_id) VALUES ('B', 'Q1')"),
    ).rejects.toThrow()
    await expect(
      database.pool.query("INSERT INTO person_nationalities (person_id, position, item_id) VALUES (1, 2, 'Q155')"),
    ).rejects.toThrow()

    await database.pool.query('DELETE FROM persons WHERE id = 1')

    expect(await rows('SELECT * FROM person_nationalities')).toEqual([])
    expect(await rows('SELECT * FROM person_positions')).toEqual([])
    expect(await rows('SELECT id FROM wikidata_items ORDER BY id')).toHaveLength(2)
  })
})
