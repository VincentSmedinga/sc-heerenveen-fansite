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

const migration = '0009_add_relevance_and_feed_filter'

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
  it('sets every item that was there to relevant and every feed to none, the way the site migrates at its start', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query(
      "INSERT INTO sources (domain, kind, name) VALUES ('krant.test', 'news', 'Krant'), ('podcast.test', 'podcast', 'Podcast')",
    )
    await database.pool.query(
      "INSERT INTO feeds (source_id, url) SELECT id, CONCAT('https://', domain, '/rss/') FROM sources",
    )
    await database.pool.query(
      "INSERT INTO items (source_id, feed_id, item_key, title, url, published_at) SELECT source_id, id, 'een', 'Kop', 'https://krant.test/een', NOW() FROM feeds",
    )
    await database.pool.query(
      "UPDATE items SET hidden_at = NOW(), hidden_reason = 'Fout in het bericht' WHERE source_id = (SELECT id FROM sources WHERE domain = 'krant.test')",
    )
    await database.pool.query('INSERT INTO import_runs (started_at) VALUES (NOW())')
    await database.pool.query(
      "INSERT INTO import_results (run_id, feed_id, outcome, added) SELECT (SELECT MAX(id) FROM import_runs), id, 'imported', 3 FROM feeds",
    )

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT relevance, hidden_at IS NOT NULL AS hidden FROM items ORDER BY id')).toMatchObject([
      { hidden: 1, relevance: 'relevant' },
      { hidden: 0, relevance: 'relevant' },
    ])
    expect(await rows('SELECT filter FROM feeds')).toMatchObject([{ filter: 'none' }, { filter: 'none' }])
    expect(await rows('SELECT relevant, doubtful, irrelevant, added FROM import_results')).toMatchObject([
      { added: 3, doubtful: 0, irrelevant: 0, relevant: 0 },
      { added: 3, doubtful: 0, irrelevant: 0, relevant: 0 },
    ])
  })

  it('leaves a hidden item hidden with its reason', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO sources (domain, kind, name) VALUES ('krant.test', 'news', 'Krant')")
    await database.pool.query("INSERT INTO feeds (source_id, url) SELECT id, 'https://krant.test/rss/' FROM sources")
    await database.pool.query(
      "INSERT INTO items (source_id, feed_id, item_key, title, url, published_at, hidden_at, hidden_reason) SELECT source_id, id, 'een', 'Kop', 'https://krant.test/een', NOW(), NOW(), 'Fout' FROM feeds",
    )

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT hidden_reason FROM items')).toMatchObject([{ hidden_reason: 'Fout' }])
  })
})
