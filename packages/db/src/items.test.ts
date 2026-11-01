import type { RowDataPacket } from 'mysql2/promise'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { adminUsers, feeds, hiddenReasonMaxLength, items, sources } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase
let sourceId: number
let feedId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM sources')
  await database.pool.query('DELETE FROM admin_users')

  const [source] = await database.db
    .insert(sources)
    .values({ domain: 'testkrant.test', kind: 'news', name: 'Testkrant' })
    .$returningId()
  sourceId = source?.id ?? 0

  const [feed] = await database.db.insert(feeds).values({ sourceId, url: 'https://testkrant.test/rss/' }).$returningId()
  feedId = feed?.id ?? 0
})

/** The names of the columns of a table, as the database has them. */
async function columnsOf(table: string) {
  const [rows] = await database.pool.query<RowDataPacket[]>(
    'SELECT column_name AS name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ordinal_position',
    [table],
  )

  return rows.map((row) => String(row['name']))
}

function item(key: string, overrides: Partial<typeof items.$inferInsert> = {}): typeof items.$inferInsert {
  return {
    feedId,
    key,
    publishedAt: new Date('2026-10-20T11:58:00Z'),
    sourceId,
    title: `Kop ${key}`,
    url: `https://testkrant.test/${key}`,
    ...overrides,
  }
}

describe('the table items', () => {
  it('has columns for the headline, the link, the key, the time, the paywall, three facts about an episode, the key of the story and the hiding by a moderator, and for nothing else of the source', async () => {
    // An intro, an image, an author or a category has no column: no source has given permission
    // for it (principle 2). Adding a column here is a decision for the issue that brings the
    // first source that allows it. The duration, the season and the number of an episode are
    // facts and no content, which the owner allowed (see beslissingen.md). When, by whom and
    // why a moderator hid an item is our own record and no content of the source either, and so
    // is the key of the story, which comes from the link.
    expect(await columnsOf('items')).toEqual([
      'id',
      'source_id',
      'feed_id',
      'item_key',
      'title',
      'url',
      'published_at',
      'paywalled',
      'first_seen_at',
      'last_seen_at',
      'duration_seconds',
      'season_number',
      'episode_number',
      'hidden_at',
      'hidden_by',
      'hidden_reason',
      'relevance',
      'thread_key',
    ])
  })

  it('has the relevance relevant for a new item, and refuses a value that is not one', async () => {
    await database.db.insert(items).values(item('een'))

    expect((await database.db.select().from(items))[0]?.relevance).toBe('relevant')

    await expect(
      database.pool.query(
        "INSERT INTO items (source_id, feed_id, item_key, title, url, published_at, relevance) VALUES (?, ?, 'twee', 'Kop', 'https://testkrant.test/twee', NOW(), 'misschien')",
        [sourceId, feedId],
      ),
    ).rejects.toMatchObject({ code: expect.stringMatching(/^(ER_WARN_DATA_OUT_OF_RANGE|WARN_DATA_TRUNCATED|1265)$/u) })
  })

  it('does not hide a new item', async () => {
    await database.db.insert(items).values(item('een'))

    const [row] = await database.db.select().from(items)

    expect(row?.hiddenAt).toBeNull()
    expect(row?.hiddenBy).toBeNull()
    expect(row?.hiddenReason).toBeNull()
  })

  it('holds a reason of 300 characters and refuses one of 301', async () => {
    const [user] = await database.db
      .insert(adminUsers)
      .values({ email: 'jelle@example.org', role: 'moderator' })
      .$returningId()
    const hidden = { hiddenAt: new Date('2026-10-22T10:00:00Z'), hiddenBy: user?.id ?? 0 }

    await database.db.insert(items).values(item('een', { ...hidden, hiddenReason: 'x'.repeat(hiddenReasonMaxLength) }))

    await expect(
      database.db
        .insert(items)
        .values(item('twee', { ...hidden, hiddenReason: 'x'.repeat(hiddenReasonMaxLength + 1) })),
    ).rejects.toMatchObject({ cause: { code: 'ER_DATA_TOO_LONG' } })
    expect(hiddenReasonMaxLength).toBe(300)
  })

  it('refuses a moderator that does not exist', async () => {
    await expect(
      database.db.insert(items).values(item('een', { hiddenAt: new Date(), hiddenBy: 99_999 })),
    ).rejects.toMatchObject({ cause: { code: 'ER_NO_REFERENCED_ROW_2' } })
  })

  it('gets the paywall off and the first and last time we saw it from the database', async () => {
    await database.db.insert(items).values(item('een'))

    const [row] = await database.db.select().from(items)

    expect(row?.paywalled).toBe(false)
    expect(row?.firstSeenAt.getTime()).toBeGreaterThan(Date.now() - 60_000)
    expect(row?.lastSeenAt.getTime()).toBeGreaterThan(Date.now() - 60_000)
  })

  it('keeps the time of publication in UTC', async () => {
    await database.db.insert(items).values(item('een', { publishedAt: new Date('2026-10-20T23:58:00Z') }))

    const [raw] = await database.pool.query<RowDataPacket[]>(
      'SELECT CAST(published_at AS CHAR) AS publishedAt FROM items',
    )

    expect(raw[0]?.['publishedAt']).toBe('2026-10-20 23:58:00')
  })

  it('has one item per key and source', async () => {
    await database.db.insert(items).values(item('een'))

    await expect(database.db.insert(items).values(item('een'))).rejects.toMatchObject({
      cause: { code: 'ER_DUP_ENTRY' },
    })
  })

  it('lets two sources use the same key', async () => {
    const [other] = await database.db
      .insert(sources)
      .values({ domain: 'proefnieuws.test', kind: 'news', name: 'Proefnieuws' })
      .$returningId()
    const [otherFeed] = await database.db
      .insert(feeds)
      .values({ sourceId: other?.id ?? 0, url: 'https://proefnieuws.test/rss/' })
      .$returningId()

    await database.db.insert(items).values(item('een'))
    await database.db.insert(items).values(item('een', { feedId: otherFeed?.id ?? 0, sourceId: other?.id ?? 0 }))

    expect(await database.db.select().from(items)).toHaveLength(2)
  })

  it('tells keys apart that differ only in case or accents, because a GUID is case-sensitive', async () => {
    await database.db.insert(items).values([item('Guid-A'), item('guid-a'), item('guid-á')])

    expect(await database.db.select().from(items)).toHaveLength(3)
  })

  it('stores the longest key the unique index allows, with all its characters', async () => {
    const key = `https://testkrant.test/${'é🗞️'.repeat(220)}`.slice(0, 700)

    await database.db.insert(items).values(item(key, { title: 'Kop', url: 'https://testkrant.test/lang' }))

    const [row] = await database.db.select().from(items)

    expect(row?.key).toBe(key)
  })

  it('refuses a key that is too long, and a headline that is too long, instead of cutting them off', async () => {
    await expect(database.db.insert(items).values(item('k'.repeat(701)))).rejects.toMatchObject({
      cause: { code: 'ER_DATA_TOO_LONG' },
    })
    await expect(database.db.insert(items).values(item('een', { title: 't'.repeat(501) }))).rejects.toMatchObject({
      cause: { code: 'ER_DATA_TOO_LONG' },
    })
  })

  it('goes with its source and its feed when either is deleted', async () => {
    await database.db.insert(items).values(item('een'))
    await database.pool.query('DELETE FROM feeds')

    expect(await database.db.select().from(items)).toHaveLength(0)

    await database.db.insert(feeds).values({ sourceId, url: 'https://testkrant.test/rss/' })
    const [feed] = await database.db.select().from(feeds)
    await database.db.insert(items).values(item('twee', { feedId: feed?.id ?? 0 }))
    await database.pool.query('DELETE FROM sources')

    expect(await database.db.select().from(items)).toHaveLength(0)
    expect(await database.db.select().from(feeds)).toHaveLength(0)
  })

  it('refuses an item of a source or a feed that does not exist', async () => {
    await expect(database.db.insert(items).values(item('een', { sourceId: sourceId + 1000 }))).rejects.toMatchObject({
      cause: { code: 'ER_NO_REFERENCED_ROW_2' },
    })
    await expect(database.db.insert(items).values(item('een', { feedId: feedId + 1000 }))).rejects.toMatchObject({
      cause: { code: 'ER_NO_REFERENCED_ROW_2' },
    })
  })
})

