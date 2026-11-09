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

const migration = '0059_wikipedia_page_per_kind'

const title = 'Sc Heerenveen in het seizoen 2008/09 (mannen)'

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

/** Keeps the page of the season of 2008/09 as a page of this kind. */
function insertPage(kind: string) {
  return database.pool.query(
    `INSERT INTO wikipedia_pages (title, season, kind, read_at) VALUES ('${title}', '2008/09', '${kind}', '2026-11-09 12:00:00')`,
  )
}

async function rows(sql: string) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql)

  return result
}

describe(`the migration ${migration}`, () => {
  it('lets a page be kept once for each kind, and keeps the rows there were', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await insertPage('squad')

    await expect(insertPage('matches')).rejects.toThrow(/Duplicate entry/)

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await insertPage('matches')

    expect(await rows('SELECT title, kind FROM wikipedia_pages ORDER BY kind')).toEqual([
      { kind: 'matches', title },
      { kind: 'squad', title },
    ])
    // A page is still there once for a kind.
    await expect(insertPage('matches')).rejects.toThrow(/Duplicate entry/)
  })

  it('can run again and leaves the same key', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    const sql = (await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8'))
      .split('\n')
      .filter((line) => !line.startsWith('--'))
      .join('\n')

    await database.pool.query(sql)

    expect(
      (await rows("SHOW KEYS FROM wikipedia_pages WHERE Key_name = 'PRIMARY'")).map((key) => key['Column_name']),
    ).toEqual(['title', 'kind'])
  })
})
