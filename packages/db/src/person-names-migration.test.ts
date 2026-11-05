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

const migration = '0041_add_person_names'

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
  it('adds five empty columns to the persons that were there, and does nothing the second time', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO persons (wikipedia_page) VALUES ('Joost van Aken')")

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(
      await rows('SELECT wikipedia_page, name, given_name, family_name_prefix, family_name, name_source FROM persons'),
    ).toEqual([
      {
        family_name: null,
        family_name_prefix: null,
        given_name: null,
        name: null,
        name_source: null,
        wikipedia_page: 'Joost van Aken',
      },
    ])
    expect(await rows("SHOW COLUMNS FROM persons LIKE 'name_source'")).toMatchObject([
      { Null: 'YES', Type: "enum('sort_key','guess','manual')" },
    ])
  })
})
