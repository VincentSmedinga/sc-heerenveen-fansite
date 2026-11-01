import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { withClubs } from './clubs.ts'
import {
  countArchiveItems,
  countPodcastEpisodes,
  findPodcast,
  listAllWikipediaPages,
  listArchivePage,
  listArchiveSources,
  listEnabledSources,
  listMatchSeasons,
  listNewestDiscussions,
  listPodcastEpisodes,
  listPodcasts,
  listRecentItems,
  listSeasonMatches,
  listSeasonStandings,
  listWikipediaPages,
  searchPublic,
} from './queries.ts'
import {
  discussions,
  feeds,
  items,
  matches,
  matchGoals,
  players,
  sources,
  standings,
  wikipediaPages,
} from './schema.ts'
import {
  madeUpMatches,
  madeUpSquadPage,
  madeUpTable,
  madeUpWikipediaPages,
  realSources,
  seedMatches,
  seedSources,
  testSources,
} from './seed.ts'
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
  const day = 24 * 60 * 60 * 1000

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

  it('gives the items newest first, however old they are', async () => {
    const ids = await addSource()

    await addItem(ids, 'vorig-jaar', new Date('2025-10-21T12:05:00Z'))
    await addItem(ids, 'gisteren', new Date('2026-10-21T12:05:00Z'))
    await addItem(ids, 'vanochtend', new Date('2026-10-22T07:30:00Z'))
    await addItem(ids, 'drie-weken', new Date(now.getTime() - 21 * day))

    const result = await listRecentItems(database.db, { limit: 10, until: now })

    expect(result.map((item) => item.title)).toEqual([
      'Kop vanochtend',
      'Kop gisteren',
      'Kop drie-weken',
      'Kop vorig-jaar',
    ])
  })

  it('gives the newest items up to the limit and no more', async () => {
    const ids = await addSource()

    for (let number = 1; number <= 7; number++) {
      await addItem(ids, `kop-${number}`, new Date(now.getTime() - number * day))
    }

    expect((await listRecentItems(database.db, { limit: 3, until: now })).map((item) => item.title)).toEqual([
      'Kop kop-1',
      'Kop kop-2',
      'Kop kop-3',
    ])
    expect(await listRecentItems(database.db, { limit: 20, until: now })).toHaveLength(7)
  })

  it('gives no items of a source that is switched off, however new they are', async () => {
    const on = await addSource()
    const off = await addSource({ domain: 'uitgezet.test', enabled: false, name: 'Uitgezette testbron' })

    await addItem(on, 'aan', new Date(now.getTime() - 20 * day))
    await addItem(off, 'uitgezet', new Date(now.getTime() - 60_000))

    const result = await listRecentItems(database.db, { limit: 10, until: now })

    expect(result.map((item) => item.title)).toEqual(['Kop aan'])
  })

  it('gives an item published at exactly the end time, and not one a second after it', async () => {
    const ids = await addSource()

    await addItem(ids, 'nu', now)
    await addItem(ids, 'een-seconde-later', new Date(now.getTime() + 1000))

    expect((await listRecentItems(database.db, { limit: 10, until: now })).map((item) => item.title)).toEqual([
      'Kop nu',
    ])
  })

  it('gives no item from the future, such as one whose feed was a day ahead', async () => {
    const ids = await addSource()

    await addItem(ids, 'vandaag', new Date('2026-10-22T07:30:00Z'))
    await addItem(ids, 'morgen', new Date(now.getTime() + 20 * 60 * 60 * 1000))

    expect((await listRecentItems(database.db, { limit: 10, until: now })).map((item) => item.title)).toEqual([
      'Kop vandaag',
    ])
  })

  it('gives no items of a source that is switched off, and the items of the others', async () => {
    const on = await addSource()
    const off = await addSource({ domain: 'uitgezet.test', enabled: false, name: 'Uitgezette testbron' })

    await addItem(on, 'aan', new Date('2026-10-21T12:05:00Z'))
    await addItem(off, 'uit', new Date('2026-10-21T12:06:00Z'))

    expect((await listRecentItems(database.db, { limit: 10, until: now })).map((item) => item.title)).toEqual([
      'Kop aan',
    ])
  })

  it('gives no item that is hidden, and the items around it, so the limit is filled with visible items', async () => {
    const ids = await addSource()
    const hiddenAt = new Date('2026-10-22T09:00:00Z')

    await addItem(ids, 'nieuwste', new Date('2026-10-22T08:00:00Z'), { hiddenAt })
    await addItem(ids, 'tweede', new Date('2026-10-22T07:00:00Z'))
    await addItem(ids, 'derde', new Date('2026-10-22T06:00:00Z'))

    expect((await listRecentItems(database.db, { limit: 2, until: now })).map((item) => item.title)).toEqual([
      'Kop tweede',
      'Kop derde',
    ])
  })

  it.each(['doubtful', 'irrelevant'] as const)(
    'gives no %s item, and the items around it, so the limit is filled with relevant items',
    async (relevance) => {
      const ids = await addSource()

      await addItem(ids, 'nieuwste', new Date('2026-10-22T08:00:00Z'), { relevance })
      await addItem(ids, 'tweede', new Date('2026-10-22T07:00:00Z'))
      await addItem(ids, 'derde', new Date('2026-10-22T06:00:00Z'))

      expect((await listRecentItems(database.db, { limit: 2, until: now })).map((item) => item.title)).toEqual([
        'Kop tweede',
        'Kop derde',
      ])
    },
  )

  it('gives an item again once it is shown', async () => {
    const ids = await addSource()

    await addItem(ids, 'bericht', new Date('2026-10-22T08:00:00Z'), { hiddenAt: new Date('2026-10-22T09:00:00Z') })
    await database.db.update(items).set({ hiddenAt: null })

    expect((await listRecentItems(database.db, { limit: 10, until: now })).map((item) => item.title)).toEqual([
      'Kop bericht',
    ])
  })

  it('gives no episodes of a podcast that is switched on, and the items of the others', async () => {
    await seedSources(database.db)

    // The seed holds the made-up Testpodcast, which is switched on, and the Testkrant, which is
    // news.
    const idsOf = async (domain: string) => {
      const [source] = await database.db.select().from(sources).where(eq(sources.domain, domain))
      const [feed] = await database.db
        .insert(feeds)
        .values({ sourceId: source?.id ?? 0, url: `https://${domain}/rss/` })
        .$returningId()

      return { feedId: feed?.id ?? 0, sourceId: source?.id ?? 0 }
    }
    const podcast = await idsOf('testpodcast.test')

    await addItem(podcast, 'aflevering', new Date('2026-10-21T12:05:00Z'))
    await addItem(await idsOf('testkrant.test'), 'bericht', new Date('2026-10-21T12:00:00Z'))

    expect(await database.db.select().from(items)).toHaveLength(2)
    expect((await listRecentItems(database.db, { limit: 10, until: now })).map((item) => item.title)).toEqual([
      'Kop bericht',
    ])
  })

  it('gives the items of every source mixed, by time', async () => {
    const first = await addSource()
    const second = await addSource({ domain: 'proefnieuws.test', name: 'Proefnieuws' })

    await addItem(first, 'een', new Date('2026-10-21T08:00:00Z'))
    await addItem(second, 'twee', new Date('2026-10-21T09:00:00Z'))
    await addItem(first, 'drie', new Date('2026-10-21T10:00:00Z'))

    expect((await listRecentItems(database.db, { limit: 10, until: now })).map((item) => item.sourceName)).toEqual([
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

    expect((await listRecentItems(database.db, { limit: 10, until: now })).map((item) => item.title)).toEqual([
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

    expect(await listRecentItems(database.db, { limit: 10, until: now })).toEqual([
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

    expect((await listRecentItems(database.db, { limit: 10, until: now })).map((item) => item.sourceName)).toEqual([
      'Testclub',
      'Proefnieuws',
      'Voorbeeldkrant, met dank aan de redactie',
    ])
  })

  it('gives the paywall as a boolean and the time as the moment it was stored in UTC', async () => {
    const ids = await addSource()

    await addItem(ids, 'open', new Date('2026-10-21T22:30:00Z'))
    await addItem(ids, 'betaald', new Date('2026-10-21T23:45:00Z'), { paywalled: true })

    const [paid, open] = await listRecentItems(database.db, { limit: 10, until: now })

    expect(paid).toMatchObject({ paywalled: true, publishedAt: new Date('2026-10-21T23:45:00Z') })
    expect(open).toMatchObject({ paywalled: false, publishedAt: new Date('2026-10-21T22:30:00Z') })
  })

  it('gives an empty list when there are no items', async () => {
    await addSource()

    expect(await listRecentItems(database.db, { limit: 10, until: now })).toEqual([])
  })
})

describe('the news archive', () => {
  const now = new Date('2026-10-22T10:00:00Z')
  const day = 24 * 60 * 60 * 1000

  /** Puts a source with a feed in the register and returns the ids that an item needs. */
  async function addSource(overrides: Partial<typeof sources.$inferInsert> = {}) {
    const domain = overrides.domain ?? 'testkrant.test'
    const [source] = await database.db
      .insert(sources)
      .values({ domain, kind: 'news', name: 'Testkrant', slug: 'testkrant', ...overrides })
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

  const titles = async (options: { limit?: number; offset?: number; sources?: string[] } = {}) =>
    (await listArchivePage(database.db, { limit: 50, until: now, ...options })).map((item) => item.title)

  describe('listArchivePage', () => {
    it('gives the headlines newest first, however old they are', async () => {
      const ids = await addSource()

      await addItem(ids, 'vorig-jaar', new Date('2025-10-21T12:05:00Z'))
      await addItem(ids, 'gisteren', new Date('2026-10-21T12:05:00Z'))
      await addItem(ids, 'twintig-jaar', new Date('2006-05-01T12:05:00Z'))
      await addItem(ids, 'vanochtend', new Date('2026-10-22T07:30:00Z'))

      expect(await titles()).toEqual(['Kop vanochtend', 'Kop gisteren', 'Kop vorig-jaar', 'Kop twintig-jaar'])
    })

    it('starts at the offset and gives at most the limit, so the pages follow each other without a gap', async () => {
      const ids = await addSource()

      for (const index of [1, 2, 3, 4, 5]) {
        await addItem(ids, String(index), new Date(now.getTime() - index * day))
      }

      expect(await titles({ limit: 2 })).toEqual(['Kop 1', 'Kop 2'])
      expect(await titles({ limit: 2, offset: 2 })).toEqual(['Kop 3', 'Kop 4'])
      expect(await titles({ limit: 2, offset: 4 })).toEqual(['Kop 5'])
      expect(await titles({ limit: 2, offset: 6 })).toEqual([])
    })

    it('puts the item that was stored last first when two were published in the same second', async () => {
      const ids = await addSource()
      const same = new Date('2026-10-22T08:00:00Z')

      await addItem(ids, 'eerst', same)
      await addItem(ids, 'daarna', same)

      expect(await titles()).toEqual(['Kop daarna', 'Kop eerst'])
    })

    it('gives the headlines of the sources that get a slug, and of all sources without or with none', async () => {
      const krant = await addSource()
      const nieuws = await addSource({ domain: 'proefnieuws.test', name: 'Proefnieuws', slug: 'proefnieuws' })
      const omroep = await addSource({ domain: 'omroep.test', name: 'Omroep', slug: 'omroep' })

      await addItem(krant, 'krant', new Date('2026-10-22T08:00:00Z'))
      await addItem(nieuws, 'nieuws', new Date('2026-10-22T07:00:00Z'))
      await addItem(omroep, 'omroep', new Date('2026-10-22T06:00:00Z'))

      expect(await titles()).toEqual(['Kop krant', 'Kop nieuws', 'Kop omroep'])
      expect(await titles({ sources: [] })).toEqual(['Kop krant', 'Kop nieuws', 'Kop omroep'])
      expect(await titles({ sources: ['proefnieuws'] })).toEqual(['Kop nieuws'])
      expect(await titles({ sources: ['omroep', 'testkrant'] })).toEqual(['Kop krant', 'Kop omroep'])
      expect(await titles({ sources: ['bestaat-niet'] })).toEqual([])
      expect(await titles({ sources: ['bestaat-niet', 'proefnieuws'] })).toEqual(['Kop nieuws'])
    })

    it('finds a source by its slug exactly, and not by the same letters in another case or with accents', async () => {
      const ids = await addSource({ slug: 'omrop-fryslan' })

      await addItem(ids, 'bericht', new Date('2026-10-22T08:00:00Z'))

      expect(await titles({ sources: ['omrop-fryslan'] })).toEqual(['Kop bericht'])
      expect(await titles({ sources: ['OMROP-FRYSLAN'] })).toEqual([])
      expect(await titles({ sources: ['omrop-fryslán'] })).toEqual([])
    })

    it('gives no headline of a source that is switched off, and the headlines of the others', async () => {
      const off = await addSource({ domain: 'uit.test', enabled: false, name: 'Uit', slug: 'uit' })
      const on = await addSource()

      await addItem(off, 'uit', new Date('2026-10-22T08:00:00Z'))
      await addItem(on, 'aan', new Date('2026-10-22T07:00:00Z'))

      expect(await titles()).toEqual(['Kop aan'])
      expect(await titles({ sources: ['uit'] })).toEqual([])
    })

    it('gives no headline that is hidden, and the headlines around it', async () => {
      const ids = await addSource()

      await addItem(ids, 'nieuwste', new Date('2026-10-22T08:00:00Z'), { hiddenAt: new Date('2026-10-22T09:00:00Z') })
      await addItem(ids, 'tweede', new Date('2026-10-22T07:00:00Z'))

      expect(await titles()).toEqual(['Kop tweede'])
    })

    it.each(['doubtful', 'irrelevant'] as const)(
      'gives no %s headline, and the headlines around it',
      async (relevance) => {
        const ids = await addSource()

        await addItem(ids, 'nieuwste', new Date('2026-10-22T08:00:00Z'), { relevance })
        await addItem(ids, 'tweede', new Date('2026-10-22T07:00:00Z'))

        expect(await titles()).toEqual(['Kop tweede'])
      },
    )

    it('gives an item again once it is shown', async () => {
      const ids = await addSource()

      await addItem(ids, 'bericht', new Date('2026-10-22T08:00:00Z'), { hiddenAt: new Date('2026-10-22T09:00:00Z') })
      await database.db.update(items).set({ hiddenAt: null })

      expect(await titles()).toEqual(['Kop bericht'])
    })

    it('gives an item published at exactly the end time, and not one a second after it', async () => {
      const ids = await addSource()

      await addItem(ids, 'precies', now)
      await addItem(ids, 'later', new Date(now.getTime() + 1000))

      expect(await titles()).toEqual(['Kop precies'])
    })

    it('gives no episodes of a podcast, even with a slug, and the headlines of the others', async () => {
      const podcast = await addSource({ domain: 'testpodcast.test', kind: 'podcast', slug: 'testpodcast' })
      const news = await addSource()

      await addItem(podcast, 'aflevering', new Date('2026-10-22T08:00:00Z'))
      await addItem(news, 'bericht', new Date('2026-10-22T07:00:00Z'))

      expect(await titles()).toEqual(['Kop bericht'])
      expect(await titles({ sources: ['testpodcast'] })).toEqual([])
    })

    it('gives the headlines of sources of every kind but a podcast', async () => {
      const club = await addSource({ domain: 'testclub.test', kind: 'club', slug: 'testclub' })
      const video = await addSource({ domain: 'voorbeeldvideo.test', kind: 'video', slug: 'voorbeeldvideo' })

      await addItem(club, 'club', new Date('2026-10-22T08:00:00Z'))
      await addItem(video, 'video', new Date('2026-10-22T07:00:00Z'))

      expect(await titles()).toEqual(['Kop club', 'Kop video'])
    })

    it('gives the headlines of a source without a slug in the archive of all sources only', async () => {
      const ids = await addSource({ slug: null })

      await addItem(ids, 'bericht', new Date('2026-10-22T08:00:00Z'))

      expect(await titles()).toEqual(['Kop bericht'])
    })

    it('gives only the headline, the link, the time, the paywall and the name of the source as it wants to be credited', async () => {
      const ids = await addSource({
        allowImage: true,
        attribution: 'Voorbeeldkrant, met dank aan de redactie',
        consentStatus: 'given',
        introMaxLength: 200,
      })

      await addItem(ids, 'een', new Date('2026-10-21T12:05:00Z'), { paywalled: true })

      expect(await listArchivePage(database.db, { limit: 10, until: now })).toEqual([
        {
          paywalled: true,
          publishedAt: new Date('2026-10-21T12:05:00Z'),
          sourceName: 'Voorbeeldkrant, met dank aan de redactie',
          title: 'Kop een',
          url: 'https://testkrant.test/een',
        },
      ])
    })

    it('gives an empty list when there are no items', async () => {
      expect(await titles()).toEqual([])
    })
  })

  describe('countArchiveItems', () => {
    it('counts what listArchivePage gives in all: the same headlines, for all sources, one or more', async () => {
      const krant = await addSource()
      const nieuws = await addSource({ domain: 'proefnieuws.test', name: 'Proefnieuws', slug: 'proefnieuws' })
      const off = await addSource({ domain: 'uit.test', enabled: false, name: 'Uit', slug: 'uit' })
      const podcast = await addSource({ domain: 'testpodcast.test', kind: 'podcast', slug: 'testpodcast' })

      await addItem(krant, 'een', new Date('2026-10-22T08:00:00Z'))
      await addItem(krant, 'twee', new Date('2020-01-01T08:00:00Z'))
      await addItem(krant, 'verborgen', new Date('2026-10-22T08:00:00Z'), {
        hiddenAt: new Date('2026-10-22T09:00:00Z'),
      })
      await addItem(krant, 'twijfel', new Date('2026-10-22T08:00:00Z'), { relevance: 'doubtful' })
      await addItem(krant, 'toekomst', new Date('2026-10-23T08:00:00Z'))
      await addItem(nieuws, 'drie', new Date('2026-10-22T07:00:00Z'))
      await addItem(off, 'uit', new Date('2026-10-22T07:00:00Z'))
      await addItem(podcast, 'aflevering', new Date('2026-10-22T07:00:00Z'))

      expect(await countArchiveItems(database.db, { until: now })).toBe(3)
      expect(await countArchiveItems(database.db, { sources: ['testkrant'], until: now })).toBe(2)
      expect(await countArchiveItems(database.db, { sources: ['proefnieuws'], until: now })).toBe(1)
      expect(await countArchiveItems(database.db, { sources: ['proefnieuws', 'testkrant'], until: now })).toBe(3)
      expect(await countArchiveItems(database.db, { sources: ['uit'], until: now })).toBe(0)
      expect(await countArchiveItems(database.db, { sources: ['TESTKRANT'], until: now })).toBe(0)
      expect(await listArchivePage(database.db, { limit: 50, until: now })).toHaveLength(3)
    })

    it('is zero when there are no items', async () => {
      expect(await countArchiveItems(database.db, { until: now })).toBe(0)
    })
  })

  describe('listArchiveSources', () => {
    it('gives the sources with a slug and a headline that the archive shows, by name, with their slug', async () => {
      const zeta = await addSource({ domain: 'zeta.test', name: 'Zeta', slug: 'zeta' })
      const alfa = await addSource({ domain: 'alfa.test', name: 'Alfa', slug: 'alfa' })
      const club = await addSource({ domain: 'club.test', kind: 'club', name: 'Club', slug: 'club' })

      await addItem(zeta, 'zeta', new Date('2026-10-20T08:00:00Z'))
      await addItem(alfa, 'alfa', new Date('2010-10-20T08:00:00Z'))
      await addItem(club, 'club', new Date('2026-10-20T08:00:00Z'))

      expect(await listArchiveSources(database.db, now)).toEqual([
        { name: 'Alfa', slug: 'alfa' },
        { name: 'Club', slug: 'club' },
        { name: 'Zeta', slug: 'zeta' },
      ])
    })

    it('names a source as it wants to be credited', async () => {
      const ids = await addSource({ attribution: 'Voorbeeldkrant, met dank aan de redactie' })

      await addItem(ids, 'een', new Date('2026-10-20T08:00:00Z'))

      expect(await listArchiveSources(database.db, now)).toEqual([
        { name: 'Voorbeeldkrant, met dank aan de redactie', slug: 'testkrant' },
      ])
    })

    it('leaves out a source that is switched off, a podcast, a source without a slug and a source without headlines', async () => {
      const off = await addSource({ domain: 'uit.test', enabled: false, slug: 'uit' })
      const podcast = await addSource({ domain: 'testpodcast.test', kind: 'podcast', slug: 'testpodcast' })
      const withoutSlug = await addSource({ domain: 'zonder.test', slug: null })

      await addSource({ domain: 'leeg.test', slug: 'leeg' })
      for (const [ids, key] of [
        [off, 'uit'],
        [podcast, 'aflevering'],
        [withoutSlug, 'zonder'],
      ] as const) {
        await addItem(ids, key, new Date('2026-10-20T08:00:00Z'))
      }

      expect(await listArchiveSources(database.db, now)).toEqual([])
    })

    it('leaves out a source whose headlines are all hidden, not relevant or in the future', async () => {
      const hidden = await addSource({ domain: 'verborgen.test', slug: 'verborgen' })
      const doubtful = await addSource({ domain: 'twijfel.test', slug: 'twijfel' })
      const later = await addSource({ domain: 'later.test', slug: 'later' })

      await addItem(hidden, 'verborgen', new Date('2026-10-20T08:00:00Z'), {
        hiddenAt: new Date('2026-10-21T08:00:00Z'),
      })
      await addItem(doubtful, 'twijfel', new Date('2026-10-20T08:00:00Z'), { relevance: 'doubtful' })
      await addItem(later, 'later', new Date('2026-10-23T08:00:00Z'))

      expect(await listArchiveSources(database.db, now)).toEqual([])
    })

    it('gives a source once, however many headlines it has', async () => {
      const ids = await addSource()

      await addItem(ids, 'een', new Date('2026-10-20T08:00:00Z'))
      await addItem(ids, 'twee', new Date('2026-10-21T08:00:00Z'))

      expect(await listArchiveSources(database.db, now)).toHaveLength(1)
    })
  })
})

describe('the versions of a story', () => {
  const now = new Date('2026-10-22T10:00:00Z')

  /** Puts a source with a feed in the register and returns the ids that an item needs. */
  async function addSource(overrides: Partial<typeof sources.$inferInsert> = {}) {
    const domain = overrides.domain ?? 'testkrant.test'
    const [source] = await database.db
      .insert(sources)
      .values({ domain, kind: 'news', name: 'Testkrant', slug: 'testkrant', ...overrides })
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
    publishedAt: string,
    overrides: Partial<typeof items.$inferInsert> = {},
  ) {
    await database.db.insert(items).values({
      ...ids,
      key,
      publishedAt: new Date(publishedAt),
      title: `Kop ${key}`,
      url: `https://testkrant.test/${key}`,
      ...overrides,
    })
  }

  const archive = async (options: { limit?: number; offset?: number; sources?: string[] } = {}) =>
    (await listArchivePage(database.db, { limit: 50, until: now, ...options })).map((item) => item.title)

  /** A story of three versions at 08:00, 08:30 and 09:00, and an item of its own at 08:45. */
  async function addLiveBlog(ids: { feedId: number; sourceId: number }, overrides = {}) {
    await addItem(ids, 'blog-1', '2026-10-22T08:00:00Z', { threadKey: '~aaaa1111', ...overrides })
    await addItem(ids, 'blog-2', '2026-10-22T08:30:00Z', { threadKey: '~aaaa1111', ...overrides })
    await addItem(ids, 'blog-3', '2026-10-22T09:00:00Z', { threadKey: '~aaaa1111', ...overrides })
    await addItem(ids, 'los', '2026-10-22T08:45:00Z')
  }

  it('gives the newest version of a story and the items that have no key, newest first', async () => {
    const ids = await addSource()

    await addLiveBlog(ids)

    expect(await archive()).toEqual(['Kop blog-3', 'Kop los'])
    expect((await listRecentItems(database.db, { limit: 10, until: now })).map((item) => item.title)).toEqual([
      'Kop blog-3',
      'Kop los',
    ])
  })

  it('counts a story once, so the pages follow the list and not the rows', async () => {
    const ids = await addSource()

    await addLiveBlog(ids)

    expect(await countArchiveItems(database.db, { until: now })).toBe(2)
    expect(await countArchiveItems(database.db, { sources: ['testkrant'], until: now })).toBe(2)
    expect(await archive({ limit: 1 })).toEqual(['Kop blog-3'])
    expect(await archive({ limit: 1, offset: 1 })).toEqual(['Kop los'])
    expect(await archive({ limit: 1, offset: 2 })).toEqual([])
  })

  it('puts a story where its newest version is, and gives the paywall of that version', async () => {
    const ids = await addSource()

    await addItem(ids, 'blog-1', '2026-10-22T07:00:00Z', { paywalled: true, threadKey: '~aaaa1111' })
    await addItem(ids, 'los', '2026-10-22T08:00:00Z')
    await addItem(ids, 'blog-2', '2026-10-22T09:00:00Z', { paywalled: false, threadKey: '~aaaa1111' })

    const [first] = await listArchivePage(database.db, { limit: 50, until: now })

    expect(first).toMatchObject({ paywalled: false, title: 'Kop blog-2' })
    expect(await archive()).toEqual(['Kop blog-2', 'Kop los'])
  })

  it('gives the version with the highest id when two have the same time', async () => {
    const ids = await addSource()

    await addItem(ids, 'blog-1', '2026-10-22T08:00:00Z', { threadKey: '~aaaa1111' })
    await addItem(ids, 'blog-2', '2026-10-22T08:00:00Z', { threadKey: '~aaaa1111' })

    expect(await archive()).toEqual(['Kop blog-2'])
  })

  it('keeps two stories with different keys apart', async () => {
    const ids = await addSource()

    await addItem(ids, 'een-1', '2026-10-22T08:00:00Z', { threadKey: '~aaaa1111' })
    await addItem(ids, 'twee-1', '2026-10-22T08:10:00Z', { threadKey: '~bbbb2222' })
    await addItem(ids, 'een-2', '2026-10-22T08:20:00Z', { threadKey: '~aaaa1111' })
    await addItem(ids, 'twee-2', '2026-10-22T08:30:00Z', { threadKey: '~bbbb2222' })

    expect(await archive()).toEqual(['Kop twee-2', 'Kop een-2'])
  })

  it('shows the newest version of a story when any version was relevant, whatever the newest says', async () => {
    const ids = await addSource()

    await addItem(ids, 'blog-1', '2026-10-22T08:00:00Z', { threadKey: '~aaaa1111' })
    await addItem(ids, 'blog-2', '2026-10-22T09:00:00Z', { relevance: 'irrelevant', threadKey: '~aaaa1111' })

    expect(await archive()).toEqual(['Kop blog-2'])
    expect(await countArchiveItems(database.db, { until: now })).toBe(1)
  })

  it('shows nothing of a story when no version was relevant, not even when the newest is', async () => {
    const ids = await addSource()

    await addItem(ids, 'blog-1', '2026-10-22T08:00:00Z', { relevance: 'doubtful', threadKey: '~aaaa1111' })
    await addItem(ids, 'blog-2', '2026-10-22T09:00:00Z', { relevance: 'irrelevant', threadKey: '~aaaa1111' })

    expect(await archive()).toEqual([])
    expect(await countArchiveItems(database.db, { until: now })).toBe(0)
  })

  it('shows the version before the newest when a moderator hid the newest, and nothing when all are hidden', async () => {
    const ids = await addSource()
    const hiddenAt = new Date('2026-10-22T09:30:00Z')

    await addItem(ids, 'blog-1', '2026-10-22T08:00:00Z', { threadKey: '~aaaa1111' })
    await addItem(ids, 'blog-2', '2026-10-22T09:00:00Z', { hiddenAt, threadKey: '~aaaa1111' })

    expect(await archive()).toEqual(['Kop blog-1'])

    await database.db.update(items).set({ hiddenAt }).where(eq(items.key, 'blog-1'))

    expect(await archive()).toEqual([])
    expect(await countArchiveItems(database.db, { until: now })).toBe(0)
  })

  it('does not count a hidden version when it is the only relevant one', async () => {
    const ids = await addSource()

    await addItem(ids, 'blog-1', '2026-10-22T08:00:00Z', { hiddenAt: now, threadKey: '~aaaa1111' })
    await addItem(ids, 'blog-2', '2026-10-22T09:00:00Z', { relevance: 'irrelevant', threadKey: '~aaaa1111' })

    expect(await archive()).toEqual([])
  })

  it('leaves out the versions that are later than the end time', async () => {
    const ids = await addSource()

    await addItem(ids, 'blog-1', '2026-10-22T08:00:00Z', { threadKey: '~aaaa1111' })
    await addItem(ids, 'blog-2', '2026-10-22T10:30:00Z', { threadKey: '~aaaa1111' })

    expect(await archive()).toEqual(['Kop blog-1'])
  })

  it('never joins two sources that have the same key', async () => {
    const krant = await addSource()
    const nieuws = await addSource({ domain: 'proefnieuws.test', name: 'Proefnieuws', slug: 'proefnieuws' })

    await addItem(krant, 'blog-1', '2026-10-22T08:00:00Z', { threadKey: '~aaaa1111' })
    await addItem(krant, 'blog-2', '2026-10-22T09:00:00Z', { threadKey: '~aaaa1111' })
    await addItem(nieuws, 'blog-1', '2026-10-22T08:30:00Z', { threadKey: '~aaaa1111' })

    expect(await archive()).toEqual(['Kop blog-2', 'Kop blog-1'])
    expect(await archive({ sources: ['proefnieuws'] })).toEqual(['Kop blog-1'])
    expect(await countArchiveItems(database.db, { until: now })).toBe(2)
  })

  it('keeps the source in the filter when only an older version is relevant', async () => {
    const ids = await addSource()

    await addItem(ids, 'blog-1', '2026-10-22T08:00:00Z', { threadKey: '~aaaa1111' })
    await addItem(ids, 'blog-2', '2026-10-22T09:00:00Z', { relevance: 'irrelevant', threadKey: '~aaaa1111' })

    expect((await listArchiveSources(database.db, now)).map((source) => source.slug)).toEqual(['testkrant'])
  })

  it('searches the newest version of a story only', async () => {
    const ids = await addSource()

    await addLiveBlog(ids)

    const { hits, total } = await searchPublic(database.db, { limit: 10, until: now, words: ['kop'] })

    expect(hits.map((hit) => (hit.kind === 'article' ? hit.slug : hit.title))).toEqual(['Kop blog-3', 'Kop los'])
    expect(total).toBe(2)
  })
})

describe('listNewestDiscussions', () => {
  async function addForum(overrides: Partial<typeof sources.$inferInsert> = {}) {
    const [forum] = await database.db
      .insert(sources)
      .values({ domain: 'proefforum.test', kind: 'forum', name: 'Proefforum', ...overrides })
      .$returningId()

    return forum?.id ?? 0
  }

  async function addDiscussion(
    sourceId: number,
    number: number,
    lastPostedAt: Date,
    overrides: Partial<typeof discussions.$inferInsert> = {},
  ) {
    await database.db.insert(discussions).values({
      lastPostedAt,
      lastPostedBy: 'Tribunetijger',
      replyCount: number,
      sourceId,
      title: `Discussie ${number}`,
      url: `https://proefforum.test/d/${number}-discussie`,
      ...overrides,
    })
  }

  it('gives the discussion with the latest post first', async () => {
    const forum = await addForum()

    await addDiscussion(forum, 1, new Date('2026-10-22T10:00:00Z'))
    await addDiscussion(forum, 2, new Date('2026-10-23T09:00:00Z'))
    await addDiscussion(forum, 3, new Date('2026-10-21T08:00:00Z'))

    expect((await listNewestDiscussions(database.db)).map((discussion) => discussion.title)).toEqual([
      'Discussie 2',
      'Discussie 1',
      'Discussie 3',
    ])
  })

  it('puts the newest stored discussion first when two have the same time', async () => {
    const forum = await addForum()
    const time = new Date('2026-10-23T09:00:00Z')

    await addDiscussion(forum, 1, time)
    await addDiscussion(forum, 2, time)

    expect((await listNewestDiscussions(database.db)).map((discussion) => discussion.title)).toEqual([
      'Discussie 2',
      'Discussie 1',
    ])
  })

  it('gives no discussions of a forum that is switched off, and the discussions of the others', async () => {
    const on = await addForum()
    const off = await addForum({ domain: 'uitgezet.test', enabled: false, name: 'Uitgezet forum' })

    await addDiscussion(on, 1, new Date('2026-10-22T10:00:00Z'))
    await addDiscussion(off, 2, new Date('2026-10-23T10:00:00Z'))

    expect((await listNewestDiscussions(database.db)).map((discussion) => discussion.title)).toEqual(['Discussie 1'])
  })

  it('gives only the title, the address, the replies, the time and the screen name', async () => {
    const forum = await addForum()

    await addDiscussion(forum, 1, new Date('2026-10-23T11:28:00Z'), { replyCount: 83 })

    expect(await listNewestDiscussions(database.db)).toEqual([
      {
        lastPostedAt: new Date('2026-10-23T11:28:00Z'),
        lastPostedBy: 'Tribunetijger',
        replyCount: 83,
        title: 'Discussie 1',
        url: 'https://proefforum.test/d/1-discussie',
      },
    ])
  })

  it('gives a missing screen name as null', async () => {
    const forum = await addForum()

    await addDiscussion(forum, 1, new Date('2026-10-23T11:28:00Z'), { lastPostedBy: null })

    expect((await listNewestDiscussions(database.db))[0]?.lastPostedBy).toBeNull()
  })

  it('gives at most the number it is asked for, five by default', async () => {
    const forum = await addForum()

    for (let number = 1; number <= 7; number++) {
      await addDiscussion(forum, number, new Date(Date.UTC(2026, 9, 20 + number)))
    }

    expect(await listNewestDiscussions(database.db)).toHaveLength(5)
    expect(await listNewestDiscussions(database.db, 2)).toHaveLength(2)
  })

  it('gives an empty list when there are no discussions', async () => {
    await addForum()

    expect(await listNewestDiscussions(database.db)).toEqual([])
  })

  it('loses the discussions of a forum when the forum leaves the register', async () => {
    const forum = await addForum()

    await addDiscussion(forum, 1, new Date('2026-10-23T11:28:00Z'))
    await database.db.delete(sources).where(eq(sources.id, forum))

    expect(await database.db.select().from(discussions)).toEqual([])
  })
})

describe('the podcasts', () => {
  const now = new Date('2026-10-22T10:00:00Z')

  /** Puts a source with a feed in the register and returns the ids that an item needs. */
  async function addSource(overrides: Partial<typeof sources.$inferInsert>) {
    const domain = overrides.domain ?? 'testpodcast.test'
    const [source] = await database.db
      .insert(sources)
      .values({ domain, kind: 'podcast', name: 'Testpodcast', ...overrides })
      .$returningId()
    const sourceId = source?.id ?? 0
    const [feed] = await database.db
      .insert(feeds)
      .values({ sourceId, url: `https://${domain}/rss/` })
      .$returningId()

    return { feedId: feed?.id ?? 0, sourceId }
  }

  async function addItem(ids: { feedId: number; sourceId: number }, key: string, publishedAt: Date) {
    await database.db
      .insert(items)
      .values({ ...ids, key, publishedAt, title: `Aflevering ${key}`, url: `https://testpodcast.test/e/${key}` })
  }

  /**
   * The made-up podcasts of the seed, with an episode each, a news source and a podcast that is
   * switched off.
   */
  async function fill() {
    await seedSources(database.db)

    const idsOf = async (domain: string) => {
      const [source] = await database.db.select().from(sources).where(eq(sources.domain, domain))
      const [feed] = await database.db
        .insert(feeds)
        .values({ sourceId: source?.id ?? 0, url: `https://${domain}/rss/` })
        .$returningId()

      return { feedId: feed?.id ?? 0, sourceId: source?.id ?? 0 }
    }

    return {
      news: await idsOf('testkrant.test'),
      proef: await idsOf('proefpodcast.test'),
      test: await idsOf('testpodcast.test'),
    }
  }

  describe('listPodcastEpisodes', () => {
    it('gives the episodes of the podcasts and no news, newest first, with the name of the podcast', async () => {
      const ids = await fill()

      await addItem(ids.test, 'oud', new Date('2026-10-01T08:00:00Z'))
      await addItem(ids.proef, 'nieuw', new Date('2026-10-20T08:00:00Z'))
      await addItem(ids.news, 'bericht', new Date('2026-10-21T08:00:00Z'))

      const result = await listPodcastEpisodes(database.db, { limit: 25, until: now })

      expect(result.map((episode) => [episode.title, episode.sourceName])).toEqual([
        ['Aflevering nieuw', 'Proefpodcast'],
        ['Aflevering oud', 'Testpodcast'],
      ])
    })

    it('gives only the title, the link, the time, the name, and the duration, the season and the number', async () => {
      const ids = await fill()

      await addItem(ids.test, 'een', new Date('2026-10-20T08:00:00Z'))

      const [episode] = await listPodcastEpisodes(database.db, { limit: 25, until: now })

      expect(Object.keys(episode ?? {}).sort()).toEqual([
        'durationSeconds',
        'episodeNumber',
        'publishedAt',
        'seasonNumber',
        'sourceName',
        'title',
        'url',
      ])
    })

    it('gives the duration, the season and the number of an episode, and null for what the feed did not give', async () => {
      const ids = await fill()

      await database.db.insert(items).values([
        {
          ...ids.test,
          durationSeconds: 2944,
          episodeNumber: 16,
          key: 'met',
          publishedAt: new Date('2026-10-20T08:00:00Z'),
          seasonNumber: 9,
          title: 'Met alles',
          url: 'https://testpodcast.test/e/met',
        },
        {
          ...ids.test,
          key: 'zonder',
          publishedAt: new Date('2026-10-19T08:00:00Z'),
          title: 'Zonder',
          url: 'https://testpodcast.test/e/zonder',
        },
      ])

      expect(
        (await listPodcastEpisodes(database.db, { limit: 25, until: now })).map(
          ({ durationSeconds, episodeNumber, seasonNumber }) => [durationSeconds, seasonNumber, episodeNumber],
        ),
      ).toEqual([
        [2944, 9, 16],
        [null, null, null],
      ])
    })

    it('credits the podcast the way it wants to be credited', async () => {
      const ids = await addSource({ attribution: 'Abe, met dank aan de LC', name: 'Omroep Abe', slug: 'abe' })

      await addItem(ids, 'een', new Date('2026-10-20T08:00:00Z'))

      expect((await listPodcastEpisodes(database.db, { limit: 25, until: now })).map((e) => e.sourceName)).toEqual([
        'Abe, met dank aan de LC',
      ])
    })

    it('gives no episode that is hidden, and does not count it', async () => {
      const ids = await addSource({ slug: 'abe' })
      const hiddenAt = new Date('2026-10-21T12:00:00Z')

      await addItem(ids, 'zichtbaar', new Date('2026-10-20T08:00:00Z'))
      await database.db.insert(items).values({
        ...ids,
        hiddenAt,
        key: 'verborgen',
        publishedAt: new Date('2026-10-21T08:00:00Z'),
        title: 'Aflevering verborgen',
        url: 'https://testpodcast.test/e/verborgen',
      })

      expect((await listPodcastEpisodes(database.db, { limit: 25, until: now })).map((e) => e.title)).toEqual([
        'Aflevering zichtbaar',
      ])
      expect((await listPodcastEpisodes(database.db, { limit: 25, podcasts: ['abe'], until: now })).length).toBe(1)
      expect(await countPodcastEpisodes(database.db, { until: now })).toBe(1)
      expect(await countPodcastEpisodes(database.db, { podcasts: ['abe'], until: now })).toBe(1)
    })

    it.each(['doubtful', 'irrelevant'] as const)('gives no %s episode, and does not count it', async (relevance) => {
      const ids = await addSource({ slug: 'abe' })

      await addItem(ids, 'zichtbaar', new Date('2026-10-20T08:00:00Z'))
      await database.db.insert(items).values({
        ...ids,
        key: 'twijfel',
        publishedAt: new Date('2026-10-21T08:00:00Z'),
        relevance,
        title: 'Aflevering twijfel',
        url: 'https://testpodcast.test/e/twijfel',
      })

      expect((await listPodcastEpisodes(database.db, { limit: 25, until: now })).map((e) => e.title)).toEqual([
        'Aflevering zichtbaar',
      ])
      expect((await listPodcastEpisodes(database.db, { limit: 25, podcasts: ['abe'], until: now })).length).toBe(1)
      expect(await countPodcastEpisodes(database.db, { until: now })).toBe(1)
      expect(await countPodcastEpisodes(database.db, { podcasts: ['abe'], until: now })).toBe(1)
    })

    it('leaves a podcast out of the filter when none of its episodes is relevant', async () => {
      const ids = await addSource({ slug: 'abe' })

      await database.db.insert(items).values({
        ...ids,
        key: 'twijfel',
        publishedAt: new Date('2026-10-21T08:00:00Z'),
        relevance: 'doubtful',
        title: 'Aflevering twijfel',
        url: 'https://testpodcast.test/e/twijfel',
      })

      expect(await listPodcasts(database.db)).toEqual([])
    })

    it('leaves a podcast out of the filter when all its episodes are hidden', async () => {
      const ids = await addSource({ slug: 'abe' })

      await database.db.insert(items).values({
        ...ids,
        hiddenAt: new Date('2026-10-21T12:00:00Z'),
        key: 'verborgen',
        publishedAt: new Date('2026-10-21T08:00:00Z'),
        title: 'Aflevering verborgen',
        url: 'https://testpodcast.test/e/verborgen',
      })

      expect(await listPodcasts(database.db)).toEqual([])
    })

    it('gives no episodes of a podcast that is switched off', async () => {
      const on = await addSource({ domain: 'aan.test', name: 'Aan', slug: 'aan' })
      const off = await addSource({ domain: 'uit.test', enabled: false, name: 'Uit', slug: 'uit' })

      await addItem(on, 'aan', new Date('2026-10-20T08:00:00Z'))
      await addItem(off, 'uit', new Date('2026-10-21T08:00:00Z'))

      expect((await listPodcastEpisodes(database.db, { limit: 25, until: now })).map((e) => e.title)).toEqual([
        'Aflevering aan',
      ])
      expect(await countPodcastEpisodes(database.db, { until: now })).toBe(1)
    })

    it('gives the episodes of one podcast, by slug, and none for a slug that no podcast has', async () => {
      const ids = await fill()

      await addItem(ids.test, 'test', new Date('2026-10-01T08:00:00Z'))
      await addItem(ids.proef, 'proef', new Date('2026-10-20T08:00:00Z'))

      expect(
        (await listPodcastEpisodes(database.db, { limit: 25, podcasts: ['testpodcast'], until: now })).map(
          (e) => e.title,
        ),
      ).toEqual(['Aflevering test'])
      expect(await countPodcastEpisodes(database.db, { podcasts: ['testpodcast'], until: now })).toBe(1)
      expect(await listPodcastEpisodes(database.db, { limit: 25, podcasts: ['testkrant'], until: now })).toEqual([])
      expect(await countPodcastEpisodes(database.db, { podcasts: ['nergens'], until: now })).toBe(0)
    })

    it('gives the episodes of more podcasts, by slug, and the total of them', async () => {
      const ids = await fill()

      await addItem(ids.test, 'test', new Date('2026-10-01T08:00:00Z'))
      await addItem(ids.proef, 'proef', new Date('2026-10-20T08:00:00Z'))

      const both = { limit: 25, podcasts: ['testpodcast', 'proefpodcast'], until: now }

      expect((await listPodcastEpisodes(database.db, both)).map((e) => e.title)).toEqual([
        'Aflevering proef',
        'Aflevering test',
      ])
      expect(await countPodcastEpisodes(database.db, both)).toBe(2)
      // A slug that no podcast has adds nothing, and no slugs is every podcast.
      expect(await countPodcastEpisodes(database.db, { podcasts: ['testpodcast', 'nergens'], until: now })).toBe(1)
      expect(await countPodcastEpisodes(database.db, { podcasts: [], until: now })).toBe(2)
    })

    it('gives a page, and the total of all pages', async () => {
      const ids = await fill()

      for (let day = 1; day <= 7; day++) {
        await addItem(ids.test, `dag-${day}`, new Date(Date.UTC(2026, 9, day, 8)))
      }

      const page = (offset: number) =>
        listPodcastEpisodes(database.db, { limit: 3, offset, until: now }).then((rows) => rows.map((e) => e.title))

      expect(await page(0)).toEqual(['Aflevering dag-7', 'Aflevering dag-6', 'Aflevering dag-5'])
      expect(await page(3)).toEqual(['Aflevering dag-4', 'Aflevering dag-3', 'Aflevering dag-2'])
      expect(await page(6)).toEqual(['Aflevering dag-1'])
      expect(await page(9)).toEqual([])
      expect(await countPodcastEpisodes(database.db, { until: now })).toBe(7)
    })

    it('gives no episode from the future, and the episode at exactly the end time', async () => {
      const ids = await fill()

      await addItem(ids.test, 'nu', now)
      await addItem(ids.test, 'later', new Date(now.getTime() + 1000))

      expect((await listPodcastEpisodes(database.db, { limit: 25, until: now })).map((e) => e.title)).toEqual([
        'Aflevering nu',
      ])
      expect(await countPodcastEpisodes(database.db, { until: now })).toBe(1)
    })

    it('puts the newest stored episode first when two were published in the same second', async () => {
      const ids = await fill()
      const time = new Date('2026-10-20T08:00:00Z')

      await addItem(ids.test, 'eerst', time)
      await addItem(ids.test, 'daarna', time)

      expect((await listPodcastEpisodes(database.db, { limit: 25, until: now })).map((e) => e.title)).toEqual([
        'Aflevering daarna',
        'Aflevering eerst',
      ])
    })
  })

  describe('listPodcasts', () => {
    it('gives the podcasts that are switched on and have an episode, by name, with their slug', async () => {
      const ids = await fill()
      const off = await addSource({ domain: 'uit.test', enabled: false, name: 'Uit', slug: 'uit' })
      const withoutSlug = await addSource({ domain: 'zonder.test', name: 'Zonder slug' })

      await addItem(ids.test, 'test', new Date('2026-10-01T08:00:00Z'))
      await addItem(ids.proef, 'proef', new Date('2026-10-20T08:00:00Z'))
      await addItem(off, 'uit', new Date('2026-10-20T08:00:00Z'))
      await addItem(withoutSlug, 'zonder', new Date('2026-10-20T08:00:00Z'))
      await addItem(ids.news, 'bericht', new Date('2026-10-20T08:00:00Z'))

      expect(await listPodcasts(database.db)).toEqual([
        { name: 'Proefpodcast', slug: 'proefpodcast' },
        { name: 'Testpodcast', slug: 'testpodcast' },
      ])
    })

    it('leaves out a podcast without episodes', async () => {
      await seedSources(database.db)

      expect(await listPodcasts(database.db)).toEqual([])
    })
  })

  describe('findPodcast', () => {
    it('gives the name and the addresses of a podcast, null for an address it does not have, and nothing else', async () => {
      await seedSources(database.db)

      const both = await findPodcast(database.db, 'testpodcast')
      const apple = await findPodcast(database.db, 'proefpodcast')

      expect(both).toEqual({
        applePodcastsUrl: 'https://apple.test/podcast/testpodcast',
        description: 'Een verzonnen podcast waarin supporters na elke wedstrijd napraten.',
        name: 'Testpodcast',
        slug: 'testpodcast',
        spotifyUrl: 'https://spotify.test/show/testpodcast',
      })
      expect(apple).toMatchObject({ applePodcastsUrl: 'https://apple.test/podcast/proefpodcast', spotifyUrl: null })
    })

    it('gives a description of null for a podcast that has none, and no other columns', async () => {
      await database.db
        .insert(sources)
        .values({ domain: 'zonder.test', kind: 'podcast', name: 'Zonder', slug: 'zonder' })

      const podcast = await findPodcast(database.db, 'zonder')

      expect(podcast).toEqual({
        applePodcastsUrl: null,
        description: null,
        name: 'Zonder',
        slug: 'zonder',
        spotifyUrl: null,
      })
    })

    it('gives nothing for an unknown slug, a source that is no podcast, or a podcast that is switched off', async () => {
      await seedSources(database.db)
      await database.db.update(sources).set({ slug: 'testkrant' }).where(eq(sources.domain, 'testkrant.test'))
      await database.db.update(sources).set({ enabled: false }).where(eq(sources.domain, 'proefpodcast.test'))

      expect(await findPodcast(database.db, 'bestaat-niet')).toBeUndefined()
      expect(await findPodcast(database.db, 'testkrant')).toBeUndefined()
      expect(await findPodcast(database.db, 'proefpodcast')).toBeUndefined()
    })

    it('finds a podcast by its slug exactly, and not by the same letters in another case or with accents', async () => {
      await seedSources(database.db)

      expect(await findPodcast(database.db, 'testpodcast')).toBeDefined()
      expect(await findPodcast(database.db, 'Testpodcast')).toBeUndefined()
      expect(await findPodcast(database.db, 'testpodcást')).toBeUndefined()
      expect(await countPodcastEpisodes(database.db, { podcasts: ['TESTPODCAST'], until: now })).toBe(0)
    })
  })
})

describe('the matches and the table of a season', () => {
  const now = new Date('2026-10-25T12:00:00Z')

  beforeEach(async () => {
    await database.pool.query('DELETE FROM matches')
    await database.pool.query('DELETE FROM players')
    await database.pool.query('DELETE FROM standings')
    await database.pool.query('DELETE FROM wikipedia_pages')
  })

  describe('listMatchSeasons', () => {
    it('gives the seasons that have matches, the newest first and each once', async () => {
      await database.db.insert(matches).values(await withClubs(database.db, madeUpMatches(now)))
      await database.db
        .insert(matches)
        .values(await withClubs(database.db, madeUpMatches(new Date('2025-10-25T12:00:00Z'))))
      await database.db
        .insert(matches)
        .values(await withClubs(database.db, madeUpMatches(new Date('1999-10-25T12:00:00Z'))))

      expect(await listMatchSeasons(database.db)).toEqual(['2026/27', '2025/26', '1999/00'])
    })

    it('leaves out a season that has only a table', async () => {
      await database.db.insert(matches).values(await withClubs(database.db, madeUpMatches(now)))
      await database.db.insert(standings).values({ ...madeUpTable(now)[0]!, season: '2025/26' })

      expect(await listMatchSeasons(database.db)).toEqual(['2026/27'])
    })

    it('gives nothing without matches', async () => {
      expect(await listMatchSeasons(database.db)).toEqual([])
    })
  })

  describe('listSeasonMatches', () => {
    it('gives the matches of the season in the order they are played, a match without a kick-off first on its day', async () => {
      await database.db.insert(matches).values(await withClubs(database.db, madeUpMatches(now)))
      await database.db.insert(matches).values(
        await withClubs(database.db, [
          {
            competition: 'KNVB Beker',
            home: true,
            kickoffAt: new Date('2026-10-28T19:30:00Z'),
            matchDate: '2026-10-28',
            opponent: 'Late Gast',
            round: 'Derde ronde',
            season: '2026/27',
            status: 'scheduled',
          },
          {
            competition: 'Eredivisie',
            dateText: '28 oktober 2026',
            home: false,
            matchDate: '2026-10-28',
            opponent: 'Vroege Gast',
            round: 'Speelronde 9',
            season: '2026/27',
            status: 'scheduled',
          },
        ]),
      )

      const rows = await listSeasonMatches(database.db, '2026/27')
      const days = rows.map((match) => match.matchDate)

      expect(days).toEqual([...days].sort())
      expect(rows.map((match) => match.opponent).filter((name) => name.endsWith('Gast'))).toEqual([
        'Vroege Gast',
        'Late Gast',
      ])
    })

    it('gives a played match its goals and the others none, and keeps the kick-off in UTC', async () => {
      await database.db.insert(matches).values(await withClubs(database.db, madeUpMatches(now)))

      const rows = await listSeasonMatches(database.db, '2026/27')
      const played = rows.find((match) => match.round === 'Speelronde 1')
      const planned = rows.find((match) => match.round === 'Speelronde 3')

      expect(played).toMatchObject({ goalsAgainst: 0, goalsFor: 6, home: true, status: 'played' })
      expect(planned).toMatchObject({ goalsAgainst: null, goalsFor: null, status: 'scheduled' })
      expect(planned?.kickoffAt).toEqual(new Date('2026-10-28T18:45:00Z'))
    })

    it('gives a cup match its extra time and its shoot-out from the side of sc Heerenveen', async () => {
      await database.db.insert(matches).values(await withClubs(database.db, madeUpMatches(now)))

      const rows = await listSeasonMatches(database.db, '2026/27')
      const extra = rows.find((match) => match.round === 'Eerste ronde')
      const shootOut = rows.find((match) => match.round === 'Kwartfinale')
      const league = rows.find((match) => match.round === 'Speelronde 1')

      expect(extra).toMatchObject({ extraTime: true, penaltiesAgainst: null, penaltiesFor: null })
      expect(shootOut).toMatchObject({ extraTime: true, penaltiesAgainst: 5, penaltiesFor: 4 })
      expect(league).toMatchObject({ extraTime: false, penaltiesAgainst: null, penaltiesFor: null })
    })

    it('gives a cup match with extra time the score after 90 minutes when the seed has it', async () => {
      await database.db.insert(matches).values(await withClubs(database.db, madeUpMatches(now)))

      const rows = await listSeasonMatches(database.db, '2026/27')
      const byRound = (round: string) => rows.find((match) => match.round === round)

      expect(byRound('Eerste ronde')).toMatchObject({ afterNinetyAgainst: 1, afterNinetyFor: 1 })
      expect(byRound('Achtste finale')).toMatchObject({ afterNinetyAgainst: null, afterNinetyFor: null })
      expect(byRound('Speelronde 1')).toMatchObject({ afterNinetyAgainst: null, afterNinetyFor: null })
    })

    it('gives a played match its scorers in the order of the clock, and the others none', async () => {
      await database.db.insert(matches).values(await withClubs(database.db, madeUpMatches(now)))

      const [cupMatch] = await database.db
        .select({ id: matches.id })
        .from(matches)
        .where(eq(matches.round, 'Kwartfinale'))
      const id = cupMatch?.id ?? 0

      await database.db.insert(matchGoals).values([
        { matchId: id, minute: 88, ours: false, player: 'Late' },
        { matchId: id, minute: 45, ours: false, player: 'Blessuretijd', stoppageMinutes: 2 },
        { matchId: id, minute: 46, ours: true, player: 'Na rust' },
        { matchId: id, minute: 45, ours: true, player: 'Voor rust' },
        { matchId: id, minute: 18, ours: true, penalty: true, player: 'Vroeg' },
      ])

      const rows = await listSeasonMatches(database.db, '2026/27')
      const cup = rows.find((match) => match.round === 'Kwartfinale')

      expect(cup?.goals).toEqual([
        {
          minute: 18,
          ours: true,
          ownGoal: false,
          penalty: true,
          player: 'Vroeg',
          playerId: null,
          playerName: null,
          playerPage: null,
          playerSearchTerm: null,
          stoppageMinutes: null,
        },
        {
          minute: 45,
          ours: true,
          ownGoal: false,
          penalty: false,
          player: 'Voor rust',
          playerId: null,
          playerName: null,
          playerPage: null,
          playerSearchTerm: null,
          stoppageMinutes: null,
        },
        {
          minute: 45,
          ours: false,
          ownGoal: false,
          penalty: false,
          player: 'Blessuretijd',
          playerId: null,
          playerName: null,
          playerPage: null,
          playerSearchTerm: null,
          stoppageMinutes: 2,
        },
        {
          minute: 46,
          ours: true,
          ownGoal: false,
          penalty: false,
          player: 'Na rust',
          playerId: null,
          playerName: null,
          playerPage: null,
          playerSearchTerm: null,
          stoppageMinutes: null,
        },
        {
          minute: 88,
          ours: false,
          ownGoal: false,
          penalty: false,
          player: 'Late',
          playerId: null,
          playerName: null,
          playerPage: null,
          playerSearchTerm: null,
          stoppageMinutes: null,
        },
      ])
      expect(rows.filter((match) => match !== cup).every((match) => match.goals.length === 0)).toBe(true)
    })

    it('gives a goal of one of our players the player and his full name, also when he has left the squad', async () => {
      await database.db.insert(matches).values(await withClubs(database.db, madeUpMatches(now)))

      const [cupMatch] = await database.db
        .select({ id: matches.id })
        .from(matches)
        .where(eq(matches.round, 'Kwartfinale'))
      const id = cupMatch?.id ?? 0
      const [{ insertId: oyen }] = await database.db.insert(players).values({
        name: 'Luca Oyen',
        position: 'aanvaller',
        searchTerm: 'Oyen',
        season: '2026/27',
        wikipediaPage: 'Luca Oyen',
      })
      const [{ insertId: farji }] = await database.db.insert(players).values({
        inSquad: false,
        leftSquadAt: now,
        name: 'Marko Farji',
        position: 'aanvaller',
        searchTerm: 'Farji',
        season: '2026/27',
        wikipediaPage: 'Marko Farji',
      })

      await database.db.insert(matchGoals).values([
        { matchId: id, minute: 10, ours: true, player: 'Oyen', playerId: oyen, wikipediaPage: 'Luca Oyen' },
        { matchId: id, minute: 20, ours: true, player: 'Farji', playerId: farji },
        { matchId: id, minute: 25, ours: true, player: 'Kemper', wikipediaPage: 'Boy Kemper' },
        { matchId: id, minute: 30, ours: false, player: 'Teststraat' },
      ])

      const cup = (await listSeasonMatches(database.db, '2026/27')).find((match) => match.round === 'Kwartfinale')

      expect(
        cup?.goals.map(({ player, playerId, playerName, playerPage, playerSearchTerm }) => [
          player,
          playerId,
          playerName,
          playerPage,
          playerSearchTerm,
        ]),
      ).toEqual([
        ['Oyen', oyen, 'Luca Oyen', 'Luca Oyen', 'Oyen'],
        ['Farji', farji, 'Marko Farji', null, 'Farji'],
        ['Kemper', null, null, 'Boy Kemper', null],
        ['Teststraat', null, null, null, null],
      ])
    })

    it('gives only the season it is asked for', async () => {
      await database.db.insert(matches).values(await withClubs(database.db, madeUpMatches(now)))
      await database.db
        .insert(matches)
        .values(await withClubs(database.db, madeUpMatches(new Date('2027-08-01T12:00:00Z'))))

      const rows = await listSeasonMatches(database.db, '2026/27')

      expect(rows).toHaveLength(madeUpMatches(now).length)
      expect(await listSeasonMatches(database.db, '2025/26')).toEqual([])
    })

    it('leaves the columns that are internal out', async () => {
      await database.db.insert(matches).values(await withClubs(database.db, madeUpMatches(now)))

      const [row] = await listSeasonMatches(database.db, '2026/27')

      expect(Object.keys(row ?? {}).sort()).toEqual([
        'afterNinetyAgainst',
        'afterNinetyFor',
        'competition',
        'dateText',
        'extraTime',
        'goals',
        'goalsAgainst',
        'goalsFor',
        'home',
        'kickoffAt',
        'matchDate',
        'note',
        'opponent',
        'penaltiesAgainst',
        'penaltiesFor',
        'round',
        'stadium',
        'status',
      ])
    })
  })

  describe('listSeasonStandings', () => {
    it('gives the table of the season from the first place down', async () => {
      await database.db.insert(standings).values(madeUpTable(now).reverse())

      const rows = await listSeasonStandings(database.db, '2026/27')

      expect(rows.map((row) => row.position)).toEqual([1, 2, 3, 4, 5, 6])
      expect(rows[0]).toMatchObject({ club: 'sc Heerenveen', goalDifference: 12, points: 7, validOn: '2026-10-18' })
    })

    it('gives only the season it is asked for, so a table of an earlier season is not shown', async () => {
      await database.db.insert(standings).values(madeUpTable(now))
      await database.db.insert(standings).values(madeUpTable(new Date('2025-10-25T12:00:00Z')))

      expect(await listSeasonStandings(database.db, '2026/27')).toHaveLength(6)
      expect(await listSeasonStandings(database.db, '2025/26')).toHaveLength(6)
      expect(await listSeasonStandings(database.db, '2027/28')).toEqual([])
    })

    it('keeps a negative goal difference', async () => {
      await database.db.insert(standings).values(madeUpTable(now))

      const rows = await listSeasonStandings(database.db, '2026/27')

      expect(rows.at(-1)?.goalDifference).toBe(-2)
    })
  })

  describe('listAllWikipediaPages', () => {
    it('gives the pages of every season, the newest season first, and leaves out the squad', async () => {
      await database.db.insert(wikipediaPages).values([
        ...madeUpWikipediaPages(now).reverse(),
        madeUpSquadPage(now),
        {
          kind: 'standings',
          readAt: new Date('2025-10-25T12:00:00Z'),
          season: '2025/26',
          title: 'Eredivisie 2025/26 (mannenvoetbal)',
          version: null,
        },
      ])

      const rows = await listAllWikipediaPages(database.db)

      expect(rows.map((page) => `${page.season} ${page.kind}`)).toEqual([
        '2026/27 standings',
        '2026/27 programme',
        '2026/27 cup',
        '2026/27 playoffs',
        '2025/26 standings',
      ])
      expect(rows[4]).toEqual({
        kind: 'standings',
        readAt: new Date('2025-10-25T12:00:00Z'),
        season: '2025/26',
        title: 'Eredivisie 2025/26 (mannenvoetbal)',
      })
    })

    it('gives nothing while no page was read', async () => {
      expect(await listAllWikipediaPages(database.db)).toEqual([])
    })
  })

  describe('listWikipediaPages', () => {
    it('gives the pages of the season, the standings first, with the moment they were read', async () => {
      await database.db.insert(wikipediaPages).values(madeUpWikipediaPages(now).reverse())
      await database.db.insert(wikipediaPages).values({
        kind: 'standings',
        readAt: new Date('2025-10-25T12:00:00Z'),
        season: '2025/26',
        title: 'Eredivisie 2025/26 (mannenvoetbal)',
        version: null,
      })

      const rows = await listWikipediaPages(database.db, '2026/27')

      expect(rows).toEqual([
        { kind: 'standings', readAt: now, title: 'Eredivisie 2026/27 (mannenvoetbal)' },
        { kind: 'programme', readAt: now, title: 'Eredivisie 2026/27 (mannenvoetbal)/Wedstrijden' },
        { kind: 'cup', readAt: now, title: 'KNVB Beker 2026/27 (mannen)' },
        { kind: 'playoffs', readAt: now, title: 'Play-offs Nederlands voetbal 2027' },
      ])
    })

    it('leaves out the page of the squad', async () => {
      await database.db.insert(wikipediaPages).values([...madeUpWikipediaPages(now), madeUpSquadPage(now)])

      expect((await listWikipediaPages(database.db, '2026/27')).map((page) => page.kind)).toEqual([
        'standings',
        'programme',
        'cup',
        'playoffs',
      ])
    })

    it('has the pages of the made-up matches once they are seeded', async () => {
      await seedMatches(database.db, now)

      expect((await listWikipediaPages(database.db, '2026/27')).map((page) => page.kind)).toEqual([
        'standings',
        'programme',
        'cup',
        'playoffs',
      ])
    })
  })
})
