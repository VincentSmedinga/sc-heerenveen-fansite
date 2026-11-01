import { asc, eq } from 'drizzle-orm'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import {
  consentStatuses,
  feeds,
  items,
  matches,
  matchGoals,
  playerPositions,
  players,
  sourceKinds,
  sources,
  standings,
  wikipediaPages,
} from './schema.ts'
import { seasonOf } from './season.ts'
import {
  madeUpMatches,
  madeUpSquad,
  realSources,
  removeTestSources,
  seedMatches,
  seedRealSources,
  seedSources,
  seedSquad,
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

const seedScript = fileURLToPath(new URL('./seed.ts', import.meta.url))

/** Runs `pnpm db:seed` against the test database, with the given SITE_ENV. */
function runSeedScript(siteEnv: string) {
  return promisify(execFile)(process.execPath, [seedScript], {
    env: { ...process.env, DATABASE_URL: database.url, SITE_ENV: siteEnv },
  })
}

describe('the seed', () => {
  beforeEach(async () => {
    await database.pool.query('DELETE FROM sources')
  })

  it('makes no duplicates when it runs again', async () => {
    await seedSources(database.db)
    await seedSources(database.db)

    expect(await database.db.select().from(sources)).toHaveLength(testSources.length + realSources.length)
    expect(await database.db.select().from(feeds)).toHaveLength(
      realSources.reduce((count, source) => count + source.feeds.length, 0),
    )
  })

  it('leaves the ETag and Last-Modified of a feed alone when it runs again', async () => {
    await seedSources(database.db)
    await database.pool.query("UPDATE feeds SET etag = '\"v1\"', last_modified = 'Wed, 21 Oct 2026 07:28:00 GMT'")
    await seedSources(database.db)

    const rows = await database.db.select().from(feeds)

    expect(rows).not.toHaveLength(0)
    expect(rows.every((feed) => feed.etag === '"v1"' && feed.lastModified === 'Wed, 21 Oct 2026 07:28:00 GMT')).toBe(
      true,
    )
  })

  it('leaves the filter of a feed alone when it runs again, so a feed set to club stays so', async () => {
    await seedSources(database.db)
    await database.pool.query("UPDATE feeds SET filter = 'club'")
    await seedSources(database.db)

    const rows = await database.db.select().from(feeds)

    expect(rows).not.toHaveLength(0)
    expect(rows.every((feed) => feed.filter === 'club')).toBe(true)
  })

  it('does not put a feed back on the filter it started with when it runs again', async () => {
    await seedSources(database.db)
    await database.pool.query("UPDATE feeds SET filter = 'none'")
    await seedSources(database.db)

    const rows = await database.db.select().from(feeds)

    expect(rows).not.toHaveLength(0)
    expect(rows.every((feed) => feed.filter === 'none')).toBe(true)
  })

  it('starts every feed on none, except the feeds of the register that are about more than the club', async () => {
    await seedSources(database.db)

    const rows = await database.db.select({ filter: feeds.filter, url: feeds.url }).from(feeds)

    expect(rows.filter((feed) => feed.filter === 'club').map((feed) => feed.url)).toEqual([
      'https://www.omropfryslan.nl/rss/index.xml',
      'https://feeds.nos.nl/nosvoetbal',
      'https://www.ad.nl/voetbal/rss.xml',
      'https://www.gelderlander.nl/sport/rss.xml',
      'https://www.espn.nl/espn/rss/soccer/news',
    ])
  })

  it('puts Omrop Fryslân in the register with its feed on the club filter and the strictest policy', async () => {
    await seedSources(database.db)

    const [omrop] = await database.db.select().from(sources).where(eq(sources.domain, 'www.omropfryslan.nl'))
    const omropFeeds = await database.db
      .select()
      .from(feeds)
      .where(eq(feeds.sourceId, omrop?.id ?? 0))

    expect(omrop).toMatchObject({
      allowEmbed: false,
      allowImage: false,
      enabled: true,
      introMaxLength: 0,
      kind: 'news',
      name: 'Omrop Fryslân',
    })
    expect(omrop?.consentStatus).not.toBe('given')
    expect(omrop?.description).toBeTruthy()
    expect(omrop?.description?.length).toBeLessThanOrEqual(300)
    expect(omropFeeds.map((feed) => [feed.url, feed.filter])).toEqual([
      ['https://www.omropfryslan.nl/rss/index.xml', 'club'],
    ])
  })

  it('puts NOS in the register with its football feed on the club filter and the strictest policy', async () => {
    await seedSources(database.db)

    const [nos] = await database.db.select().from(sources).where(eq(sources.domain, 'nos.nl'))
    const nosFeeds = await database.db
      .select()
      .from(feeds)
      .where(eq(feeds.sourceId, nos?.id ?? 0))

    expect(nos).toMatchObject({
      allowEmbed: false,
      allowImage: false,
      enabled: true,
      introMaxLength: 0,
      kind: 'news',
      name: 'NOS',
    })
    expect(nos?.consentStatus).not.toBe('given')
    expect(nos?.description).toBeTruthy()
    expect(nos?.description?.length).toBeLessThanOrEqual(300)
    expect(nosFeeds.map((feed) => [feed.url, feed.filter])).toEqual([['https://feeds.nos.nl/nosvoetbal', 'club']])
  })

  it('puts the Algemeen Dagblad in the register with its football feed on the club filter and the strictest policy', async () => {
    await seedSources(database.db)

    const [ad] = await database.db.select().from(sources).where(eq(sources.domain, 'www.ad.nl'))
    const adFeeds = await database.db
      .select()
      .from(feeds)
      .where(eq(feeds.sourceId, ad?.id ?? 0))

    expect(ad).toMatchObject({
      allowEmbed: false,
      allowImage: false,
      enabled: true,
      introMaxLength: 0,
      kind: 'news',
      name: 'Algemeen Dagblad',
    })
    expect(ad?.consentStatus).not.toBe('given')
    expect(ad?.description).toBeTruthy()
    expect(ad?.description?.length).toBeLessThanOrEqual(300)
    expect(adFeeds.map((feed) => [feed.url, feed.filter])).toEqual([['https://www.ad.nl/voetbal/rss.xml', 'club']])
  })

  it('puts De Gelderlander in the register with its sport feed on the club filter and the strictest policy', async () => {
    await seedSources(database.db)

    const [gelderlander] = await database.db.select().from(sources).where(eq(sources.domain, 'www.gelderlander.nl'))
    const gelderlanderFeeds = await database.db
      .select()
      .from(feeds)
      .where(eq(feeds.sourceId, gelderlander?.id ?? 0))

    expect(gelderlander).toMatchObject({
      allowEmbed: false,
      allowImage: false,
      enabled: true,
      introMaxLength: 0,
      kind: 'news',
      name: 'De Gelderlander',
      slug: 'de-gelderlander',
    })
    expect(gelderlander?.consentStatus).not.toBe('given')
    expect(gelderlander?.description).toBeTruthy()
    expect(gelderlander?.description?.length).toBeLessThanOrEqual(300)
    expect(gelderlanderFeeds.map((feed) => [feed.url, feed.filter])).toEqual([
      ['https://www.gelderlander.nl/sport/rss.xml', 'club'],
    ])
  })

  it('puts ESPN in the register with its football feed on the club filter and the strictest policy', async () => {
    await seedSources(database.db)

    const [espn] = await database.db.select().from(sources).where(eq(sources.domain, 'www.espn.nl'))
    const espnFeeds = await database.db
      .select()
      .from(feeds)
      .where(eq(feeds.sourceId, espn?.id ?? 0))

    expect(espn).toMatchObject({
      allowEmbed: false,
      allowImage: false,
      enabled: true,
      introMaxLength: 0,
      kind: 'news',
      name: 'ESPN',
    })
    expect(espn?.consentStatus).not.toBe('given')
    expect(espn?.description).toBeTruthy()
    expect(espn?.description?.length).toBeLessThanOrEqual(300)
    expect(espnFeeds.map((feed) => [feed.url, feed.filter])).toEqual([
      ['https://www.espn.nl/espn/rss/soccer/news', 'club'],
    ])
  })

  it('puts the Leeuwarder Courant in the register with its feed and the strictest policy', async () => {
    await seedSources(database.db)

    const [courant] = await database.db.select().from(sources).where(eq(sources.domain, 'www.lc.nl'))
    const courantFeeds = await database.db
      .select()
      .from(feeds)
      .where(eq(feeds.sourceId, courant?.id ?? 0))

    expect(courant).toMatchObject({
      allowEmbed: false,
      allowImage: false,
      enabled: true,
      introMaxLength: 0,
      kind: 'news',
      name: 'Leeuwarder Courant',
    })
    expect(courant?.consentStatus).not.toBe('given')
    expect(courant?.description).toBeTruthy()
    expect(courant?.description?.length).toBeLessThanOrEqual(300)
    expect(courantFeeds.map((feed) => feed.url)).toEqual(['https://www.lc.nl/sport/sc-heerenveen/rss/'])
  })

  it('puts Voetbal International in the register with its feed and the strictest policy', async () => {
    await seedSources(database.db)

    const [vi] = await database.db.select().from(sources).where(eq(sources.domain, 'www.vi.nl'))
    const viFeeds = await database.db
      .select()
      .from(feeds)
      .where(eq(feeds.sourceId, vi?.id ?? 0))

    expect(vi).toMatchObject({
      allowEmbed: false,
      allowImage: false,
      enabled: true,
      introMaxLength: 0,
      kind: 'news',
      name: 'Voetbal International',
    })
    expect(vi?.consentStatus).not.toBe('given')
    expect(vi?.description).toBeTruthy()
    expect(vi?.description?.length).toBeLessThanOrEqual(300)
    expect(viFeeds.map((feed) => feed.url)).toEqual(['https://www.vi.nl/feed/news.xml?tag=sc-heerenveen'])
  })

  it('puts De Telegraaf in the register with its feed and the strictest policy', async () => {
    await seedSources(database.db)

    const [telegraaf] = await database.db.select().from(sources).where(eq(sources.domain, 'www.telegraaf.nl'))
    const telegraafFeeds = await database.db
      .select()
      .from(feeds)
      .where(eq(feeds.sourceId, telegraaf?.id ?? 0))

    expect(telegraaf).toMatchObject({
      allowEmbed: false,
      allowImage: false,
      enabled: true,
      introMaxLength: 0,
      kind: 'news',
      name: 'De Telegraaf',
    })
    expect(telegraaf?.consentStatus).not.toBe('given')
    expect(telegraaf?.description?.length).toBeLessThanOrEqual(300)
    expect(telegraafFeeds.map((feed) => feed.url)).toEqual(['https://www.telegraaf.nl/tag/sc-heerenveen/rss/'])
  })

  it('puts the forum in the register as a forum, with its API as the feed and the strictest policy', async () => {
    await seedSources(database.db)

    const [forum] = await database.db.select().from(sources).where(eq(sources.domain, 'forum.heerenveen.org'))
    const forumFeeds = await database.db
      .select()
      .from(feeds)
      .where(eq(feeds.sourceId, forum?.id ?? 0))

    expect(forum).toMatchObject({
      allowEmbed: false,
      allowImage: false,
      enabled: true,
      introMaxLength: 0,
      kind: 'forum',
      name: 'sc Heerenveen Forum',
    })
    expect(forum?.consentStatus).not.toBe('given')
    expect(forum?.description).toBeTruthy()
    expect(forum?.description?.length).toBeLessThanOrEqual(300)
    expect(forumFeeds.map((feed) => feed.url)).toEqual([
      'https://forum.heerenveen.org/api/discussions?sort=-lastPostedAt&page[limit]=30&include=lastPostedUser,tags',
    ])
  })

  it.each([
    {
      apple: 'https://podcasts.apple.com/nl/podcast/omroep-abe/id1589027848',
      description:
        'Omroep Abe is de podcast over SC Heerenveen van de Leeuwarder Courant. Clubwatcher Sander de Vries bespreekt met oud-spelers Gerald Sibon, Geert Arend Roorda en Henrico Drost wekelijks de actualiteiten en achtergronden bij de club.',
      domain: 'omny.fm',
      feed: 'https://www.omnycontent.com/d/playlist/fdd7ab40-270d-4a1e-a257-acd200da1324/6470c909-db21-4ceb-a53d-b2940145c1ee/06a49ae8-2226-44c4-bbf0-b2940145c83c/podcast.rss',
      name: 'Omroep Abe',
      slug: 'omroep-abe',
      spotify: 'https://open.spotify.com/show/6agzU3xVFCZIHm4hrvnoHD',
    },
    {
      apple: 'https://podcasts.apple.com/nl/podcast/radio-camataru/id1436580634',
      description: 'Wekelijkse supporterspodcast over sc Heerenveen!',
      domain: 'radiocamataru.podbean.com',
      feed: 'https://feed.podbean.com/radiocamataru/feed.xml',
      name: 'Radio Camataru',
      slug: 'radio-camataru',
      spotify: 'https://open.spotify.com/show/51W3UP2B4H2kBK9Ukyv8et',
    },
  ])(
    'puts $name in the register as a podcast, with its feed and the strictest policy',
    async ({ apple, description, domain, feed, name, slug, spotify }) => {
      await seedSources(database.db)

      const [podcast] = await database.db.select().from(sources).where(eq(sources.domain, domain))
      const podcastFeeds = await database.db
        .select()
        .from(feeds)
        .where(eq(feeds.sourceId, podcast?.id ?? 0))

      expect(podcast).toMatchObject({
        allowEmbed: false,
        allowImage: false,
        applePodcastsUrl: apple,
        enabled: true,
        introMaxLength: 0,
        kind: 'podcast',
        name,
        slug,
        spotifyUrl: spotify,
      })
      expect(podcast?.consentStatus).not.toBe('given')
      // The text of the maker from the channel of the feed, as it is written but without the
      // HTML.
      expect(podcast?.description).toBe(description)
      expect(podcast?.description?.length).toBeLessThanOrEqual(300)
      expect(podcast?.description).not.toMatch(/[<>]/u)
      expect(podcastFeeds.map((row) => row.url)).toEqual([feed])
    },
  )

  it('gives every podcast a slug of its own, in capitals-free words with hyphens, and https addresses', () => {
    const podcasts = [...testSources, ...realSources].filter((source) => source.kind === 'podcast')
    const slugs = podcasts.map((source) => source.slug)

    expect(podcasts.length).toBeGreaterThanOrEqual(4)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const podcast of podcasts) {
      expect(podcast.slug, podcast.name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
      for (const address of [podcast.applePodcastsUrl, podcast.spotifyUrl]) {
        expect(address ?? 'https://', podcast.name).toMatch(/^https:\/\//u)
      }
    }
  })

  it('gives every source that can have headlines a slug of its own, and the forum none', () => {
    const all = [...testSources, ...realSources]
    const withHeadlines = all.filter((source) => source.kind !== 'forum')
    const slugs = withHeadlines.map((source) => source.slug)

    expect(withHeadlines.length).toBeGreaterThanOrEqual(10)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const source of withHeadlines) {
      expect(source.slug, source.name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
    }
    for (const forum of all.filter((source) => source.kind === 'forum')) {
      expect('slug' in forum, forum.name).toBe(false)
    }
  })

  it('gives a real source that is in the register without a slug its slug, and keeps what the admin changed', async () => {
    await database.db.insert(sources).values({
      domain: 'www.lc.nl',
      enabled: false,
      kind: 'news',
      name: 'Leeuwarder Courant (oud)',
    })

    await seedRealSources(database.db)

    const [courant] = await database.db.select().from(sources).where(eq(sources.domain, 'www.lc.nl'))

    expect(courant).toMatchObject({ enabled: false, name: 'Leeuwarder Courant', slug: 'leeuwarder-courant' })
  })

  it('holds made-up test sources only, and real sources that are not made up', () => {
    for (const source of testSources) {
      expect(source.domain, source.name).toMatch(/\.test$/)
    }
    for (const source of realSources) {
      expect(source.domain, source.name).not.toMatch(/\.test$/)
    }
  })

  it('gives every real source a description, a domain of its own and https feeds', () => {
    const domains = realSources.map((source) => source.domain)

    expect(new Set(domains).size).toBe(domains.length)
    for (const source of realSources) {
      expect(source.description, source.name).toBeTruthy()
      expect(source.description.length, source.name).toBeLessThanOrEqual(300)
      expect(source.feeds, source.name).not.toHaveLength(0)
      for (const feed of source.feeds) {
        expect(typeof feed === 'string' ? feed : feed.url, source.name).toMatch(/^https:\/\//)
      }
    }
  })

  it('covers every kind, every permission, and a source that is switched off', () => {
    expect(new Set(testSources.map((source) => source.kind))).toEqual(new Set(sourceKinds))
    expect(new Set(testSources.map((source) => source.consentStatus ?? 'none'))).toEqual(new Set(consentStatuses))
    expect(testSources.some((source) => source.enabled === false)).toBe(true)
  })

  it('has sources with different policies', () => {
    expect(testSources.some((source) => (source.introMaxLength ?? 0) > 0)).toBe(true)
    expect(testSources.some((source) => source.allowImage === true)).toBe(true)
    expect(testSources.some((source) => source.allowEmbed === true)).toBe(true)
    expect(testSources.some((source) => source.attribution !== undefined)).toBe(true)
  })

  it('has sources with a description and a source without one', () => {
    expect(testSources.some((source) => source.description !== undefined)).toBe(true)
    expect(testSources.some((source) => source.enabled !== false && source.description === undefined)).toBe(true)
  })

  it('runs from the command line when SITE_ENV is local', async () => {
    const { stdout } = await runSeedScript('local')

    expect(stdout).toContain(`${testSources.length} test sources`)
    expect(await database.db.select().from(sources)).toHaveLength(testSources.length + realSources.length)
  })

  it('refuses to run from the command line when SITE_ENV is production, and writes nothing', async () => {
    await expect(runSeedScript('production')).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('SITE_ENV=production'),
    })
    expect(await database.db.select().from(sources)).toHaveLength(0)
    expect(await database.db.select().from(feeds)).toHaveLength(0)
  })
})

describe('the real sources', () => {
  beforeEach(async () => {
    await database.pool.query('DELETE FROM sources')
  })

  it('puts only the real sources in the register, with their feeds, and makes no duplicates', async () => {
    await seedRealSources(database.db)
    await seedRealSources(database.db)

    const rows = await database.db.select({ domain: sources.domain }).from(sources)

    expect(rows.map((row) => row.domain).sort()).toEqual(realSources.map((source) => source.domain).sort())
    expect(await database.db.select().from(feeds)).toHaveLength(
      realSources.reduce((count, source) => count + source.feeds.length, 0),
    )
  })

  it('updates a source by its domain, but not the fields the admin changes', async () => {
    await seedRealSources(database.db)
    await database.pool.query(
      `UPDATE sources SET name = 'Oude naam', description = 'Oude tekst', enabled = false,
         consent_status = 'given', consent_date = '2026-10-01', consent_note = 'Per mail',
         attribution = 'Met dank aan de redactie', allow_image = true, intro_max_length = 150
       WHERE domain = 'www.lc.nl'`,
    )
    await seedRealSources(database.db)

    const [row] = await database.db.select().from(sources).where(eq(sources.domain, 'www.lc.nl'))

    expect(row).toMatchObject({
      allowImage: true,
      attribution: 'Met dank aan de redactie',
      consentDate: '2026-10-01',
      consentNote: 'Per mail',
      consentStatus: 'given',
      enabled: false,
      introMaxLength: 150,
      name: 'Leeuwarder Courant',
    })
    expect(row?.description).toBe(realSources[0]?.description)
  })
})

describe('removing the test sources', () => {
  beforeEach(async () => {
    await database.pool.query('DELETE FROM sources')
  })

  async function addItemTo(domain: string) {
    const [source] = await database.db.select().from(sources).where(eq(sources.domain, domain))
    const [feed] = await database.db
      .insert(feeds)
      .values({ sourceId: source?.id ?? 0, url: `https://${domain}/eigen-feed/` })
      .$returningId()

    await database.db.insert(items).values({
      feedId: feed?.id ?? 0,
      key: 'eigen-bericht',
      publishedAt: new Date(),
      sourceId: source?.id ?? 0,
      title: 'Een bericht',
      url: `https://${domain}/bericht`,
    })
  }

  it('removes the test sources with their feeds and items, and leaves a real source with its own feed and items', async () => {
    await seedSources(database.db)
    await addItemTo('testkrant.test')
    await addItemTo('www.lc.nl')

    expect(await removeTestSources(database.db)).toBe(testSources.length)

    const rows = await database.db.select({ domain: sources.domain }).from(sources)
    const remaining = await database.db.select({ title: items.title, url: items.url }).from(items)
    const feedUrls = (await database.db.select({ url: feeds.url }).from(feeds)).map((feed) => feed.url)

    expect(rows.map((row) => row.domain).sort()).toEqual(realSources.map((source) => source.domain).sort())
    expect(remaining).toEqual([{ title: 'Een bericht', url: 'https://www.lc.nl/bericht' }])
    expect(feedUrls).toContain('https://www.lc.nl/eigen-feed/')
    expect(feedUrls.some((url) => url.includes('.test/'))).toBe(false)
  })

  it('changes nothing the second time', async () => {
    await seedSources(database.db)
    await removeTestSources(database.db)

    expect(await removeTestSources(database.db)).toBe(0)
    expect(await database.db.select().from(sources)).toHaveLength(realSources.length)
  })

  it('leaves a source alone that is not in the list, even when its domain ends in .test', async () => {
    await seedRealSources(database.db)
    await database.db.insert(sources).values({ domain: 'andere.test', kind: 'news', name: 'Andere bron' })

    expect(await removeTestSources(database.db)).toBe(0)
    expect(await database.db.select().from(sources)).toHaveLength(realSources.length + 1)
  })
})

describe('the made-up matches', () => {
  const now = new Date('2026-10-25T12:00:00Z')

  beforeEach(async () => {
    await database.pool.query('DELETE FROM matches')
    await database.pool.query('DELETE FROM standings')
  })

  it('puts matches and a table in the current season, once', async () => {
    expect(await seedMatches(database.db, now)).toBe(true)
    expect(await seedMatches(database.db, now)).toBe(false)

    const rows = await database.db.select().from(matches)

    expect(rows).toHaveLength(madeUpMatches(now).length)
    expect(rows.every((match) => match.season === '2026/27')).toBe(true)
    expect(await database.db.select().from(standings)).toHaveLength(6)
  })

  it('has every case a page must show', async () => {
    await seedMatches(database.db, now)

    const rows = await database.db.select().from(matches)
    const has = (test: (match: (typeof rows)[number]) => boolean) => rows.some(test)

    expect(has((match) => match.status === 'played' && match.home)).toBe(true)
    expect(has((match) => match.status === 'played' && !match.home)).toBe(true)
    expect(has((match) => match.status === 'scheduled' && match.kickoffAt !== null)).toBe(true)
    expect(has((match) => match.status === 'scheduled' && match.kickoffAt === null && match.dateText !== null)).toBe(
      true,
    )
    expect(has((match) => match.status === 'postponed')).toBe(true)
    expect(has((match) => match.competition === 'KNVB Beker')).toBe(true)
    // The cup ties with extra time: a win, a win on penalties and a loss on penalties.
    expect(
      has((match) => match.extraTime && match.penaltiesFor === null && match.goalsFor! > match.goalsAgainst!),
    ).toBe(true)
    expect(has((match) => match.penaltiesFor !== null && match.penaltiesFor > match.penaltiesAgainst!)).toBe(true)
    expect(has((match) => match.penaltiesFor !== null && match.penaltiesFor < match.penaltiesAgainst!)).toBe(true)
    // The score after 90 minutes: known and below the result, equal to it, and missing.
    expect(
      has((match) => match.extraTime && match.afterNinetyFor !== null && match.afterNinetyFor < match.goalsFor!),
    ).toBe(true)
    expect(has((match) => match.extraTime && match.afterNinetyFor === match.goalsFor)).toBe(true)
    expect(has((match) => match.extraTime && match.afterNinetyFor === null)).toBe(true)
    // One played match was stopped and finished the next day, and has a note; no other has one.
    expect(rows.filter((match) => match.note !== null).map((match) => [match.round, match.home])).toEqual([
      ['Speelronde 2', false],
    ])
    expect(rows.find((match) => match.note !== null)?.note).toBe(
      'Gestaakt in minuut 82. Het restant is op 19 oktober gespeeld in het Stadion Proeflaan.',
    )
    // The dates of the made-up matches count from the day of the seed: this one is 10 days on.
    expect(rows.find((match) => match.dateText !== null)?.dateText).toBe('4-6 november 2026')
  })

  it('gives every played match scorers that add up to its result, in the order of the clock', async () => {
    await seedMatches(database.db, now)

    const rows = await database.db.select().from(matches)
    const goals = await database.db.select().from(matchGoals).orderBy(matchGoals.id)

    for (const match of rows) {
      const own = goals.filter((goal) => goal.matchId === match.id)

      expect(own.filter((goal) => goal.ours)).toHaveLength(match.goalsFor ?? 0)
      expect(own.filter((goal) => !goal.ours)).toHaveLength(match.goalsAgainst ?? 0)

      const clock = own.map((goal) => goal.minute * 100 + (goal.stoppageMinutes ?? 0))

      expect(clock).toEqual([...clock].sort((a, b) => a - b))
    }
    // The cases a page must show: both clubs, a penalty, an own goal, added time, a player with
    // two goals, extra time and a long name.
    expect(goals.some((goal) => !goal.ours)).toBe(true)
    expect(goals.some((goal) => goal.penalty)).toBe(true)
    expect(goals.some((goal) => goal.ownGoal)).toBe(true)
    expect(goals.some((goal) => goal.stoppageMinutes !== null)).toBe(true)
    expect(goals.some((goal) => goal.minute > 90)).toBe(true)
    expect(goals.some((goal) => goal.player.length > 25)).toBe(true)
    expect(goals.filter((goal) => goal.player === 'Proefman' && goal.matchId === goals[0]?.matchId).length).toBe(2)
  })

  it('gives at least twelve players a goal for sc Heerenveen, with levels, for a long list of top scorers', async () => {
    await seedMatches(database.db, now)

    const goals = await database.db.select().from(matchGoals)
    const perPlayer = new Map<string, number>()

    for (const goal of goals.filter((item) => item.ours && !item.ownGoal)) {
      // Two players can have the same surname: the page is what tells them apart.
      const key = goal.wikipediaPage ?? goal.player

      perPlayer.set(key, (perPlayer.get(key) ?? 0) + 1)
    }

    const counts = [...perPlayer.values()]

    expect(counts.length).toBeGreaterThanOrEqual(12)
    expect(new Set(counts).size).toBeLessThan(counts.length)
    expect(counts.filter((count) => count === Math.max(...counts))).toHaveLength(1)
    expect(counts.filter((count) => count === 2).length).toBeGreaterThanOrEqual(2)
  })

  describe('the links between the made-up goals and the made-up players', () => {
    const linked = async () =>
      (
        await database.db
          .select({ goal: matchGoals, inSquad: players.inSquad, name: players.name })
          .from(matchGoals)
          .leftJoin(players, eq(matchGoals.playerId, players.id))
          .orderBy(asc(matchGoals.id))
      ).map(({ goal, inSquad, name }) => ({
        inSquad,
        name,
        ours: goal.ours,
        ownGoal: goal.ownGoal,
        page: goal.wikipediaPage,
        player: goal.player,
      }))

    const bothSeeds = async (first: 'matches' | 'squad') => {
      await database.pool.query('DELETE FROM players')
      await database.pool.query('DELETE FROM matches')
      await database.pool.query('DELETE FROM standings')
      await database.pool.query('DELETE FROM wikipedia_pages')

      if (first === 'matches') {
        await seedMatches(database.db, now)
        await seedSquad(database.db, now)
      } else {
        await seedSquad(database.db, now)
        await seedMatches(database.db, now)
      }
    }

    it.each(['matches', 'squad'] as const)(
      'links every goal of a player of ours when the %s are seeded first',
      async (first) => {
        await bothSeeds(first)

        const goals = await linked()
        const ofOurPlayers = goals.filter((goal) => goal.ours !== goal.ownGoal)

        expect(ofOurPlayers.length).toBeGreaterThanOrEqual(12)
        expect(ofOurPlayers.every((goal) => goal.name === goal.page)).toBe(true)
        // The opponent's goals and the own goal of an opponent have no page and no player.
        expect(
          goals.filter((goal) => goal.ours === goal.ownGoal).every((goal) => goal.name === null && goal.page === null),
        ).toBe(true)
      },
    )

    it('has a goal of a player who has left the squad, who is no longer in the squad', async () => {
      await bothSeeds('matches')

      const left = (await linked()).filter((goal) => goal.inSquad === false)

      expect(left).toEqual([
        {
          inSquad: false,
          name: 'Sander Monster',
          ours: true,
          ownGoal: false,
          page: 'Sander Monster',
          player: 'Monster',
        },
      ])
      expect(madeUpSquad(now).filter((player) => player.inSquad === false)).toMatchObject([
        { leftSquadAt: new Date('2026-10-22T12:00:00Z'), name: 'Sander Monster' },
      ])
    })

    it('has two players with the same surname, whose goals are told apart by the page', async () => {
      await bothSeeds('matches')

      const testvoort = (await linked()).filter((goal) => goal.player === 'Testvoort')

      expect(testvoort.map((goal) => goal.name)).toEqual(['Joris Testvoort', 'Bas Testvoort'])
    })

    it('keeps every player of the squad with a page of his own, and the surname twice in it', () => {
      const squad = madeUpSquad(now)

      expect(new Set(squad.map((player) => player.wikipediaPage)).size).toBe(squad.length)
      expect(squad.every((player) => player.wikipediaPage === player.name)).toBe(true)
      expect(squad.filter((player) => player.searchTerm === 'Testvoort')).toHaveLength(2)
    })
  })

  it('puts the pages the made-up matches credit in too, and moves on when they are already there', async () => {
    await database.pool.query('DELETE FROM wikipedia_pages')
    await database.db.insert(wikipediaPages).values({
      kind: 'cup',
      readAt: new Date('2026-10-01T12:00:00Z'),
      season: '2026/27',
      title: 'KNVB Beker 2026/27 (mannen)',
      version: null,
    })
    await seedMatches(database.db, now)

    const pages = await database.db.select().from(wikipediaPages)

    expect(pages.map((page) => page.title).sort()).toEqual([
      'Eredivisie 2026/27 (mannenvoetbal)',
      'Eredivisie 2026/27 (mannenvoetbal)/Wedstrijden',
      'KNVB Beker 2026/27 (mannen)',
      'Play-offs Nederlands voetbal 2027',
    ])
    expect(pages.every((page) => page.readAt.getTime() === now.getTime())).toBe(true)
  })

  it('has a table that agrees with its own results', async () => {
    await seedMatches(database.db, now)

    const table = await database.db.select().from(standings)
    const played = (await database.db.select().from(matches)).filter(
      (match) => match.competition === 'Eredivisie' && match.status === 'played',
    )
    const ours = table.find((row) => row.club === 'sc Heerenveen')

    expect(ours).toMatchObject({
      goalsAgainst: played.reduce((total, match) => total + (match.goalsAgainst ?? 0), 0),
      goalsFor: played.reduce((total, match) => total + (match.goalsFor ?? 0), 0),
      played: played.length,
    })
    expect(table.reduce((total, row) => total + row.goalsFor, 0)).toBe(
      table.reduce((total, row) => total + row.goalsAgainst, 0),
    )
    expect(table.reduce((total, row) => total + row.won, 0)).toBe(table.reduce((total, row) => total + row.lost, 0))
    expect(table.every((row) => row.points === 3 * row.won + row.drawn)).toBe(true)
    expect(new Set(table.map((row) => row.validOn))).toEqual(new Set(['2026-10-18']))
  })

  it('leaves the matches of the season alone when it already has some, such as the real ones', async () => {
    await seedMatches(database.db, now)
    await database.pool.query("UPDATE matches SET opponent = 'FC Echt' WHERE round = 'Speelronde 1'")

    expect(await seedMatches(database.db, now)).toBe(false)
    expect((await database.db.select().from(matches)).find((match) => match.round === 'Speelronde 1')?.opponent).toBe(
      'FC Echt',
    )
  })

  it('puts them in a new season too, and leaves the rows of the earlier season as they are', async () => {
    await seedMatches(database.db, now)

    const before = await database.db.select().from(matches)

    expect(await seedMatches(database.db, new Date('2027-08-01T12:00:00Z'))).toBe(true)

    const rows = await database.db.select().from(matches)

    expect(rows.filter((match) => match.season === seasonOf(now))).toEqual(before)
    expect(rows.filter((match) => match.season === '2027/28')).toHaveLength(before.length)
  })
})

describe('the made-up squad', () => {
  const now = new Date('2026-10-25T12:00:00Z')

  beforeEach(async () => {
    await database.pool.query('DELETE FROM players')
    await database.pool.query('DELETE FROM wikipedia_pages')
  })

  it('puts the squad in the current season, once, with the page it credits', async () => {
    expect(await seedSquad(database.db, now)).toBe(true)
    expect(await seedSquad(database.db, now)).toBe(false)

    const rows = await database.db.select().from(players)

    expect(rows).toHaveLength(madeUpSquad(now).length)
    expect(rows.every((player) => player.season === '2026/27')).toBe(true)
    expect((await database.db.select().from(wikipediaPages)).map((page) => [page.kind, page.title])).toEqual([
      ['squad', 'Sc Heerenveen in het seizoen 2026/27 (mannen)'],
    ])
  })

  it('leaves a squad that is there alone', async () => {
    await database.db
      .insert(players)
      .values({ name: 'Echte Speler', position: 'doelman', searchTerm: 'Speler', season: '2026/27', shirtNumber: 1 })

    expect(await seedSquad(database.db, now)).toBe(false)
    expect(await database.db.select().from(players)).toHaveLength(1)
  })

  it('has every case a page must show and passes the checks of the importer', () => {
    const squad = madeUpSquad(now)

    expect(squad.length).toBeGreaterThanOrEqual(18)
    expect(squad.length).toBeLessThanOrEqual(45)
    for (const position of playerPositions) {
      expect(squad.filter((player) => player.position === position).length).toBeGreaterThanOrEqual(
        position === 'doelman' ? 2 : 1,
      )
    }
    expect(squad.some((player) => player.shirtNumber === null)).toBe(true)
    expect(squad.some((player) => !player.name.includes(' '))).toBe(true)
    expect(new Set(squad.map((player) => player.name)).size).toBe(squad.length)
  })
})
