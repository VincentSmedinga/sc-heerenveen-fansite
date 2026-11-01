import type { FeedFilter, SourceKind } from '@fansite/db/schema'
import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { listRecentItems } from '@fansite/db/queries'
import { adminUsers, feeds, importResults, items, matches, sources } from '@fansite/db/schema'
import { seedSources } from '@fansite/db/seed'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { MatchDay } from './relevance.ts'
import type { Handler, TestServer } from './test-server.ts'

import { formatReport, importFeed, importFeeds, listFeedsToImport } from './import-feeds.ts'
import { startRun } from './run-log.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

const firstRun = new Date('2026-10-22T10:00:00Z')
const secondRun = new Date('2026-10-22T11:00:00Z')

const recording = readFileSync(new URL('./fixtures/lc-sc-heerenveen.xml', import.meta.url), 'utf8')

const xml = { 'Content-Type': 'text/xml; charset=utf-8' }

let database: TestDatabase
const servers: TestServer[] = []

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM sources')
  // After the sources: an item that is hidden refers to the account of the moderator.
  await database.pool.query('DELETE FROM admin_users')
  await database.pool.query('DELETE FROM matches')
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

/** Puts a source with a feed in the register and gives the feed as the importer reads it. */
async function addFeed(
  url: string,
  { domain = 'krant.test', enabled = true, filter = 'none' as FeedFilter, kind = 'news' as SourceKind } = {},
) {
  const [source] = await database.db.insert(sources).values({ domain, enabled, kind, name: domain }).$returningId()
  const [feed] = await database.db
    .insert(feeds)
    .values({ filter, sourceId: source?.id ?? 0, url })
    .$returningId()

  return storedFeed(feed?.id ?? 0)
}

/** An item of that feed. */
function entry(
  key: string,
  {
    link = `https://krant.test/${key}`,
    premium = 'false',
    pubDate = 'Tue, 20 Oct 2026 11:58:00 GMT',
    title = `Kop ${key}`,
  } = {},
) {
  return `<item><title>${title}</title><link>${link}</link><guid isPermaLink="false">${key}</guid><pubDate>${pubDate}</pubDate><premium>${premium}</premium></item>`
}

