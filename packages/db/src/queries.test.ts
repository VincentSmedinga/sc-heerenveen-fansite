import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import {
  countPodcastEpisodes,
  findPodcast,
  listEnabledSources,
  listNewestDiscussions,
  listPodcastEpisodes,
  listPodcasts,
  listRecentItems,
} from './queries.ts'
import { discussions, feeds, items, sources } from './schema.ts'
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
      expect((await listPodcastEpisodes(database.db, { limit: 25, podcast: 'abe', until: now })).length).toBe(1)
      expect(await countPodcastEpisodes(database.db, { until: now })).toBe(1)
      expect(await countPodcastEpisodes(database.db, { podcast: 'abe', until: now })).toBe(1)
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
      expect((await listPodcastEpisodes(database.db, { limit: 25, podcast: 'abe', until: now })).length).toBe(1)
      expect(await countPodcastEpisodes(database.db, { until: now })).toBe(1)
      expect(await countPodcastEpisodes(database.db, { podcast: 'abe', until: now })).toBe(1)
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
        (await listPodcastEpisodes(database.db, { limit: 25, podcast: 'testpodcast', until: now })).map((e) => e.title),
      ).toEqual(['Aflevering test'])
      expect(await countPodcastEpisodes(database.db, { podcast: 'testpodcast', until: now })).toBe(1)
      expect(await listPodcastEpisodes(database.db, { limit: 25, podcast: 'testkrant', until: now })).toEqual([])
      expect(await countPodcastEpisodes(database.db, { podcast: 'nergens', until: now })).toBe(0)
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
      expect(await countPodcastEpisodes(database.db, { podcast: 'TESTPODCAST', until: now })).toBe(0)
    })
  })
})
