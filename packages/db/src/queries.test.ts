import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { listEnabledSources, listRecentItems } from './queries.ts'
import { feeds, items, sources } from './schema.ts'
import { realSources, seedSources, testSources } from './seed.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM sources')
})

describe('listEnabledSources', () => {
  it('gives the sources that are switched on, by name', async () => {
    await seedSources(database.db)

    const names = (await listEnabledSources(database.db)).map((source) => source.name)

    expect(names).toEqual(
      [...testSources.filter((source) => source.enabled !== false), ...realSources]
        .map((source) => source.name)
        .sort((a, b) => a.localeCompare(b, 'nl')),
    )
    expect(names).not.toContain('Uitgezette testbron')
  })

  it('gives the name, the domain, the kind and the description, and leaves the policy and the permission out', async () => {
    await database.db.insert(sources).values({
      allowImage: true,
      attribution: 'Voorbeeldkrant, met dank aan de redactie',
      consentDate: '2026-01-15',
      consentNote: 'Verzonnen: intro en foto.',
      consentStatus: 'given',
      description: 'Een verzonnen regionale krant.',
      domain: 'voorbeeldkrant.test',
      introMaxLength: 200,
      kind: 'news',
      name: 'Voorbeeldkrant',
    })

    expect(await listEnabledSources(database.db)).toEqual([
      {
        description: 'Een verzonnen regionale krant.',
        domain: 'voorbeeldkrant.test',
        kind: 'news',
        name: 'Voorbeeldkrant',
      },
    ])
  })

  it('gives no description when a source has none', async () => {
    await database.db.insert(sources).values({ domain: 'proefforum.test', kind: 'forum', name: 'Proefforum' })

    expect((await listEnabledSources(database.db))[0]?.description).toBeNull()
  })

  it('gives an empty list when the register is empty', async () => {
    expect(await listEnabledSources(database.db)).toEqual([])
  })
})