/** A feed with these items, as the Leeuwarder Courant writes one. */
function feedWith(...entries: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Een feed</title>${entries.join('')}</channel></rss>`
}

/**
 * Starts a web server on this computer that serves the feed at `/rss/`. The tests ask no real
 * site.
 */
async function serve(body: Handler | string, routes: Record<string, Handler> = {}) {
  const handler = typeof body === 'string' ? reply(200, body, xml) : body
  const server = await startServer({ '/rss/': handler, ...routes })

  servers.push(server)

  return server
}

async function storedFeed(id: number) {
  const [feed] = await database.db.select().from(feeds).where(eq(feeds.id, id))

  if (feed === undefined) {
    throw new Error(`There is no feed ${id}`)
  }

  return feed
}

const itemsInDatabase = () => database.db.select().from(items).orderBy(items.id)

/** Reads every feed as a run of the import does, at the time of the first run. */
async function importAll() {
  const runId = await startRun(database.db, firstRun)

  return importFeeds(database.db, fetcherFor(servers), { clock: () => firstRun, runId })
}

describe('importing the recording of the Leeuwarder Courant', () => {
  it('stores its 50 items with the headline, the link, the key, the time and the paywall', async () => {
    const server = await serve(recording)
    const feed = await addFeed(`${server.origin}/rss/`)

    const report = await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    expect(report).toMatchObject({ added: 50, kind: 'imported', skipped: [], unchanged: 0, updated: 0 })

    const rows = await itemsInDatabase()

    expect(rows).toHaveLength(50)
    expect(rows[0]).toMatchObject({
      feedId: feed.id,
      key: 'ece-auto-gen-e4f92d18-606d-4257-a39d-2aa94fc86481',
      paywalled: false,
      publishedAt: new Date('2026-10-20T11:58:00Z'),
      sourceId: feed.sourceId,
      title: 'Timo Zaal verkast naar Zweedse club & nieuwe aflevering van Omroep Abe',
      url: 'https://www.lc.nl/sport/sc-heerenveen/timo-zaal-verkast-naar-zweedse-club-nieuwe-aflevering-van-omroep-abe/160235181.html',
    })
    expect(rows.filter((row) => row.paywalled)).toHaveLength(8)
    expect(rows.every((row) => row.firstSeenAt.getTime() === firstRun.getTime())).toBe(true)
    expect(rows.every((row) => row.lastSeenAt.getTime() === firstRun.getTime())).toBe(true)
  })

  it('makes no duplicates when it runs twice, and only moves the time we last saw each item', async () => {
    const server = await serve(recording)
    const feed = await addFeed(`${server.origin}/rss/`)
    const fetcher = fetcherFor(servers)

    await importFeed(database.db, fetcher, feed, firstRun)
    const second = await importFeed(database.db, fetcher, feed, secondRun)

    expect(second).toMatchObject({ added: 0, kind: 'imported', skipped: [], unchanged: 50, updated: 0 })

    const rows = await itemsInDatabase()

    expect(rows).toHaveLength(50)
    expect(rows.every((row) => row.firstSeenAt.getTime() === firstRun.getTime())).toBe(true)
    expect(rows.every((row) => row.lastSeenAt.getTime() === secondRun.getTime())).toBe(true)
  })

  it('stores nothing the source did not allow, even when the feed has it', async () => {
    const server = await serve(
      feedWith(
        '<item><title>Een kop</title><link>https://krant.test/een</link><guid>g1</guid><pubDate>Tue, 20 Oct 2026 11:58:00 GMT</pubDate>' +
          '<description>GEHEIME-INTRO</description><category>GEHEIME-CATEGORIE</category>' +
          '<enclosure url="https://krant.test/GEHEIME-AFBEELDING.jpg" length="0" type="image/jpeg"/>' +
          '<dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">GEHEIME-AUTEUR</dc:creator></item>',
      ),
    )
    const feed = await addFeed(`${server.origin}/rss/`)

    await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    const [everything] = await database.pool.query('SELECT * FROM items')

    expect(JSON.stringify(everything)).toContain('Een kop')
    expect(JSON.stringify(everything)).not.toContain('GEHEIME')
  })
})

describe('importing the recording of Voetbal International', () => {
  const viRecording = readFileSync(new URL('./fixtures/vi-sc-heerenveen.xml', import.meta.url), 'utf8')

  it('stores its 24 items, with the paywall from the pro category and nothing else of the feed', async () => {
    const server = await serve(viRecording)
    const feed = await addFeed(`${server.origin}/rss/`, { domain: 'www.vi.nl' })

    const report = await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    expect(report).toMatchObject({ added: 24, kind: 'imported', skipped: [], unchanged: 0, updated: 0 })

    const rows = await itemsInDatabase()

    expect(rows).toHaveLength(24)
    expect(rows[0]).toMatchObject({
      key: 'www.vi.nl-news-2149501',
      paywalled: true,
      publishedAt: new Date('2026-10-21T13:00:00Z'),
      sourceId: feed.sourceId,
    })
    expect(rows.filter((row) => row.paywalled)).toHaveLength(5)
    expect(JSON.stringify(rows)).not.toContain('PRO')
  })

  it('makes no duplicates when it runs twice, and updates a headline that changed', async () => {
    const server = await serve(viRecording)
    const feed = await addFeed(`${server.origin}/rss/`, { domain: 'www.vi.nl' })

    await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    const changed = await serve(viRecording.replace('Drie conclusies na PSV-SC Heerenveen', 'Vier conclusies'))

    await database.db
      .update(feeds)
      .set({ url: `${changed.origin}/rss/` })
      .where(eq(feeds.id, feed.id))

    const second = await importFeed(database.db, fetcherFor(servers), await storedFeed(feed.id), secondRun)

    expect(second).toMatchObject({ added: 0, unchanged: 23, updated: 1 })
    expect(await itemsInDatabase()).toHaveLength(24)
  })

  it('keeps the premium element for another source and ignores the pro category there', async () => {
    const server = await serve(viRecording)
    const feed = await addFeed(`${server.origin}/rss/`, { domain: 'krant.test' })

    await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    expect((await itemsInDatabase()).some((row) => row.paywalled)).toBe(false)
  })
})

describe('an item that is already known', () => {
  async function importTwice(before: string, after: string) {
    const first = await serve(before)
    const feed = await addFeed(`${first.origin}/rss/`)

    await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    const second = await serve(after)

    await database.db
      .update(feeds)
      .set({ url: `${second.origin}/rss/` })
      .where(eq(feeds.id, feed.id))

    return importFeed(database.db, fetcherFor(servers), await storedFeed(feed.id), secondRun)
  }

  it('gets the new headline when the source changes it, and stays one item', async () => {
    const report = await importTwice(
      feedWith(entry('g1', { title: 'Oude kop' }), entry('g2')),
      feedWith(entry('g1', { title: 'Nieuwe kop' }), entry('g2')),
    )

    expect(report).toMatchObject({ added: 0, unchanged: 1, updated: 1 })

    const rows = await itemsInDatabase()

    expect(rows.map((row) => row.title)).toEqual(['Nieuwe kop', 'Kop g2'])
    expect(rows[0]?.firstSeenAt).toEqual(firstRun)
    expect(rows[0]?.lastSeenAt).toEqual(secondRun)
  })

  it.each([
    ['link', entry('g1', { link: 'https://krant.test/nieuw' }), { url: 'https://krant.test/nieuw' }],
    ['paywall', entry('g1', { premium: 'true' }), { paywalled: true }],
    [
      'time',
      entry('g1', { pubDate: 'Wed, 21 Oct 2026 08:00:00 GMT' }),
      { publishedAt: new Date('2026-10-21T08:00:00Z') },
    ],
  ])('gets the new %s when the source changes it', async (_, changed, expected) => {
    const report = await importTwice(feedWith(entry('g1')), feedWith(changed))

    expect(report).toMatchObject({ added: 0, unchanged: 0, updated: 1 })
    expect((await itemsInDatabase())[0]).toMatchObject(expected)
  })

  it('is added to by a new item, and stays when it is no longer in the feed', async () => {
    const report = await importTwice(feedWith(entry('g1'), entry('g2')), feedWith(entry('g3'), entry('g2')))

    expect(report).toMatchObject({ added: 1, unchanged: 1, updated: 0 })

    const rows = await itemsInDatabase()

    expect(rows.map((row) => row.key)).toEqual(['g1', 'g2', 'g3'])
    // g1 was not in the feed the second time, so we did not see it then.
    expect(rows[0]?.lastSeenAt).toEqual(firstRun)
    expect(rows[1]?.lastSeenAt).toEqual(secondRun)
  })

  it('takes the first time we saw it as the time of publication when the feed gives none, and keeps it', async () => {
    const without = entry('g1', { pubDate: 'gisteren' })
    const report = await importTwice(feedWith(without), feedWith(without))

    expect(report).toMatchObject({ added: 0, unchanged: 1, updated: 0 })
    expect((await itemsInDatabase())[0]?.publishedAt).toEqual(firstRun)
  })

  it('gets the time of the source once the source gives one', async () => {
    const report = await importTwice(feedWith(entry('g1', { pubDate: '' })), feedWith(entry('g1')))

    expect(report).toMatchObject({ unchanged: 0, updated: 1 })
    expect((await itemsInDatabase())[0]?.publishedAt).toEqual(new Date('2026-10-20T11:58:00Z'))
  })

  it('tells keys apart that differ only in case', async () => {
    await importTwice(feedWith(entry('Guid-A'), entry('guid-a')), feedWith(entry('Guid-A'), entry('guid-a')))

    expect((await itemsInDatabase()).map((row) => row.key)).toEqual(['Guid-A', 'guid-a'])
  })
})

describe('an item that a moderator hid', () => {
  const hiddenAt = new Date('2026-10-22T10:30:00Z')

  /**
   * Imports a feed, hides its item g1 the way the admin does, and imports a feed with `after`
   * in its place.
   */
  async function hideThenImport(before: string, after: string) {
    const first = await serve(before)
    const feed = await addFeed(`${first.origin}/rss/`)

    await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    const [user] = await database.db
      .insert(adminUsers)
      .values({ email: 'jelle@example.org', role: 'moderator' })
      .$returningId()

    await database.db
      .update(items)
      .set({ hiddenAt, hiddenBy: user?.id ?? 0, hiddenReason: 'Fout in het bericht' })
      .where(eq(items.key, 'g1'))

    const second = await serve(after)

    await database.db
      .update(feeds)
      .set({ url: `${second.origin}/rss/` })
      .where(eq(feeds.id, feed.id))

    return importFeed(database.db, fetcherFor(servers), await storedFeed(feed.id), secondRun)
  }

  it('stays hidden, with its reason, when the source offers it again as it was', async () => {
    const report = await hideThenImport(feedWith(entry('g1'), entry('g2')), feedWith(entry('g1'), entry('g2')))

    expect(report).toMatchObject({ added: 0, unchanged: 2, updated: 0 })

    const [hidden] = await itemsInDatabase()

    expect(hidden).toMatchObject({ hiddenAt, hiddenReason: 'Fout in het bericht', key: 'g1' })
    expect(hidden?.hiddenBy).not.toBeNull()
    expect(hidden?.lastSeenAt).toEqual(firstRun)
  })

  it('is not overwritten when the source changes its headline, link, paywall or time, and stays one item', async () => {
    const report = await hideThenImport(
      feedWith(entry('g1', { title: 'Oude kop' }), entry('g2')),
      feedWith(
        entry('g1', {
          link: 'https://krant.test/nieuw',
          premium: 'true',
          pubDate: 'Wed, 21 Oct 2026 08:00:00 GMT',
          title: 'Nieuwe kop',
        }),
        entry('g2'),
      ),
    )

    expect(report).toMatchObject({ added: 0, unchanged: 2, updated: 0 })

    const rows = await itemsInDatabase()

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      hiddenAt,
      key: 'g1',
      paywalled: false,
      publishedAt: new Date('2026-10-20T11:58:00Z'),
      title: 'Oude kop',
      url: 'https://krant.test/g1',
    })
  })

  it('does not stop the other items of the feed from being updated', async () => {
    const report = await hideThenImport(
      feedWith(entry('g1'), entry('g2')),
      feedWith(entry('g1', { title: 'Nieuwe kop' }), entry('g2', { title: 'Andere kop' }), entry('g3')),
    )

    expect(report).toMatchObject({ added: 1, unchanged: 1, updated: 1 })
    expect((await itemsInDatabase()).map((row) => [row.title, row.hiddenAt])).toEqual([
      ['Kop g1', hiddenAt],
      ['Andere kop', null],
      ['Kop g3', null],
    ])
  })

  it('is updated again once a moderator shows it', async () => {
    await hideThenImport(feedWith(entry('g1')), feedWith(entry('g1', { title: 'Nieuwe kop' })))
    await database.db.update(items).set({ hiddenAt: null, hiddenBy: null, hiddenReason: null })

    const third = await serve(feedWith(entry('g1', { title: 'Nieuwe kop' })))

    await database.db.update(feeds).set({ url: `${third.origin}/rss/` })
    await importFeed(
      database.db,
      fetcherFor(servers),
      await storedFeed((await database.db.select().from(feeds))[0]?.id ?? 0),
      secondRun,
    )

    expect((await itemsInDatabase())[0]?.title).toBe('Nieuwe kop')
  })
})

describe('the relevance filter', () => {
  const mixed = () =>
    feedWith(
      entry('club', { title: 'sc Heerenveen wint van Twente' }),
      entry('stad', { title: 'Brand in woning in Heerenveen' }),
      entry('elders', { title: 'Leeuwarden krijgt nieuw museum' }),
      entry('speler', { title: 'Veldman verlengt' }),
    )

  const relevanceByKey = async () =>
    Object.fromEntries((await itemsInDatabase()).map((row) => [row.key, row.relevance]))

  it('keeps every item of a feed with the filter club, with its relevance, and counts them', async () => {
    const server = await serve(mixed())
    const feed = await addFeed(`${server.origin}/rss/`, { filter: 'club' })

    const report = await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    expect(report).toMatchObject({
      added: 4,
      relevance: { doubtful: 2, irrelevant: 1, relevant: 1 },
      skipped: [],
    })
    expect(await relevanceByKey()).toEqual({
      club: 'relevant',
      elders: 'irrelevant',
      speler: 'doubtful',
      stad: 'doubtful',
    })
  })

  it('makes every item of a feed with the filter none relevant, whatever the headline says', async () => {
    const server = await serve(mixed())
    const feed = await addFeed(`${server.origin}/rss/`, { filter: 'none' })

    const report = await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    expect(report).toMatchObject({ added: 4, relevance: { doubtful: 0, irrelevant: 0, relevant: 4 } })
    expect((await itemsInDatabase()).every((row) => row.relevance === 'relevant')).toBe(true)
  })

  it('leaves the value alone when the item comes by again as it was', async () => {
    const server = await serve(mixed())
    const feed = await addFeed(`${server.origin}/rss/`, { filter: 'club' })

    await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    expect(await importFeed(database.db, fetcherFor(servers), feed, secondRun)).toMatchObject({
      added: 0,
      unchanged: 4,
      updated: 0,
    })
  })

  it('judges an item it already has again, so a better rule works on old items', async () => {
    const server = await serve(mixed())
    const feed = await addFeed(`${server.origin}/rss/`, { filter: 'club' })

    await importFeed(database.db, fetcherFor(servers), feed, firstRun)
    // The rules were different when these were stored.
    await database.db.update(items).set({ relevance: 'relevant' })

    const report = await importFeed(database.db, fetcherFor(servers), feed, secondRun)

    expect(report).toMatchObject({ added: 0, unchanged: 1, updated: 3 })
    expect(await relevanceByKey()).toEqual({
      club: 'relevant',
      elders: 'irrelevant',
      speler: 'doubtful',
      stad: 'doubtful',
    })
  })

  it('follows a feed that is switched to club, and back to none', async () => {
    const server = await serve(mixed())
    const feed = await addFeed(`${server.origin}/rss/`)

    await importFeed(database.db, fetcherFor(servers), feed, firstRun)
    await database.db.update(feeds).set({ filter: 'club' }).where(eq(feeds.id, feed.id))
    await importFeed(database.db, fetcherFor(servers), await storedFeed(feed.id), secondRun)

    expect((await relevanceByKey())['elders']).toBe('irrelevant')

    await database.db.update(feeds).set({ filter: 'none' }).where(eq(feeds.id, feed.id))
    await importFeed(database.db, fetcherFor(servers), await storedFeed(feed.id), secondRun)

    expect((await relevanceByKey())['elders']).toBe('relevant')
  })

  it('does not change the value of an item that a moderator hid', async () => {
    const server = await serve(mixed())
    const feed = await addFeed(`${server.origin}/rss/`, { filter: 'club' })

    await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    const [user] = await database.db
      .insert(adminUsers)
      .values({ email: 'jelle@example.org', role: 'moderator' })
      .$returningId()

    await database.db
      .update(items)
      .set({ hiddenAt: firstRun, hiddenBy: user?.id ?? 0, hiddenReason: 'Fout in het bericht', relevance: 'relevant' })
      .where(eq(items.key, 'elders'))

    const report = await importFeed(database.db, fetcherFor(servers), feed, secondRun)

    // It is not updated, but the filter's decision is counted, and the log shows it.
    expect(report).toMatchObject({ relevance: { doubtful: 2, irrelevant: 1, relevant: 1 }, updated: 0 })
    expect((await relevanceByKey())['elders']).toBe('relevant')
  })

  it('writes the counts per value in the log of the run', async () => {
    const server = await serve(mixed())

    await addFeed(`${server.origin}/rss/`, { filter: 'club' })
    await importAll()

    const [result] = await database.db.select().from(importResults)

    expect(result).toMatchObject({ doubtful: 2, irrelevant: 1, relevant: 1 })
  })
})

describe('the relevance filter and the matches of the season', () => {
  const adoHeadline = "ADO beleeft frustrerende avond: 'Ongelofelijk dat je geen punt pakt'"

  const relevanceByKey = async () =>
    Object.fromEntries((await itemsInDatabase()).map((row) => [row.key, row.relevance]))

  /** A match against the opponent, on a day in Dutch time. */
  async function addMatch(opponent: string, matchDate: string, season = '2026/27', round = 'Speelronde 1') {
    await database.db.insert(matches).values(
      await withClubs(database.db, [
        {
          competition: 'Eredivisie',
          home: true,
          kickoffAt: new Date(`${matchDate}T18:45:00Z`),
          matchDate,
          opponent,
          round,
          season,
          status: 'scheduled',
        },
      ]),
    )
  }

  const feedAbout = () =>
    feedWith(
      entry('ado', { pubDate: 'Sat, 24 Oct 2026 20:42:00 GMT', title: adoHeadline }),
      entry('ver', { pubDate: 'Sat, 24 Oct 2026 20:42:00 GMT', title: 'Provincie opent nieuwe fietsbrug' }),
      entry('oud', { pubDate: 'Tue, 1 Sep 2026 10:00:00 GMT', title: adoHeadline }),
    )

  it('makes an item about the opponent relevant in the week around the match, and only then', async () => {
    const server = await serve(feedAbout())
    const feed = await addFeed(`${server.origin}/rss/`, { filter: 'club' })

    await addMatch('ADO Den Haag', '2026-10-24')

    const report = await importFeed(database.db, fetcherFor(servers), feed, firstRun, [
      { matchDate: '2026-10-24', opponent: 'ADO Den Haag', status: 'scheduled' },
    ])

    expect(await relevanceByKey()).toEqual({ ado: 'relevant', oud: 'irrelevant', ver: 'irrelevant' })
    expect(report).toMatchObject({ relevance: { doubtful: 0, irrelevant: 2, relevant: 1 } })
  })

  it('reads the matches of the current season from the database once per run', async () => {
    const server = await serve(feedAbout())

    await addFeed(`${server.origin}/rss/`, { filter: 'club' })
    await addMatch('ADO Den Haag', '2026-10-24')
    await importAll()

    expect(await relevanceByKey()).toEqual({ ado: 'relevant', oud: 'irrelevant', ver: 'irrelevant' })
  })

  it('does not use a match of an earlier season, although the table holds it', async () => {
    const server = await serve(feedAbout())

    await addFeed(`${server.origin}/rss/`, { filter: 'club' })
    // The same week, a year earlier (the season 2025/26): it says nothing about this week.
    await addMatch('ADO Den Haag', '2026-10-24', '2025/26')
    await addMatch('ADO Den Haag', '2026-10-24', '2020/21', 'Speelronde 2')
    await importAll()

    expect(await relevanceByKey()).toEqual({ ado: 'irrelevant', oud: 'irrelevant', ver: 'irrelevant' })
  })

  it('works as before when the table of matches is empty', async () => {
    const server = await serve(feedAbout())

    await addFeed(`${server.origin}/rss/`, { filter: 'club' })
    await importAll()

    expect(await relevanceByKey()).toEqual({ ado: 'irrelevant', oud: 'irrelevant', ver: 'irrelevant' })
  })

  it('judges a known item again once the match is known, and leaves a hidden item hidden', async () => {
    const server = await serve(feedAbout())
    const feed = await addFeed(`${server.origin}/rss/`, { filter: 'club' })

    await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    expect((await relevanceByKey())['ado']).toBe('irrelevant')

    await addMatch('ADO Den Haag', '2026-10-24')

    const [user] = await database.db
      .insert(adminUsers)
      .values({ email: 'jelle@example.org', role: 'moderator' })
      .$returningId()

    await database.db
      .update(items)
      .set({ hiddenAt: firstRun, hiddenBy: user?.id ?? 0, hiddenReason: 'Fout in het bericht' })
      .where(eq(items.key, 'ver'))

    const runId = await startRun(database.db, secondRun)
    const [report] = await importFeeds(database.db, fetcherFor(servers), { clock: () => secondRun, runId })

    expect(report).toMatchObject({ added: 0, updated: 1 })
    expect((await relevanceByKey())['ado']).toBe('relevant')
    expect((await itemsInDatabase()).find((row) => row.key === 'ver')).toMatchObject({
      hiddenReason: 'Fout in het bericht',
      relevance: 'irrelevant',
    })
  })

  it('changes nothing for a feed with the filter none', async () => {
    const server = await serve(feedAbout())

    await addFeed(`${server.origin}/rss/`, { filter: 'none' })
    await addMatch('ADO Den Haag', '2026-10-24')
    await importAll()

    expect(await relevanceByKey()).toEqual({ ado: 'relevant', oud: 'relevant', ver: 'relevant' })
  })
})

describe('importing a regional feed, the way the register has it', () => {
  const sample = readFileSync(new URL('./fixtures/regional-sample.xml', import.meta.url), 'utf8')

  /** The feed of Omrop Fryslân as the seed registers it, pointed at the test server. */
  async function omropFeed(origin: string) {
    await seedSources(database.db)

    const [row] = await database.db
      .select({ id: feeds.id })
      .from(feeds)
      .innerJoin(sources, eq(feeds.sourceId, sources.id))
      .where(eq(sources.domain, 'www.omropfryslan.nl'))

    await database.db
      .update(feeds)
      .set({ url: `${origin}/rss/` })
      .where(eq(feeds.id, row?.id ?? 0))

    return storedFeed(row?.id ?? 0)
  }

  it('reads the feed, gives every item its value and counts them', async () => {
    const server = await serve(sample)
    const feed = await omropFeed(server.origin)

    expect(feed.filter).toBe('club')

    const report = await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    expect(report).toMatchObject({ added: 9, relevance: { doubtful: 2, irrelevant: 4, relevant: 3 }, skipped: [] })
    expect(Object.fromEntries((await itemsInDatabase()).map((row) => [row.title, row.relevance]))).toEqual({
      'Code geel voor Fryslân: zware windstoten verwacht': 'irrelevant',
      'Dylan Vente baalt van zijn reserverol': 'relevant',
      'Friese ijshockeyers winnen spannende wedstrijd': 'irrelevant',
      'Heerenveen wint topper van Cambuur': 'relevant',
      'Museum in Leeuwarden toont verzonnen kunst': 'irrelevant',
      'Nieuwe fietsbrug bij Dokkum geopend': 'irrelevant',
      'sc Heerenveen speelt gelijk bij Emmen': 'relevant',
      'Schuur in Heerenveen volledig verwoest door brand': 'doubtful',
      'Veldman wil nog niet praten over zijn toekomst': 'doubtful',
    })
  })

  it('keeps the time of publication in UTC, and the link, and nothing of the intro, the category or the photo', async () => {
    const server = await serve(sample)

    await importFeed(database.db, fetcherFor(servers), await omropFeed(server.origin), firstRun)

    const [first] = await database.db.select().from(items).where(eq(items.key, 'regio-1'))

    expect(first).toMatchObject({
      paywalled: false,
      publishedAt: new Date('2026-10-21T12:06:08Z'),
      url: 'https://regio.test/nijs/1',
    })
    expect(JSON.stringify(first)).not.toContain('verzonnen intro')
    expect(JSON.stringify(first)).not.toContain('foto')
  })

  it('shows only the relevant items to a visitor, however new the others are', async () => {
    const server = await serve(sample)

    await importFeed(database.db, fetcherFor(servers), await omropFeed(server.origin), firstRun)

    const shown = await listRecentItems(database.db, { limit: 20, until: new Date('2026-10-23T00:00:00Z') })

    expect(shown.map((item) => item.title)).toEqual([
      'sc Heerenveen speelt gelijk bij Emmen',
      'Heerenveen wint topper van Cambuur',
      'Dylan Vente baalt van zijn reserverol',
    ])
    expect(shown.every((item) => item.sourceName === 'Omrop Fryslân')).toBe(true)
  })
})

describe('importing the football feed of NOS, the way the register has it', () => {
  const sample = readFileSync(new URL('./fixtures/nos-sample.xml', import.meta.url), 'utf8')
  const nosRun = new Date('2026-10-26T12:00:00Z')

  /** The football feed of NOS as the seed registers it, pointed at the test server. */
  async function nosFeed(origin: string) {
    await seedSources(database.db)

    const [row] = await database.db
      .select({ id: feeds.id })
      .from(feeds)
      .innerJoin(sources, eq(feeds.sourceId, sources.id))
      .where(eq(sources.domain, 'nos.nl'))

    await database.db
      .update(feeds)
      .set({ url: `${origin}/rss/` })
      .where(eq(feeds.id, row?.id ?? 0))

    return storedFeed(row?.id ?? 0)
  }

  it('reads the feed, gives every item its value and counts them', async () => {
    const server = await serve(sample)
    const feed = await nosFeed(server.origin)

    expect(feed.filter).toBe('club')

    const report = await importFeed(database.db, fetcherFor(servers), feed, nosRun)

    expect(report).toMatchObject({ added: 8, relevance: { doubtful: 2, irrelevant: 4, relevant: 2 }, skipped: [] })
    expect(Object.fromEntries((await itemsInDatabase()).map((row) => [row.title, row.relevance]))).toEqual({
      'Ajax wint thuis van Fortuna Sittard': 'irrelevant',
      'Brand in een schuur in Heerenveen is onder controle': 'doubtful',
      'De speelronde in het kort: Twente wint en Utrecht verliest': 'irrelevant',
      'Heerenveen wint van Volendam na een late treffer': 'relevant',
      'Liverpool verliest bij een promovendus': 'irrelevant',
      'sc Heerenveen speelt gelijk tegen Excelsior': 'relevant',
      'Spanning bij de top: PSV en Feyenoord spelen gelijk': 'irrelevant',
      'Veldman denkt na over zijn toekomst': 'doubtful',
    })
  })

  it('keeps the time of publication in UTC, across the end of summer time, and the link', async () => {
    const server = await serve(sample)

    await importFeed(database.db, fetcherFor(servers), await nosFeed(server.origin), nosRun)

    const rows = await database.db.select().from(items)
    const byLink = Object.fromEntries(rows.map((row) => [row.url, row.publishedAt]))

    expect(byLink['https://nos.test/l/1000001']).toEqual(new Date('2026-10-24T20:53:01Z'))
    expect(byLink['https://nos.test/l/1000003']).toEqual(new Date('2026-10-25T07:01:31Z'))
    expect(rows.every((row) => !row.paywalled)).toBe(true)
  })

  it('keeps nothing of the description or the image', async () => {
    const server = await serve(sample)

    await importFeed(database.db, fetcherFor(servers), await nosFeed(server.origin), nosRun)

    const stored = JSON.stringify(await database.db.select().from(items))

    expect(stored).not.toContain('verzonnen intro')
    expect(stored).not.toContain('alinea')
    expect(stored).not.toContain('samenvatting')
    expect(stored).not.toContain('images.nos.test')
    expect(stored).not.toContain('.webp')
  })

  it('shows only the relevant items to a visitor, however new the others are', async () => {
    const server = await serve(sample)

    await importFeed(database.db, fetcherFor(servers), await nosFeed(server.origin), nosRun)

    const shown = await listRecentItems(database.db, { limit: 20, until: new Date('2026-10-27T00:00:00Z') })

    expect(shown.map((item) => item.title)).toEqual([
      'sc Heerenveen speelt gelijk tegen Excelsior',
      'Heerenveen wint van Volendam na een late treffer',
    ])
    expect(shown.every((item) => item.sourceName === 'NOS')).toBe(true)
  })
})

describe('importing the football feed of the Algemeen Dagblad, the way the register has it', () => {
  const sample = readFileSync(new URL('./fixtures/ad-sample.xml', import.meta.url), 'utf8')
  const adRun = new Date('2026-10-26T12:00:00Z')

  /** The football feed of the AD as the seed registers it, pointed at the test server. */
  async function adFeed(origin: string) {
    await seedSources(database.db)

    const [row] = await database.db
      .select({ id: feeds.id })
      .from(feeds)
      .innerJoin(sources, eq(feeds.sourceId, sources.id))
      .where(eq(sources.domain, 'www.ad.nl'))

    await database.db
      .update(feeds)
      .set({ url: `${origin}/rss/` })
      .where(eq(feeds.id, row?.id ?? 0))

    return storedFeed(row?.id ?? 0)
  }

  it('reads the feed, gives every item its value and counts them', async () => {
    const server = await serve(sample)
    const feed = await adFeed(server.origin)

    expect(feed.filter).toBe('club')

    const report = await importFeed(database.db, fetcherFor(servers), feed, adRun)

    expect(report).toMatchObject({ added: 8, relevance: { doubtful: 2, irrelevant: 4, relevant: 2 }, skipped: [] })
    expect(Object.fromEntries((await itemsInDatabase()).map((row) => [row.title, row.relevance]))).toEqual({
      'Ajax klopt Sparta in een zinderend duel': 'irrelevant',
      'Bayern wint de topper van Dortmund': 'irrelevant',
      'Brand in een schuur in Heerenveen is onder controle': 'doubtful',
      'Column | Waarom de titelstrijd spannend blijft': 'irrelevant',
      'Heerenveen wint met 2-0 van Utrecht na een rustige tweede helft': 'relevant',
      'Jongste speler ooit scoort in de Premier League': 'irrelevant',
      'sc Heerenveen versterkt zich met een verdediger': 'relevant',
      'Veldman denkt na over zijn toekomst': 'doubtful',
    })
  })

  it('knows the items behind the paywall by `dpp:paid`, and the items with false or without it as open', async () => {
    const server = await serve(sample)

    await importFeed(database.db, fetcherFor(servers), await adFeed(server.origin), adRun)

    const rows = await database.db.select().from(items)

    expect(Object.fromEntries(rows.map((row) => [row.url.split('~')[1]?.replace('/', ''), row.paywalled]))).toEqual({
      a1000001: true,
      a1000002: false,
      a1000003: true,
      a1000004: false,
      a1000005: true,
      a1000006: false,
      a1000007: true,
      a1000008: false,
    })
  })

  it('keeps the time of publication in UTC, and the link', async () => {
    const server = await serve(sample)

    await importFeed(database.db, fetcherFor(servers), await adFeed(server.origin), adRun)

    const rows = await database.db.select().from(items)
    const byLink = Object.fromEntries(rows.map((row) => [row.url, row.publishedAt]))

    expect(byLink['https://ad.test/voetbal/heerenveen-wint-van-utrecht~a1000001/']).toEqual(
      new Date('2026-10-25T19:30:00Z'),
    )
    expect(byLink['https://ad.test/voetbal/jongste-speler-ooit~a1000008/']).toEqual(new Date('2026-10-25T10:15:00Z'))
  })

  it('keeps nothing of the description, the author or the images', async () => {
    const server = await serve(sample)

    await importFeed(database.db, fetcherFor(servers), await adFeed(server.origin), adRun)

    const stored = JSON.stringify(await database.db.select().from(items))

    expect(stored).not.toContain('verzonnen intro')
    expect(stored).not.toContain('alleen in deze tekst')
    expect(stored).not.toContain('Verslaggever')
    expect(stored).not.toContain('Columnist')
    expect(stored).not.toContain('images.ad.test')
    expect(stored).not.toContain('bijschrift')
  })

  it('shows only the relevant items to a visitor, with "voor abonnees" where the paywall is', async () => {
    const server = await serve(sample)

    await importFeed(database.db, fetcherFor(servers), await adFeed(server.origin), adRun)

    const shown = await listRecentItems(database.db, { limit: 20, until: new Date('2026-10-27T00:00:00Z') })

    expect(shown.map((item) => [item.title, item.paywalled])).toEqual([
      ['Heerenveen wint met 2-0 van Utrecht na een rustige tweede helft', true],
      ['sc Heerenveen versterkt zich met een verdediger', false],
    ])
    expect(shown.every((item) => item.sourceName === 'Algemeen Dagblad')).toBe(true)
  })
})

describe('importing the football feed of ESPN NL, the way the register has it', () => {
  const sample = readFileSync(new URL('./fixtures/espn-sample.xml', import.meta.url), 'utf8')
  const espnRun = new Date('2026-10-26T12:00:00Z')

  /** The football feed of ESPN NL as the seed registers it, pointed at the test server. */
  async function espnFeed(origin: string) {
    await seedSources(database.db)

    const [row] = await database.db
      .select({ id: feeds.id })
      .from(feeds)
      .innerJoin(sources, eq(feeds.sourceId, sources.id))
      .where(eq(sources.domain, 'www.espn.nl'))

    await database.db
      .update(feeds)
      .set({ url: `${origin}/rss/` })
      .where(eq(feeds.id, row?.id ?? 0))

    return storedFeed(row?.id ?? 0)
  }

  it('reads the feed, gives every item its value and counts them', async () => {
    const server = await serve(sample)
    const feed = await espnFeed(server.origin)

    expect(feed.filter).toBe('club')

    const report = await importFeed(database.db, fetcherFor(servers), feed, espnRun)

    expect(report).toMatchObject({ added: 7, relevance: { doubtful: 1, irrelevant: 3, relevant: 3 }, skipped: [] })
    expect(Object.fromEntries((await itemsInDatabase()).map((row) => [row.title, row.relevance]))).toEqual({
      'De speelronde in een notendop: Twente wint en Utrecht verliest': 'irrelevant',
      'Heerenveen-supporters vullen de tribune voor de wedstrijd': 'relevant',
      'Heerenveen wint de wedstrijd bij Utrecht door een late treffer': 'relevant',
      'Het programma van de eredivisie: dit zijn de duels van het weekend': 'irrelevant',
      'Mbappé opent de rij van genomineerden voor de Gouden Bal': 'irrelevant',
      'sc Heerenveen kijkt terug op een bewogen avond': 'relevant',
      'Werkzaamheden aan de weg in Heerenveen duren langer': 'doubtful',
    })
  })

  it('reads the zone EST as Dutch time, in summer time, in winter time and across the switch', async () => {
    const server = await serve(sample)

    await importFeed(database.db, fetcherFor(servers), await espnFeed(server.origin), espnRun)

    const rows = await database.db.select().from(items)
    const byLink = Object.fromEntries(rows.map((row) => [row.url, row.publishedAt]))
    const link = (id: number) => `https://www.espn.test/voetbal/artikel/_/id/${id}/`

    const at = (id: number) => Object.entries(byLink).find(([url]) => url.startsWith(link(id)))?.[1]

    // Winter time, one hour ahead of UTC; 11:26 is before the moment the feed was built.
    expect(at(9000001)).toEqual(new Date('2026-10-26T10:26:08Z'))
    // Just after the end of summer time at 03:00, and just before it.
    expect(at(9000002)).toEqual(new Date('2026-10-25T02:00:01Z'))
    expect(at(9000003)).toEqual(new Date('2026-10-24T23:59:59Z'))
    // Summer time, two hours ahead of UTC.
    expect(at(9000004)).toEqual(new Date('2026-10-24T17:27:02Z'))
    // A time that is no time falls back to the moment we first saw the item.
    expect(at(9000007)).toEqual(espnRun)
  })

  it('keeps nothing of the description, the author or the logo', async () => {
    const server = await serve(sample)

    await importFeed(database.db, fetcherFor(servers), await espnFeed(server.origin), espnRun)

    const stored = JSON.stringify(await database.db.select().from(items))

    expect(stored).not.toContain('verzonnen intro')
    expect(stored).not.toContain('samenvatting')
    expect(stored).not.toContain('Verzonnen Auteur')
    expect(stored).not.toContain('logo.gif')
  })

  it('shows only the relevant items to a visitor, however new the others are', async () => {
    const server = await serve(sample)

    await importFeed(database.db, fetcherFor(servers), await espnFeed(server.origin), espnRun)

    const shown = await listRecentItems(database.db, { limit: 20, until: new Date('2026-10-27T00:00:00Z') })

    expect(shown.map((item) => item.title)).toEqual([
      'Heerenveen-supporters vullen de tribune voor de wedstrijd',
      'Heerenveen wint de wedstrijd bij Utrecht door een late treffer',
      'sc Heerenveen kijkt terug op een bewogen avond',
    ])
    expect(shown.every((item) => item.sourceName === 'ESPN')).toBe(true)
  })

  it('does not read EST as Dutch time for another source', async () => {
    const server = await serve(sample)
    const feed = await addFeed(`${server.origin}/rss/`, { domain: 'andere-krant.test' })

    await importFeed(database.db, fetcherFor(servers), feed, espnRun)

    const times = (await database.db.select({ publishedAt: items.publishedAt }).from(items)).map(
      (row) => row.publishedAt,
    )

    expect(times).toHaveLength(7)
    expect(times.every((time) => time.getTime() === espnRun.getTime())).toBe(true)
  })
})

