import type { TestDatabase } from '@fansite/db/test-database'

import { feeds, items, sources } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

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
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

/** Puts a source with a feed in the register and gives the feed as the importer reads it. */
async function addFeed(url: string, { domain = 'krant.test', enabled = true } = {}) {
  const [source] = await database.db
    .insert(sources)
    .values({ domain, enabled, kind: 'news', name: domain })
    .$returningId()
  const [feed] = await database.db
    .insert(feeds)
    .values({ sourceId: source?.id ?? 0, url })
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

/** Starts a web server on this computer that serves the feed at `/rss/`. The tests ask no real site. */
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

    // A feed that is not in the register: the database refuses the items, and the transaction takes everything back.
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

describe('the report', () => {
  const url = 'https://krant.test/rss/'

  it('has a line for each feed with the counts', () => {
    expect(formatReport({ added: 3, kind: 'imported', skipped: [], unchanged: 40, updated: 2, url })).toBe(
      'https://krant.test/rss/: 3 new, 2 updated, 40 unchanged, 0 skipped',
    )
  })

  it('has a line for each item that was skipped, with its place and the reason', () => {
    const skipped = [
      { position: 2, reason: 'there is no link' },
      { position: 9, reason: 'there is no headline' },
    ]

    expect(formatReport({ added: 1, kind: 'imported', skipped, unchanged: 0, updated: 0, url }).split('\n')).toEqual([
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