describe('listRecentItems', () => {
  const now = new Date('2026-10-22T10:00:00Z')
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  /** Puts a source with a feed in the register and returns the ids that an item needs. */
  async function addSource(overrides: Partial<typeof sources.$inferInsert> = {}) {
    const domain = overrides.domain ?? 'testkrant.test'
    const [source] = await database.db
      .insert(sources)
      .values({ domain, kind: 'news', name: 'Testkrant', ...overrides })
      .$returningId()
    const sourceId = source?.id ?? 0
    const [feed] = await database.db
      .insert(feeds)
      .values({ sourceId, url: `https://${domain}/rss/` })
      .$returningId()

    return { feedId: feed?.id ?? 0, sourceId }
  }

  async function addItem(
    ids: { feedId: number; sourceId: number },
    key: string,
    publishedAt: Date,
    overrides: Partial<typeof items.$inferInsert> = {},
  ) {
    await database.db.insert(items).values({
      ...ids,
      key,
      publishedAt,
      title: `Kop ${key}`,
      url: `https://testkrant.test/${key}`,
      ...overrides,
    })
  }

  it('gives the items since the given time, newest first, and none that are older', async () => {
    const ids = await addSource()

    await addItem(ids, 'oud', new Date(sevenDaysAgo.getTime() - 60_000))
    await addItem(ids, 'net-binnen', new Date(sevenDaysAgo.getTime() + 60_000))
    await addItem(ids, 'gisteren', new Date('2026-10-21T12:05:00Z'))
    await addItem(ids, 'vanochtend', new Date('2026-10-22T07:30:00Z'))

    const result = await listRecentItems(database.db, sevenDaysAgo)

    expect(result.map((item) => item.title)).toEqual(['Kop vanochtend', 'Kop gisteren', 'Kop net-binnen'])
  })

  it('gives an item published at exactly the given time, and not one a second before it', async () => {
    const ids = await addSource()

    await addItem(ids, 'precies', sevenDaysAgo)
    await addItem(ids, 'een-seconde-eerder', new Date(sevenDaysAgo.getTime() - 1000))

    expect((await listRecentItems(database.db, sevenDaysAgo)).map((item) => item.title)).toEqual(['Kop precies'])
  })

  it('gives no items of a source that is switched off, and the items of the others', async () => {
    const on = await addSource()
    const off = await addSource({ domain: 'uitgezet.test', enabled: false, name: 'Uitgezette testbron' })

    await addItem(on, 'aan', new Date('2026-10-21T12:05:00Z'))
    await addItem(off, 'uit', new Date('2026-10-21T12:06:00Z'))

    expect((await listRecentItems(database.db, sevenDaysAgo)).map((item) => item.title)).toEqual(['Kop aan'])
  })

  it('gives the items of every source mixed, by time', async () => {
    const first = await addSource()
    const second = await addSource({ domain: 'proefnieuws.test', name: 'Proefnieuws' })

    await addItem(first, 'een', new Date('2026-10-21T08:00:00Z'))
    await addItem(second, 'twee', new Date('2026-10-21T09:00:00Z'))
    await addItem(first, 'drie', new Date('2026-10-21T10:00:00Z'))

    expect((await listRecentItems(database.db, sevenDaysAgo)).map((item) => item.sourceName)).toEqual([
      'Testkrant',
      'Proefnieuws',
      'Testkrant',
    ])
  })

  it('puts the newest stored item first when two were published in the same second', async () => {
    const ids = await addSource()
    const time = new Date('2026-10-21T12:05:00Z')

    await addItem(ids, 'eerst', time)
    await addItem(ids, 'daarna', time)

    expect((await listRecentItems(database.db, sevenDaysAgo)).map((item) => item.title)).toEqual([
      'Kop daarna',
      'Kop eerst',
    ])
  })

  it('gives only the headline, the link, the time, the paywall and the name of the source', async () => {
    const ids = await addSource({
      allowImage: true,
      consentDate: '2026-01-15',
      consentNote: 'Verzonnen: intro en foto.',
      consentStatus: 'given',
      introMaxLength: 200,
    })

    await addItem(ids, 'een', new Date('2026-10-21T12:05:00Z'), { paywalled: true })

    expect(await listRecentItems(database.db, sevenDaysAgo)).toEqual([
      {
        paywalled: true,
        publishedAt: new Date('2026-10-21T12:05:00Z'),
        sourceName: 'Testkrant',
        title: 'Kop een',
        url: 'https://testkrant.test/een',
      },
    ])
  })

  it('names the source as it wants to be credited, or by its own name when it has no credit line', async () => {
    const credited = await addSource({
      attribution: 'Voorbeeldkrant, met dank aan de redactie',
      name: 'Voorbeeldkrant',
    })
    const empty = await addSource({ attribution: '', domain: 'proefnieuws.test', name: 'Proefnieuws' })
    const missing = await addSource({ attribution: null, domain: 'testclub.test', name: 'Testclub' })

    await addItem(credited, 'een', new Date('2026-10-21T08:00:00Z'))
    await addItem(empty, 'twee', new Date('2026-10-21T09:00:00Z'))
    await addItem(missing, 'drie', new Date('2026-10-21T10:00:00Z'))

    expect((await listRecentItems(database.db, sevenDaysAgo)).map((item) => item.sourceName)).toEqual([
      'Testclub',
      'Proefnieuws',
      'Voorbeeldkrant, met dank aan de redactie',
    ])
  })

  it('gives the paywall as a boolean and the time as the moment it was stored in UTC', async () => {
    const ids = await addSource()

    await addItem(ids, 'open', new Date('2026-10-21T22:30:00Z'))
    await addItem(ids, 'betaald', new Date('2026-10-21T23:45:00Z'), { paywalled: true })

    const [paid, open] = await listRecentItems(database.db, sevenDaysAgo)

    expect(paid).toMatchObject({ paywalled: true, publishedAt: new Date('2026-10-21T23:45:00Z') })
    expect(open).toMatchObject({ paywalled: false, publishedAt: new Date('2026-10-21T22:30:00Z') })
  })

  it('gives an empty list when there are no items', async () => {
    await addSource()

    expect(await listRecentItems(database.db, sevenDaysAgo)).toEqual([])
  })
})