describe('importing the sports feed of Rijnmond, the way the register has it', () => {
  const sample = readFileSync(new URL('./fixtures/rijnmond-sample.xml', import.meta.url), 'utf8')
  const rijnmondRun = new Date('2026-12-14T09:30:00Z')

  /** The Rotterdam opponents of the season, as the table of matches has them. */
  const opponents: MatchDay[] = [
    { matchDate: '2026-11-08', opponent: 'Feyenoord', status: 'scheduled' },
    { matchDate: '2026-11-29', opponent: 'Sparta Rotterdam', status: 'scheduled' },
    { matchDate: '2026-12-13', opponent: 'Excelsior Rotterdam', status: 'scheduled' },
  ]

  /** The sports feed of Rijnmond as the seed registers it, pointed at the test server. */
  async function rijnmondFeed(origin: string) {
    await seedSources(database.db)

    const [row] = await database.db
      .select({ id: feeds.id })
      .from(feeds)
      .innerJoin(sources, eq(feeds.sourceId, sources.id))
      .where(eq(sources.domain, 'www.rijnmond.nl'))

    await database.db
      .update(feeds)
      .set({ url: `${origin}/rss/` })
      .where(eq(feeds.id, row?.id ?? 0))

    return storedFeed(row?.id ?? 0)
  }

  it('reads the feed on the club filter and gives every item its value', async () => {
    const server = await serve(sample)
    const feed = await rijnmondFeed(server.origin)

    expect(feed.filter).toBe('club')

    const report = await importFeed(database.db, fetcherFor(servers), feed, rijnmondRun, opponents)

    expect(report).toMatchObject({ added: 12, relevance: { doubtful: 0, irrelevant: 7, relevant: 5 }, skipped: [] })
    expect(Object.fromEntries((await itemsInDatabase()).map((row) => [row.key, row.relevance]))).toEqual({
      // Feyenoord on 8 November: relevant from 5 to 11 November, not on 4 or 12 November.
      '9100001': 'relevant',
      '9100002': 'relevant',
      '9100003': 'irrelevant',
      '9100004': 'irrelevant',
      // Sparta on 29 November. Feyenoord in that week is another match, and Sparta Praag is
      // another club.
      '9100005': 'relevant',
      '9100006': 'irrelevant',
      '9100007': 'irrelevant',
      // Excelsior on 13 December.
      '9100008': 'relevant',
      // Two of the clubs in one headline, and a club that is not a Rotterdam opponent.
      '9100009': 'irrelevant',
      '9100010': 'irrelevant',
      // The club itself counts on any day; Sparta far from its match does not.
      '9100011': 'relevant',
      '9100012': 'irrelevant',
    })
  })

  it('reads the times in GMT as they are', async () => {
    const server = await serve(sample)

    await importFeed(database.db, fetcherFor(servers), await rijnmondFeed(server.origin), rijnmondRun, opponents)

    const rows = await itemsInDatabase()

    expect(rows.find((row) => row.key === '9100001')?.publishedAt).toEqual(new Date('2026-11-06T09:30:00Z'))
    expect(rows.find((row) => row.key === '9100008')?.publishedAt).toEqual(new Date('2026-12-11T13:40:00Z'))
  })

  it('keeps nothing of the description, the author, the image or the logo', async () => {
    const server = await serve(sample)

    await importFeed(database.db, fetcherFor(servers), await rijnmondFeed(server.origin), rijnmondRun, opponents)

    const stored = JSON.stringify(await database.db.select().from(items))

    expect(stored).not.toContain('verzonnen intro')
    expect(stored).not.toContain('Verzonnen Auteur')
    expect(stored).not.toContain('.jpg')
    expect(stored).not.toContain('logo.png')
  })

  it('shows only the relevant items to a visitor, with the name of the source', async () => {
    const server = await serve(sample)

    await importFeed(database.db, fetcherFor(servers), await rijnmondFeed(server.origin), rijnmondRun, opponents)

    const shown = await listRecentItems(database.db, { limit: 20, until: new Date('2026-12-15T00:00:00Z') })

    expect(shown.map((item) => item.title)).toEqual([
      'Excelsior verlengt met de keeper',
      'Sparta zoekt na de pauze een nieuwe doelman',
      'Feyenoord-aanvaller twijfelgeval na de interlandperiode',
      'Feyenoord-trainer waarschuwt voor de eigen fouten',
      'sc Heerenveen kijkt uit naar de uitwedstrijd in Rotterdam',
    ])
    expect(shown.every((item) => item.sourceName === 'Rijnmond')).toBe(true)
  })

  it('shows nothing of the Rotterdam clubs without a match around, however often they are in the news', async () => {
    const server = await serve(sample)

    await importFeed(database.db, fetcherFor(servers), await rijnmondFeed(server.origin), rijnmondRun, [])

    const shown = await listRecentItems(database.db, { limit: 20, until: new Date('2026-12-15T00:00:00Z') })

    expect(shown.map((item) => item.title)).toEqual(['sc Heerenveen kijkt uit naar de uitwedstrijd in Rotterdam'])
  })
})