describe('the table feeds', () => {
  it('has the source, the address, the ETag and Last-Modified of the last time and the health, and nothing else', async () => {
    expect(await columnsOf('feeds')).toEqual([
      'id',
      'source_id',
      'url',
      'etag',
      'last_modified',
      'last_success_at',
      'failures_in_a_row',
      'last_error',
      'last_error_at',
      'retry_at',
      'filter',
    ])
  })

  it('starts without a filter: every item of the feed is about the club', async () => {
    const [feed] = await database.db.select().from(feeds)

    expect(feed?.filter).toBe('none')
  })

  it('starts healthy: no failures, no error and nothing to wait for', async () => {
    const [feed] = await database.db.select().from(feeds)

    expect(feed).toMatchObject({ failuresInARow: 0, lastError: null, lastSuccessAt: null, retryAt: null })
  })

  it('starts without an ETag and a Last-Modified', async () => {
    const [feed] = await database.db.select().from(feeds)

    expect(feed).toMatchObject({ etag: null, lastModified: null, url: 'https://testkrant.test/rss/' })
  })

  it('lets a source have more than one feed, but a feed address belong to one source only', async () => {
    await database.db.insert(feeds).values({ sourceId, url: 'https://testkrant.test/rss/sport/' })

    expect(await database.db.select().from(feeds)).toHaveLength(2)
    await expect(
      database.db.insert(feeds).values({ sourceId, url: 'https://testkrant.test/rss/sport/' }),
    ).rejects.toMatchObject({ cause: { code: 'ER_DUP_ENTRY' } })
  })
})
