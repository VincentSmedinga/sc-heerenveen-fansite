import type { RowDataPacket } from 'mysql2/promise'

import { eq } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { lockNameFor } from './lock.ts'
import { prepareDatabase } from './prepare.ts'
import { feeds, items, sources } from './schema.ts'
import { realSources, seedSources, testSources } from './seed.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

const journal = JSON.parse(readFileSync(`${migrationsFolder}/meta/_journal.json`, 'utf8')) as { entries: unknown[] }

let database: TestDatabase

beforeEach(async () => {
  database = await createTestDatabase({ migrate: false })
})

afterEach(async () => {
  // Undefined when the server wasn't there, which beforeEach has already reported.
  await database?.drop()
})

/** Gives the source an own feed with one item, as the importer would have stored it. */
async function addFeedAndItem(domain: string) {
  const [source] = await database.db.select({ id: sources.id }).from(sources).where(eq(sources.domain, domain))
  const [feed] = await database.db
    .insert(feeds)
    .values({ sourceId: source?.id ?? 0, url: `https://${domain}/own-feed/` })
    .$returningId()

  await database.db.insert(items).values({
    feedId: feed?.id ?? 0,
    key: `own-${domain}`,
    publishedAt: new Date(),
    sourceId: source?.id ?? 0,
    title: 'Een bericht',
    url: `https://${domain}/bericht`,
  })
}

async function count(table: string) {
  const [rows] = await database.pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM ??', [table])

  return Number(rows[0]?.['total'])
}

async function domains() {
  const [rows] = await database.pool.query<RowDataPacket[]>('SELECT domain FROM sources ORDER BY domain')

  return rows.map((row) => String(row['domain']))
}

/** The domains of the sources that have an item, for the test that takes sources out. */
async function itemDomains() {
  const [rows] = await database.pool.query<RowDataPacket[]>(
    'SELECT DISTINCT sources.domain FROM items JOIN sources ON sources.id = items.source_id ORDER BY sources.domain',
  )

  return rows.map((row) => String(row['domain']))
}

async function lockIsFree() {
  const [rows] = await database.pool.query<RowDataPacket[]>('SELECT IS_FREE_LOCK(?) AS free', [
    lockNameFor(database.url, 'migrate'),
  ])

  return rows[0]?.['free'] === 1
}

/** Everything in the register, its feeds and its items, in an order that does not change. */
async function snapshot() {
  const [rows] = await database.pool.query<RowDataPacket[]>(
    `SELECT sources.domain, feeds.url, items.item_key AS item
       FROM sources LEFT JOIN feeds ON feeds.source_id = sources.id LEFT JOIN items ON items.feed_id = feeds.id
      ORDER BY sources.domain, feeds.url, items.item_key`,
  )

  return rows
}

async function tables() {
  const [rows] = await database.pool.query<RowDataPacket[]>(
    'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()',
  )

  return rows.map((row) => String(row['name']))
}

describe('prepareDatabase', () => {
  it('makes the tables in an empty database and leaves the register empty without the seed', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await count('sources')).toBe(0)
    expect(await count('__drizzle_migrations')).toBeGreaterThan(0)
  })

  it.each(['acceptance', 'production'] as const)(
    'puts only the real sources in the register on %s, and makes no duplicates when it runs again',
    async (seed) => {
      await prepareDatabase({ migrationsFolder, seed, url: database.url })
      await prepareDatabase({ migrationsFolder, seed, url: database.url })

      expect(await count('sources')).toBe(realSources.length)
      expect(await domains()).not.toContain(testSources[0]?.domain)
    },
  )

  it('puts nothing in the register on local', async () => {
    await prepareDatabase({ migrationsFolder, seed: 'local', url: database.url })

    expect(await count('sources')).toBe(0)
  })

  it('puts made-up matches in on acceptance and never on production', async () => {
    await prepareDatabase({ migrationsFolder, seed: 'production', url: database.url })

    expect(await count('matches')).toBe(0)
    expect(await count('players')).toBe(0)

    await prepareDatabase({ migrationsFolder, seed: 'acceptance', url: database.url })

    expect(await count('matches')).toBeGreaterThan(0)
    expect(await count('players')).toBeGreaterThan(0)
  })

  it('takes the test sources out on acceptance, with their feeds and items, and leaves the real ones alone', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await seedSources(database.db)
    await addFeedAndItem('testkrant.test')
    await addFeedAndItem('www.lc.nl')
    const before = await count('items')

    await prepareDatabase({ migrationsFolder, seed: 'acceptance', url: database.url })

    expect(await domains()).toEqual(realSources.map((source) => source.domain).sort())
    expect(await itemDomains()).toEqual(['www.lc.nl'])
    // The real source keeps its own feed and item, next to the feeds the seed put there.
    expect(await count('items')).toBe(before - 1)

    const after = await snapshot()

    await prepareDatabase({ migrationsFolder, seed: 'acceptance', url: database.url })

    expect(await snapshot()).toEqual(after)
  })

  it('does not take the test sources out on production, where they never were', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await seedSources(database.db)

    await prepareDatabase({ migrationsFolder, seed: 'production', url: database.url })

    expect(await count('sources')).toBe(testSources.length + realSources.length)
  })

  it('lets go of the lock when it is done', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await lockIsFree()).toBe(true)
  })

  it('lets processes that start together take turns, so none of them fails', async () => {
    await Promise.all(
      Array.from({ length: 4 }, () => prepareDatabase({ migrationsFolder, seed: 'acceptance', url: database.url })),
    )

    expect(await count('sources')).toBe(realSources.length)
    // Each migration in the folder is recorded once.
    expect(await count('__drizzle_migrations')).toBe(journal.entries.length)
  })

  it('gives up when another process keeps the lock, and goes on once it is free', async () => {
    const holder = await database.pool.getConnection()

    try {
      await holder.query('SELECT GET_LOCK(?, 0)', [lockNameFor(database.url, 'migrate')])

      await expect(
        prepareDatabase({ lockSeconds: 1, migrationsFolder, seed: false, url: database.url }),
      ).rejects.toThrow(/Could not get the lock .* within 1 seconds/)
      expect(await tables()).toEqual([])
    } finally {
      await holder.query('DO RELEASE_LOCK(?)', [lockNameFor(database.url, 'migrate')])
      holder.release()
    }

    await prepareDatabase({ lockSeconds: 1, migrationsFolder, seed: false, url: database.url })
    expect(await count('sources')).toBe(0)
  })

  it('lets go of the lock when a migration fails', async () => {
    await expect(
      prepareDatabase({ migrationsFolder: `${migrationsFolder}-bestaat-niet`, seed: false, url: database.url }),
    ).rejects.toThrow()

    expect(await lockIsFree()).toBe(true)
  })

  it('throws when the database is not there', async () => {
    await expect(
      prepareDatabase({ migrationsFolder, seed: false, url: 'mysql://root@127.0.0.1:1/fansite' }),
    ).rejects.toThrow(/ECONNREFUSED/)
  })
})
