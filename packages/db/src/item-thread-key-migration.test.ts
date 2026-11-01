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

const migration = '0027_add_item_thread_key'

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
  it('gives the items that were there an empty key and a column and an index for it', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO sources (domain, kind, name) VALUES ('krant.test', 'news', 'Krant')")
    await database.pool.query("INSERT INTO feeds (source_id, url) SELECT id, 'https://krant.test/rss/' FROM sources")
    await database.pool.query(
      "INSERT INTO items (source_id, feed_id, item_key, title, url, published_at) SELECT s.id, f.id, 'een', 'Een', 'https://krant.test/een~a40dbd48/', '2026-10-22 10:00:00' FROM sources s, feeds f",
    )

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT item_key, thread_key FROM items')).toMatchObject([{ item_key: 'een', thread_key: null }])
    expect(await rows("SHOW INDEX FROM items WHERE Key_name = 'items_source_id_thread_key_idx'")).toMatchObject([
      { Column_name: 'source_id', Seq_in_index: 1 },
      { Column_name: 'thread_key', Seq_in_index: 2 },
    ])
  })

  it('does nothing the second time', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows("SHOW COLUMNS FROM items LIKE 'thread_key'")).toHaveLength(1)
  })
})