describe('an item that cannot be stored', () => {
  it('is skipped and reported, and the rest of the feed is stored', async () => {
    const server = await serve(
      feedWith(
        entry('goed-1'),
        entry('slecht-1', { link: 'javascript:alert(1)' }),
        '<item><link>https://krant.test/zonder-kop</link><guid>slecht-2</guid></item>',
        entry('goed-2'),
      ),
    )
    const feed = await addFeed(`${server.origin}/rss/`)

    const report = await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    expect(report).toEqual({
      added: 2,
      kind: 'imported',
      relevance: { doubtful: 0, irrelevant: 0, relevant: 2 },
      skipped: [
        { position: 2, reason: 'the link does not start with http or https' },
        { position: 3, reason: 'there is no headline' },
      ],
      unchanged: 0,
      updated: 0,
      url: feed.url,
    })
    expect((await itemsInDatabase()).map((row) => row.key)).toEqual(['goed-1', 'goed-2'])
  })

  it('does not touch a known item that comes back without a headline', async () => {
    const good = await serve(feedWith(entry('g1')))
    const feed = await addFeed(`${good.origin}/rss/`)

    await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    const bad = await serve(feedWith('<item><link>https://krant.test/g1</link><guid>g1</guid></item>'))
    const report = await importFeed(database.db, fetcherFor(servers), { ...feed, url: `${bad.origin}/rss/` }, secondRun)

    expect(report).toMatchObject({ added: 0, skipped: [{ position: 1 }], unchanged: 0, updated: 0 })
    expect((await itemsInDatabase())[0]).toMatchObject({ lastSeenAt: firstRun, title: 'Kop g1' })
  })
})

