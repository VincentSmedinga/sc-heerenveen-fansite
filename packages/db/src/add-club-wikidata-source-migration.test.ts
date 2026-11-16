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

const migration = '0086_add_club_wikidata_source'

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

describe('the migration that adds the source of the Wikidata number of a club', () => {
  it('adds two columns, gives the clubs with a number a source, and changes nothing else', async () => {
    await prepare(oldFolder)
    await database.pool.query(
      `INSERT INTO clubs (slug, name, wikipedia_page, wikidata_id) VALUES
         ('article', 'Article', 'Article', 'Q1'),
         ('edited', 'Edited', NULL, 'Q2'),
         ('none', 'None', NULL, NULL)`,
    )
    expect(await rows("SHOW COLUMNS FROM clubs LIKE 'wikidata_source'")).toEqual([])

    await prepare(migrationsFolder)

    expect(
      await rows('SELECT slug, wikidata_id, wikidata_source, wikidata_searched_at FROM clubs ORDER BY slug'),
    ).toEqual([
      { slug: 'article', wikidata_id: 'Q1', wikidata_searched_at: null, wikidata_source: 'wikipedia' },
      { slug: 'edited', wikidata_id: 'Q2', wikidata_searched_at: null, wikidata_source: 'manual' },
      { slug: 'none', wikidata_id: null, wikidata_searched_at: null, wikidata_source: null },
    ])
  })

  it('can run again, and leaves a source that is there', async () => {
    await prepare(migrationsFolder)
    await database.pool.query(
      "INSERT INTO clubs (slug, name, wikidata_id, wikidata_source) VALUES ('found', 'Found', 'Q3', 'name')",
    )
    await expect(prepare(migrationsFolder)).resolves.not.toThrow()
    expect(await rows('SELECT wikidata_source FROM clubs')).toEqual([{ wikidata_source: 'name' }])
  })
})
