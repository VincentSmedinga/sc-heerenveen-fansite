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

const migration = '0078_widen_country_codes'

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
  it('widens the columns to six characters and keeps every country that is stored', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query(
      "INSERT INTO clubs (name, slug, country) VALUES ('Club NL', 'club-nl', 'NL'), ('Club GB', 'club-gb', 'GB')",
    )
    await database.pool.query(
      "INSERT INTO persons (wikipedia_page, name, country) VALUES ('Persoon GB', 'Persoon GB', 'GB')",
    )
    await database.pool.query(
      "INSERT INTO players (season, name, search_term, country) VALUES ('2026/27', 'Joost van Aken', 'van Aken', 'NL')",
    )

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT name, country FROM clubs ORDER BY name')).toEqual([
      { country: 'GB', name: 'Club GB' },
      { country: 'NL', name: 'Club NL' },
    ])
    expect(await rows('SELECT country FROM persons')).toEqual([{ country: 'GB' }])
    expect(await rows('SELECT country FROM players')).toEqual([{ country: 'NL' }])

    for (const table of ['clubs', 'persons', 'player_list_titles', 'players']) {
      expect(await rows(`SHOW COLUMNS FROM ${table} LIKE 'country'`)).toMatchObject([
        { Null: 'YES', Type: 'varchar(6)' },
      ])
    }

    await database.pool.query("UPDATE clubs SET country = 'GB-WLS' WHERE slug = 'club-gb'")
    expect(await rows("SELECT country FROM clubs WHERE slug = 'club-gb'")).toEqual([{ country: 'GB-WLS' }])
  })

  it('can run again after it stopped halfway, and keeps the countries that are stored', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO clubs (name, slug, country) VALUES ('Club ENG', 'club-eng', 'GB-ENG')")

    const file = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of file.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    expect(await rows('SELECT country FROM clubs')).toEqual([{ country: 'GB-ENG' }])
  })
})