describe('importing a podcast', () => {
  /**
   * An episode as a podcast feed writes it: with a page, an MP3 file, a description and a
   * duration.
   */
  function episode(
    key: string,
    {
      duration = '2216',
      link = `https://podcast.test/e/${key}/`,
      number,
      season,
      title = `Aflevering ${key}`,
    }: { duration?: string; link?: string; number?: string; season?: string; title?: string } = {},
  ) {
    return (
      `<item><title>${title}</title>` +
      (link === '' ? '' : `<link>${link}</link>`) +
      `<guid isPermaLink="false">${key}</guid><pubDate>Tue, 20 Oct 2026 00:31:00 +0200</pubDate>` +
      '<description>Een verzonnen beschrijving met shownotes.</description>' +
      `<enclosure url="https://mcdn.podcast.test/${key}.mp3" length="53188902" type="audio/mpeg"/>` +
      `<itunes:duration>${duration}</itunes:duration>` +
      (number === undefined ? '' : `<itunes:episode>${number}</itunes:episode>`) +
      (season === undefined ? '' : `<itunes:season>${season}</itunes:season>`) +
      '</item>'
    )
  }

  const podcastFeed = (...entries: string[]) =>
    '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">' +
    `<channel><title>Een verzonnen podcast</title>${entries.join('')}</channel></rss>`

  it('stores the title, the page of the episode, the time and the facts, and skips an episode without a page', async () => {
    const server = await serve(
      podcastFeed(
        episode('een', { number: '16', season: '9' }),
        episode('zonder-pagina', { link: '' }),
        episode('twee', { duration: 'lang', title: 'Tweede' }),
      ),
    )
    const feed = await addFeed(`${server.origin}/rss/`, { domain: 'podcast.test', kind: 'podcast' })

    const report = await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    expect(report).toMatchObject({ added: 2, skipped: [{ position: 2, reason: 'there is no link' }] })
    expect(formatReport(report)).toContain('item 2 skipped: there is no link')
    expect(await itemsInDatabase()).toMatchObject([
      {
        durationSeconds: 2216,
        episodeNumber: 16,
        key: 'een',
        publishedAt: new Date('2026-10-19T22:31:00Z'),
        seasonNumber: 9,
        title: 'Aflevering een',
        url: 'https://podcast.test/e/een/',
      },
      {
        durationSeconds: null,
        episodeNumber: null,
        key: 'twee',
        seasonNumber: null,
        title: 'Tweede',
        url: 'https://podcast.test/e/twee/',
      },
    ])
    expect(JSON.stringify(await itemsInDatabase())).not.toMatch(/mp3|shownotes/u)
  })

  it('makes no duplicates when it runs twice, and updates a title that changed', async () => {
    const server = await serve(podcastFeed(episode('een'), episode('twee')))
    const feed = await addFeed(`${server.origin}/rss/`, { domain: 'podcast.test', kind: 'podcast' })

    await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    const changed = await serve(podcastFeed(episode('een', { title: 'Nieuwe titel' }), episode('twee')))
    const report = await importFeed(
      database.db,
      fetcherFor(servers),
      { ...feed, url: `${changed.origin}/rss/` },
      secondRun,
    )

    expect(report).toMatchObject({ added: 0, unchanged: 1, updated: 1 })
    expect((await itemsInDatabase()).map((row) => row.title)).toEqual(['Nieuwe titel', 'Aflevering twee'])
  })

  it('fills in the facts of an episode that was stored without them, and counts it as updated', async () => {
    const before = await serve(podcastFeed(episode('een', { duration: '0' })))
    const feed = await addFeed(`${before.origin}/rss/`, { domain: 'podcast.test', kind: 'podcast' })

    await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    expect((await itemsInDatabase())[0]).toMatchObject({ durationSeconds: null, episodeNumber: null })

    const after = await serve(podcastFeed(episode('een', { number: '16', season: '9' })))
    const report = await importFeed(
      database.db,
      fetcherFor(servers),
      { ...feed, url: `${after.origin}/rss/` },
      secondRun,
    )

    expect(report).toMatchObject({ added: 0, unchanged: 0, updated: 1 })
    expect((await itemsInDatabase())[0]).toMatchObject({ durationSeconds: 2216, episodeNumber: 16, seasonNumber: 9 })
  })

  it('keeps an episode and an item of another source with the same GUID apart', async () => {
    const server = await serve(podcastFeed(episode('gelijk')))
    const other = await serve(feedWith(entry('gelijk')))
    const podcast = await addFeed(`${server.origin}/rss/`, { domain: 'podcast.test', kind: 'podcast' })
    const news = await addFeed(`${other.origin}/rss/`)

    await importFeed(database.db, fetcherFor(servers), podcast, firstRun)
    await importFeed(database.db, fetcherFor(servers), news, firstRun)

    expect(await itemsInDatabase()).toHaveLength(2)
  })
})

