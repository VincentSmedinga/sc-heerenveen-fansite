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

const migration = '0071_add_death_date_to_persons'

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
  it('adds three empty columns and leaves the persons that were there as they were', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query(
      "INSERT INTO persons (wikipedia_page, name, birth_date, birth_date_precision) VALUES ('Testspeler Een', 'Testspeler Een', '1990-01-01', 'year')",
    )

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(
      await rows(
        "SELECT name, DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth_date, death_date, death_date_precision, death_date_source FROM persons",
      ),
    ).toEqual([
      {
        birth_date: '1990-01-01',
        death_date: null,
        death_date_precision: null,
        death_date_source: null,
        name: 'Testspeler Een',
      },
    ])
  })

  it('can run again after it stopped halfway', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    const file = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of file.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    expect((await rows("SHOW COLUMNS FROM persons LIKE 'death_date%'")).length).toBe(3)
  })
})
