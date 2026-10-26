import { eq } from 'drizzle-orm'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import {
  consentStatuses,
  feeds,
  matches,
  matchGoals,
  sourceKinds,
  sources,
  standings,
  wikipediaPages,
} from './schema.ts'
import { seasonOf } from './season.ts'
import { madeUpMatches, realSources, seedMatches, seedSources, testSources } from './seed.ts'
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