describe('a feed with very many items', () => {
  it('is stored in batches, and a second run makes no duplicates', async () => {
    const server = await serve(feedWith(...Array.from({ length: 1200 }, (_, index) => entry(`g${index}`))))
    const feed = await addFeed(`${server.origin}/rss/`)
    const fetcher = fetcherFor(servers)

    expect(await importFeed(database.db, fetcher, feed, firstRun)).toMatchObject({ added: 1200 })
    expect(await importFeed(database.db, fetcher, feed, secondRun)).toMatchObject({ added: 0, unchanged: 1200 })
    expect(await itemsInDatabase()).toHaveLength(1200)
  })
})

describe('the ETag and Last-Modified', () => {
  const conditional: Handler = (request, response) => {
    if (request.headers['if-none-match'] === '"v1"') {
      response.writeHead(304)
      response.end()
    } else {
      response.writeHead(200, { ...xml, ETag: '"v1"', 'Last-Modified': 'Wed, 21 Oct 2026 07:28:00 GMT' })
      response.end(feedWith(entry('g1')))
    }
  }

  it('are saved with the items, and sent the next time', async () => {
    const server = await serve(conditional)
    const feed = await addFeed(`${server.origin}/rss/`)

    await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    const saved = await storedFeed(feed.id)

    expect(saved).toMatchObject({ etag: '"v1"', lastModified: 'Wed, 21 Oct 2026 07:28:00 GMT' })

    await importFeed(database.db, fetcherFor(servers), saved, secondRun)

    const asked = server.requests.filter((request) => request.url === '/rss/')

    expect(asked[1]?.headers['if-none-match']).toBe('"v1"')
    expect(asked[1]?.headers['if-modified-since']).toBe('Wed, 21 Oct 2026 07:28:00 GMT')
  })

  it('make the importer do nothing when the source says nothing changed', async () => {
    const server = await serve(conditional)
    const feed = await addFeed(`${server.origin}/rss/`)

    await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    const report = await importFeed(database.db, fetcherFor(servers), await storedFeed(feed.id), secondRun)

    expect(report).toEqual({ kind: 'not-modified', url: feed.url })
    expect((await itemsInDatabase())[0]?.lastSeenAt).toEqual(firstRun)
    expect(await storedFeed(feed.id)).toMatchObject({ etag: '"v1"' })
  })

  it('stay as they were when the feed cannot be read', async () => {
    const server = await serve(conditional)
    const feed = await addFeed(`${server.origin}/rss/`)

    await importFeed(database.db, fetcherFor(servers), feed, firstRun)
    await database.db.update(feeds).set({ etag: '"v0"' }).where(eq(feeds.id, feed.id))

    const broken = await serve((_request, response) => {
      response.writeHead(200, { ...xml, ETag: '"v2"' })
      response.end('<rss version="2.0"><channel><item><title>Kop')
    })
    const report = await importFeed(
      database.db,
      fetcherFor(servers),
      { ...(await storedFeed(feed.id)), url: `${broken.origin}/rss/` },
      secondRun,
    )

    expect(report).toMatchObject({ kind: 'error' })
    expect(await storedFeed(feed.id)).toMatchObject({ etag: '"v0"' })
    expect(await itemsInDatabase()).toHaveLength(1)
  })

  it('stay as they were, and no item is stored, when the database refuses the items', async () => {
    const server = await serve(conditional)
    const feed = await addFeed(`${server.origin}/rss/`)

    // A feed that is not in the register: the database refuses the items, and the transaction
    // takes everything back.
    await expect(
      importFeed(database.db, fetcherFor(servers), { ...feed, sourceId: feed.sourceId + 1000 }, firstRun),
    ).rejects.toThrow()

    expect(await storedFeed(feed.id)).toMatchObject({ etag: null, lastModified: null })
    expect(await itemsInDatabase()).toHaveLength(0)
  })
})

