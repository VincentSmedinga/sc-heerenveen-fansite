import type { TestDatabase } from '@fansite/db/test-database'

import { feeds, items, sources } from '@fansite/db/schema'

// Made-up sources and items for the tests of the admin, in a database from `createTestDatabase`.

/** An item of that source. Returns its id. */
export async function addItem(
  database: TestDatabase,
  ids: { feedId: number; sourceId: number },
  key: string,
  overrides: Partial<typeof items.$inferInsert> = {},
) {
  const [item] = await database.db
    .insert(items)
    .values({
      ...ids,
      key,
      publishedAt: new Date('2026-10-20T11:58:00Z'),
      title: `Kop ${key}`,
      url: `https://krant.test/${key}`,
      ...overrides,
    })
    .$returningId()

  return item?.id ?? 0
}

/** A source with a feed. Returns the ids an item needs. */
export async function addSource(database: TestDatabase, domain = 'krant.test', kind: 'news' | 'podcast' = 'news') {
  const [source] = await database.db.insert(sources).values({ domain, kind, name: domain }).$returningId()
  const sourceId = source?.id ?? 0
  const [feed] = await database.db
    .insert(feeds)
    .values({ sourceId, url: `https://${domain}/rss/` })
    .$returningId()

  return { feedId: feed?.id ?? 0, sourceId }
}
