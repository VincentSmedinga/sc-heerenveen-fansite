import type { RowDataPacket } from 'mysql2/promise'

import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

let database: TestDatabase

beforeEach(async () => {
  database = await createTestDatabase({ migrate: false })
})

afterEach(async () => {
  // Undefined when the server wasn't there, which beforeEach has already reported.
  await database?.drop()
})

async function rows(sql: string) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql)

  return result
}

describe('the migration 0044_add_item_clubs', () => {
  it('adds an empty table, and does nothing the second time', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT COUNT(*) AS n FROM item_clubs')).toEqual([{ n: 0 }])
  })

  it('keeps one row for a club of an item, and removes the rows with the item', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO sources (domain, name, kind) VALUES ('krant.test', 'Krant', 'news')")
    await database.pool.query(
      "INSERT INTO feeds (source_id, url, filter) SELECT id, 'https://krant.test/rss/', 'none' FROM sources",
    )
    await database.pool.query(
      "INSERT INTO items (source_id, feed_id, item_key, title, url, published_at) SELECT source_id, id, 'a', 'Ajax', 'https://krant.test/a', UTC_TIMESTAMP() FROM feeds",
    )
    await database.pool.query("INSERT INTO item_clubs (item_id, club) SELECT id, 'Ajax' FROM items")

    await expect(
      database.pool.query("INSERT INTO item_clubs (item_id, club) SELECT id, 'Ajax' FROM items"),
    ).rejects.toThrow(/Duplicate entry/)
    await expect(
      database.pool.query("INSERT INTO item_clubs (item_id, club) VALUES (999999, 'Ajax')"),
    ).rejects.toThrow()

    await database.pool.query('DELETE FROM items')

    expect(await rows('SELECT COUNT(*) AS n FROM item_clubs')).toEqual([{ n: 0 }])
  })
})
