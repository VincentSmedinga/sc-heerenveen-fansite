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

const migration = '0010_add_articles'

let database: TestDatabase
let oldFolder: string

beforeEach(async () => {
  database = await createTestDatabase({ migrate: false })

  // The migrations as they were before this one: the same files, without it in the journal.
  oldFolder = await mkdtemp(join(tmpdir(), 'fansite-migrations-'))
  await cp(migrationsFolder, oldFolder, { recursive: true })

  const journalPath = join(oldFolder, 'meta', '_journal.json')
  const journal = JSON.parse(await readFile(journalPath, 'utf8')) as { entries: { tag: string }[] }

  journal.entries = journal.entries.filter((entry) => entry.tag !== migration)
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
  it('adds an empty table and leaves the rows that were there as they were, the way the site migrates at its start', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO sources (domain, kind, name) VALUES ('krant.test', 'news', 'Krant')")
    await database.pool.query(
      "INSERT INTO feeds (source_id, url) SELECT id, CONCAT('https://', domain, '/rss/') FROM sources",
    )
    await database.pool.query(
      "INSERT INTO items (source_id, feed_id, item_key, title, url, published_at) SELECT source_id, id, 'een', 'Kop', 'https://krant.test/een', '2026-10-20 10:00:00' FROM feeds",
    )
    await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('beheerder@example.test', 'beheerder')")
    await database.pool.query(
      "INSERT INTO audit_log (created_at, user_id, action, item_id) SELECT '2026-10-21 10:00:00', id, 'item.hide', 1 FROM admin_users",
    )

    expect(await rows("SHOW TABLES LIKE 'articles'")).toHaveLength(0)

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT COUNT(*) AS n FROM articles')).toMatchObject([{ n: 0 }])
    expect(await rows('SELECT title, relevance FROM items')).toMatchObject([{ relevance: 'relevant', title: 'Kop' }])
    expect(await rows('SELECT email FROM admin_users')).toMatchObject([{ email: 'beheerder@example.test' }])
    expect(await rows('SELECT action FROM audit_log')).toMatchObject([{ action: 'item.hide' }])
  })

  it('does nothing the second time', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT COUNT(*) AS n FROM articles')).toMatchObject([{ n: 0 }])
  })
})