describe('a feed the source does not give', () => {
  it('is reported when robots.txt forbids it, and nothing is stored', async () => {
    const server = await serve(recording, { '/robots.txt': reply(200, 'User-agent: *\nDisallow: /rss/\n') })
    const feed = await addFeed(`${server.origin}/rss/`)

    expect(await importFeed(database.db, fetcherFor(servers), feed, firstRun)).toEqual({
      kind: 'blocked-by-robots',
      url: feed.url,
    })
    expect(await itemsInDatabase()).toHaveLength(0)
  })

  it('is reported when the source asks us to wait', async () => {
    const server = await serve(reply(429, 'Te druk', { 'Retry-After': '120' }))
    const feed = await addFeed(`${server.origin}/rss/`)

    expect(await importFeed(database.db, fetcherFor(servers), feed, firstRun)).toEqual({
      kind: 'wait',
      retryAfterSeconds: 120,
      url: feed.url,
    })
  })

  it.each([
    ['an error from the source', reply(500, 'Kapot'), 'HTTP 500'],
    [
      'a page that is no feed',
      reply(200, '<html><body>Accepteer de cookies</body></html>', { 'Content-Type': 'text/html' }),
      'not an RSS or Atom feed',
    ],
    [
      'a feed that stops halfway',
      reply(200, '<rss version="2.0"><channel><item><title>Kop</title>', xml),
      'not well-formed XML',
    ],
  ])('is reported as an error for %s', async (_, handler, message) => {
    const server = await serve(handler)
    const feed = await addFeed(`${server.origin}/rss/`)

    const report = await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    expect(report).toMatchObject({ kind: 'error', message: expect.stringContaining(message) as string, url: feed.url })
    expect(await itemsInDatabase()).toHaveLength(0)
  })
})

