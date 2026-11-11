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

const migration = '0070_add_previous_shirt_number'

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
  it('adds two empty columns and leaves the players that were there as they were', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query(
      "INSERT INTO players (season, name, search_term, shirt_number) VALUES ('2026/27', 'Testspeler Een', 'een', 9)",
    )

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT name, shirt_number, previous_shirt_number, shirt_number_from FROM players')).toEqual([
      { name: 'Testspeler Een', previous_shirt_number: null, shirt_number: 9, shirt_number_from: null },
    ])
  })

  it('can run again after it stopped halfway', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    const file = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of file.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    expect((await rows("SHOW COLUMNS FROM players LIKE 'previous_shirt_number'")).length).toBe(1)
  })

  it('refuses a number outside 1 to 99 and a number without a day or a day without a number', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    const insert = (previous: null | number, from: null | string) =>
      database.pool.query(
        'INSERT INTO players (season, name, search_term, shirt_number, previous_shirt_number, shirt_number_from) VALUES (?, ?, ?, ?, ?, ?)',
        ['2026/27', `Testspeler ${previous}-${from}`, 'x', 9, previous, from],
      )

    await expect(insert(100, '2026-10-01')).rejects.toThrow()
    await expect(insert(7, null)).rejects.toThrow()
    await expect(insert(null, '2026-10-01')).rejects.toThrow()
    await insert(7, '2026-10-01')
    await insert(null, null)
  })
})