describe('importing all feeds', () => {
  it('reads the feeds of the sources that are switched on, and not those of a source that is switched off', async () => {
    const on = await serve(feedWith(entry('g1')))
    const off = await serve(feedWith(entry('g2')))

    await addFeed(`${on.origin}/rss/`, { domain: 'aan.test' })
    await addFeed(`${off.origin}/rss/`, { domain: 'uit.test', enabled: false })

    const reports = await importAll()

    expect(reports).toHaveLength(1)
    expect(off.requests).toHaveLength(0)
    expect((await itemsInDatabase()).map((row) => row.key)).toEqual(['g1'])
  })

  it('reports on every feed, and a feed that fails does not stop the next', async () => {
    const down = await serve(reply(503, 'Onderhoud'))
    const broken = await serve(reply(200, 'geen feed', xml))
    const good = await serve(feedWith(entry('g1'), entry('g2')))

    await addFeed(`${down.origin}/rss/`, { domain: 'a.test' })
    await addFeed(`${broken.origin}/rss/`, { domain: 'b.test' })
    await addFeed(`${good.origin}/rss/`, { domain: 'c.test' })

    const reports = await importAll()

    expect(reports.map((report) => report.kind)).toEqual(['wait', 'error', 'imported'])
    expect(reports[2]).toMatchObject({ added: 2 })
    expect(await itemsInDatabase()).toHaveLength(2)
  })

  it('lets a source have more than one feed, and reads the item of two feeds once', async () => {
    const one = await serve(feedWith(entry('g1', { title: 'Uit feed een' })))
    const two = await serve(feedWith(entry('g1', { title: 'Uit feed twee' }), entry('g2')))
    const first = await addFeed(`${one.origin}/rss/`)

    await database.db.insert(feeds).values({ sourceId: first.sourceId, url: `${two.origin}/rss/` })

    await importAll()

    const rows = await itemsInDatabase()

    expect(rows.map((row) => row.key)).toEqual(['g1', 'g2'])
    expect(rows[0]?.title).toBe('Uit feed twee')
  })

  it('reads the robots.txt of a host once for all its feeds', async () => {
    const server = await serve(feedWith(entry('g1')), { '/rss/twee': reply(200, feedWith(entry('g2')), xml) })
    const first = await addFeed(`${server.origin}/rss/`)

    await database.db.insert(feeds).values({ sourceId: first.sourceId, url: `${server.origin}/rss/twee` })
    await importAll()

    expect(server.paths().filter((path) => path === '/robots.txt')).toHaveLength(1)
  })

  it('has nothing to do without feeds', async () => {
    expect(await importAll()).toEqual([])
    expect(await listFeedsToImport(database.db)).toEqual([])
  })
})

const noRelevance = { doubtful: 0, irrelevant: 0, relevant: 0 }

describe('the report', () => {
  const url = 'https://krant.test/rss/'

  it('has a line for each feed with the counts', () => {
    expect(
      formatReport({ added: 3, kind: 'imported', relevance: noRelevance, skipped: [], unchanged: 40, updated: 2, url }),
    ).toBe('https://krant.test/rss/: 3 new, 2 updated, 40 unchanged, 0 skipped')
  })

  it('says how many items fell in each relevance', () => {
    const relevance = { doubtful: 4, irrelevant: 11, relevant: 30 }

    expect(formatReport({ added: 3, kind: 'imported', relevance, skipped: [], unchanged: 40, updated: 2, url })).toBe(
      'https://krant.test/rss/: 3 new, 2 updated, 40 unchanged, 0 skipped; 30 relevant, 4 doubtful, 11 irrelevant',
    )
  })

  it('has a line for each item that was skipped, with its place and the reason', () => {
    const skipped = [
      { position: 2, reason: 'there is no link' },
      { position: 9, reason: 'there is no headline' },
    ]

    expect(
      formatReport({
        added: 1,
        kind: 'imported',
        relevance: noRelevance,
        skipped,
        unchanged: 0,
        updated: 0,
        url,
      }).split('\n'),
    ).toEqual([
      'https://krant.test/rss/: 1 new, 0 updated, 0 unchanged, 2 skipped',
      '  item 2 skipped: there is no link',
      '  item 9 skipped: there is no headline',
    ])
  })

  it('says what happened when a feed was not read', () => {
    expect(formatReport({ kind: 'not-modified', url })).toBe(
      'https://krant.test/rss/: not modified since the last time',
    )
    expect(formatReport({ kind: 'blocked-by-robots', url })).toBe(
      'https://krant.test/rss/: not read, robots.txt does not allow it',
    )
    expect(formatReport({ kind: 'wait', retryAfterSeconds: 90, url })).toBe(
      'https://krant.test/rss/: not read, the source asks us to wait 90 seconds',
    )
    expect(formatReport({ kind: 'wait', retryAfterSeconds: null, url })).toBe(
      'https://krant.test/rss/: not read, the source asks us to wait',
    )
    expect(formatReport({ failuresInARow: 0, kind: 'postponed', retryAt: new Date('2026-10-22T11:30:00Z'), url })).toBe(
      'https://krant.test/rss/: not read, the source asked us to wait until 2026-10-22 11:30:00 UTC',
    )
    expect(formatReport({ failuresInARow: 4, kind: 'postponed', retryAt: new Date('2026-10-22T11:59:00Z'), url })).toBe(
      'https://krant.test/rss/: not read, it failed 4 runs in a row; next try from 2026-10-22 11:59:00 UTC',
    )
  })

  it('leaves control characters out of a message that came from outside, and cuts it off', () => {
    const line = formatReport({
      kind: 'error',
      message: `\u001b[31mrood\u001b[0m\nnieuwe regel ${'x'.repeat(400)}`,
      url,
    })

    expect(line).not.toMatch(/\p{Cc}/u)
    // 300 characters at most, the length of a reason in the database.
    expect(line.slice(`${url}: failed, `.length)).toHaveLength(300)
    expect(line.endsWith('…')).toBe(true)
  })
})
