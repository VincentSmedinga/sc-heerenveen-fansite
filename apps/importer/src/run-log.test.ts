import type { TestDatabase } from '@fansite/db/test-database'

import { feeds, importResults, importRuns, robotsTxt, sources } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { runImport } from './import-feeds.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

/** The first run of each test. Cron starts the import at minute 7, 22, 37 and 52. */
const start = new Date('2026-10-22T10:07:00Z')

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
  await database.pool.query('DELETE FROM import_runs')
  await database.pool.query('DELETE FROM robots_txt')
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

/**
 * Starts a web server on this computer with a feed at `/rss/`, and puts the feed in the
 * register under its own source. The handler can be changed later, to make a feed break or
 * recover.
 */
async function addFeed(name: string, handler: Handler, routes: Record<string, Handler> = {}) {
  const feed = { handler }
  const server = await startServer({ '/rss/': (request, response) => feed.handler(request, response), ...routes })

  servers.push(server)

  const [source] = await database.db
    .insert(sources)
    .values({ domain: `${name}.test`, kind: 'news', name })
    .$returningId()
  const [row] = await database.db
    .insert(feeds)
    .values({ sourceId: source?.id ?? 0, url: `${server.origin}/rss/` })
    .$returningId()

  return Object.assign(feed, {
    /** How often the server was asked for this path. */
    asked: (path = '/rss/') => server.paths().filter((asked) => asked === path).length,
    id: row?.id ?? 0,
    server,
  })
}

/** A time this many minutes after the first run. */
function after(minutes: number) {
  return new Date(start.getTime() + minutes * 60 * 1000)
}

/** A feed with an item for each key, as the Leeuwarder Courant writes one. */
function feedWith(...keys: string[]) {
  const entries = keys.map(
    (key) =>
      `<item><title>Kop ${key}</title><link>https://krant.test/${key}</link><guid>${key}</guid><pubDate>Tue, 20 Oct 2026 11:58:00 GMT</pubDate></item>`,
  )

  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Een feed</title>${entries.join('')}</channel></rss>`
}

async function healthOf(id: number) {
  const [feed] = await database.db.select().from(feeds).where(eq(feeds.id, id))

  return feed
}

/**
 * Runs the import at a moment, as cron does, with a fetcher that may reach the test servers.
 */
async function importAt(now: Date) {
  const lines: string[] = []
  const code = await runImport(database.url, {
    clock: () => now,
    makeFetcher: (robots) => fetcherFor(servers, { robots }),
    wikipediaOrigin: null,
    write: (line) => lines.push(line),
  })

  return { code, lines }
}

const resultsOf = (feedId: number) =>
  database.db.select().from(importResults).where(eq(importResults.feedId, feedId)).orderBy(asc(importResults.id))

const runs = () => database.db.select().from(importRuns).orderBy(asc(importRuns.id))

describe('the lock', () => {
  it('lets a second run do nothing while the first one runs, with a line in the log and exit code 0', async () => {
    let asked: () => void = () => undefined
    let release: () => void = () => undefined
    const requested = new Promise<void>((resolve) => (asked = resolve))
    const released = new Promise<void>((resolve) => (release = resolve))
    const feed = await addFeed('traag', (_request, response) => {
      asked()
      void released.then(() => {
        response.writeHead(200, xml)
        response.end(feedWith('g1'))
      })
    })

    const first = importAt(start)

    await requested

    const second = await importAt(after(1))

    expect(second).toEqual({
      code: 0,
      lines: ['Another import is still running on this database, so this run does nothing.'],
    })
    expect(feed.asked()).toBe(1)

    release()

    expect(await first).toMatchObject({ code: 0, lines: [expect.stringContaining(': 1 new,') as string] })
    expect(await runs()).toMatchObject([
      { finishedAt: start, lockTaken: false, startedAt: start },
      { finishedAt: after(1), lockTaken: true, startedAt: after(1) },
    ])
    // The second run left no trace of the feed, and the lock is free for the next run.
    expect(await resultsOf(feed.id)).toHaveLength(1)
    expect(await importAt(after(15))).toMatchObject({ code: 0 })
    expect(feed.asked()).toBe(2)
  })
})

describe('the log', () => {
  it('has the start and the end of each run, and per feed the outcome, the counts and the reason', async () => {
    const good = await addFeed(
      'goed',
      reply(
        200,
        feedWith('g1', 'g2').replace('</channel>', '<item><title>Zonder link</title><guid>g3</guid></item></channel>'),
        xml,
      ),
    )
    const broken = await addFeed('kapot', reply(500, 'Kapot'))
    const busy = await addFeed('druk', reply(429, 'Te druk', { 'Retry-After': '120' }))
    const closed = await addFeed('dicht', reply(200, feedWith('g1'), xml), {
      '/robots.txt': reply(200, 'User-agent: *\nDisallow: /rss/\n'),
    })

    const { code } = await importAt(start)

    expect(code).toBe(1)
    expect(await runs()).toMatchObject([{ finishedAt: start, lockTaken: false, startedAt: start }])
    expect(await resultsOf(good.id)).toMatchObject([
      { added: 2, outcome: 'imported', reason: null, skipped: 1, unchanged: 0, updated: 0 },
    ])
    expect(await resultsOf(broken.id)).toMatchObject([{ added: 0, outcome: 'error', reason: 'HTTP 500' }])
    expect(await resultsOf(busy.id)).toMatchObject([
      { outcome: 'wait', reason: 'the source asks us to wait 120 seconds' },
    ])
    expect(await resultsOf(closed.id)).toMatchObject([{ outcome: 'blocked-by-robots', reason: null }])
  })

  it('counts an item that is the same as last time as unchanged', async () => {
    const feed = await addFeed('krant', reply(200, feedWith('g1'), xml))

    await importAt(start)
    await importAt(after(15))

    expect(await resultsOf(feed.id)).toMatchObject([
      { added: 1, unchanged: 0 },
      { added: 0, unchanged: 1 },
    ])
  })

  it('keeps no values from a query in the reason when the database refuses something', async () => {
    const feed = await addFeed('krant', reply(200, feedWith('GEHEIM'), xml))

    await database.pool.query("ALTER TABLE items ADD CONSTRAINT test_refuse CHECK (title <> 'Kop GEHEIM')")

    try {
      const { code, lines } = await importAt(start)
      // Only the code of the error, whose name mysql2 takes from MySQL. The query had the
      // headline and the link.
      const reason = expect.stringMatching(/^database error [A-Z_\d]+$/u) as string

      expect(code).toBe(1)
      expect(lines).toEqual([expect.stringMatching(/: failed, database error [A-Z_\d]+$/u)])
      expect(await resultsOf(feed.id)).toMatchObject([{ outcome: 'error', reason }])
      expect(await healthOf(feed.id)).toMatchObject({ lastError: reason })
    } finally {
      await database.pool.query('ALTER TABLE items DROP CONSTRAINT test_refuse')
    }
  })

  it('removes the runs older than 30 days, with what they did per feed', async () => {
    const feed = await addFeed('krant', reply(200, feedWith('g1'), xml))
    const old = new Date(start.getTime() - 30 * 24 * 60 * 60 * 1000 - 1000)
    const recent = new Date(start.getTime() - 29 * 24 * 60 * 60 * 1000)

    for (const startedAt of [old, recent]) {
      const [run] = await database.db.insert(importRuns).values({ finishedAt: startedAt, startedAt }).$returningId()

      await database.db.insert(importResults).values({ feedId: feed.id, outcome: 'not-modified', runId: run?.id ?? 0 })
    }

    await importAt(start)

    expect((await runs()).map((run) => run.startedAt)).toEqual([recent, start])
    expect(await resultsOf(feed.id)).toHaveLength(2)
  })
})

describe('the health of a feed', () => {
  it('counts the failed runs in a row, and keeps the last error', async () => {
    const feed = await addFeed('kapot', reply(500, 'Kapot'))

    await importAt(start)
    expect(await healthOf(feed.id)).toMatchObject({
      failuresInARow: 1,
      lastError: 'HTTP 500',
      lastErrorAt: start,
      lastSuccessAt: null,
    })

    await importAt(after(15))
    expect(await healthOf(feed.id)).toMatchObject({ failuresInARow: 2, lastErrorAt: after(15) })
  })

  it('starts counting again after a run that read the feed, and keeps the last error', async () => {
    const feed = await addFeed('krant', reply(500, 'Kapot'))

    await importAt(start)
    await importAt(after(15))
    feed.handler = reply(200, feedWith('g1'), xml)
    await importAt(after(30))

    expect(await healthOf(feed.id)).toMatchObject({
      failuresInARow: 0,
      lastError: 'HTTP 500',
      lastErrorAt: after(15),
      lastSuccessAt: after(30),
      retryAt: null,
    })
  })

  it('counts a feed that has not changed as a success', async () => {
    const feed = await addFeed('krant', (request, response) => {
      response.writeHead(request.headers['if-none-match'] === '"v1"' ? 304 : 200, { ...xml, ETag: '"v1"' })
      response.end(request.headers['if-none-match'] === '"v1"' ? undefined : feedWith('g1'))
    })

    await importAt(start)
    await database.db.update(feeds).set({ failuresInARow: 2 }).where(eq(feeds.id, feed.id))
    await importAt(after(15))

    expect(await resultsOf(feed.id)).toMatchObject([{ outcome: 'imported' }, { outcome: 'not-modified' }])
    expect(await healthOf(feed.id)).toMatchObject({ failuresInARow: 0, lastSuccessAt: after(15) })
  })

  it.each([
    ['waiting', reply(503, 'Onderhoud', { 'Retry-After': '0' }), {}],
    [
      'a refusal by robots.txt',
      reply(200, feedWith('g1'), xml),
      { '/robots.txt': reply(200, 'User-agent: *\nDisallow: /\n') },
    ],
  ])('does not count %s as a failure or a success, but logs it', async (_, handler, routes) => {
    const feed = await addFeed('krant', handler, routes)

    await database.db.update(feeds).set({ failuresInARow: 2 }).where(eq(feeds.id, feed.id))
    await importAt(start)

    expect(await healthOf(feed.id)).toMatchObject({ failuresInARow: 2, lastError: null, lastSuccessAt: null })
    expect(await resultsOf(feed.id)).toHaveLength(1)
  })
})

describe('a source that asks us to wait', () => {
  it('is not asked again until the moment of Retry-After, and a run that skips it logs that', async () => {
    const feed = await addFeed('druk', reply(429, 'Te druk', { 'Retry-After': '1800' }))

    await importAt(start)
    expect(await healthOf(feed.id)).toMatchObject({ retryAt: after(30) })

    const skipped = await importAt(after(15))

    expect(skipped).toEqual({
      code: 0,
      lines: [`${feed.server.origin}/rss/: not read, the source asked us to wait until 2026-10-22 10:37:00 UTC`],
    })
    expect(feed.asked()).toBe(1)
    expect((await resultsOf(feed.id))[1]).toMatchObject({
      outcome: 'postponed',
      reason: 'the source asked us to wait until 2026-10-22 10:37:00 UTC',
    })

    await importAt(after(30))
    expect(feed.asked()).toBe(2)
  })

  it.each([
    ['an hour when it does not say how long', {}, after(60)],
    ['a day at most', { 'Retry-After': '999999' }, after(24 * 60)],
  ])('is left alone for %s', async (_, headers, retryAt) => {
    const feed = await addFeed('druk', reply(503, 'Onderhoud', headers))

    await importAt(start)

    expect(await healthOf(feed.id)).toMatchObject({ retryAt })
  })
})

describe('a feed that failed three runs in a row', () => {
  it('is tried once an hour until it works again', async () => {
    const feed = await addFeed('kapot', reply(500, 'Kapot'))

    for (const minutes of [0, 15, 30]) {
      await importAt(after(minutes))
    }
    expect(feed.asked()).toBe(3)
    expect(await healthOf(feed.id)).toMatchObject({ failuresInARow: 3, retryAt: after(30 + 59) })

    for (const minutes of [45, 60, 75]) {
      expect((await importAt(after(minutes))).lines).toEqual([
        `${feed.server.origin}/rss/: not read, it failed 3 runs in a row; next try from 2026-10-22 11:36:00 UTC`,
      ])
    }
    expect(feed.asked()).toBe(3)

    // An hour after the last try, give or take a moment.
    await importAt(new Date(after(90).getTime() - 2000))
    expect(feed.asked()).toBe(4)
    expect(await healthOf(feed.id)).toMatchObject({ failuresInARow: 4 })

    feed.handler = reply(200, feedWith('g1'), xml)
    await importAt(after(105))
    expect(feed.asked()).toBe(4)
    await importAt(after(150))
    expect(feed.asked()).toBe(5)
    expect(await healthOf(feed.id)).toMatchObject({ failuresInARow: 0, retryAt: null })

    // Back to every run.
    await importAt(after(165))
    expect(feed.asked()).toBe(6)
  })

  it('does not stop the other feeds', async () => {
    const broken = await addFeed('kapot', reply(500, 'Kapot'))
    const good = await addFeed('krant', reply(200, feedWith('g1'), xml))

    for (const minutes of [0, 15, 30, 45]) {
      await importAt(after(minutes))
    }

    expect(broken.asked()).toBe(3)
    expect(good.asked()).toBe(4)
    expect(await healthOf(good.id)).toMatchObject({ failuresInARow: 0, lastSuccessAt: after(45) })
  })
})

describe('robots.txt between runs', () => {
  it('is kept in the database and read again after 24 hours', async () => {
    const feed = await addFeed('krant', reply(200, feedWith('g1'), xml), {
      '/robots.txt': reply(200, 'User-agent: *\nDisallow: /geheim/\n'),
    })

    await importAt(start)
    await importAt(after(15))
    await importAt(after(24 * 60 - 1))

    expect(feed.asked('/robots.txt')).toBe(1)
    expect(feed.asked()).toBe(3)
    expect(await database.db.select().from(robotsTxt)).toEqual([
      { fetchedAt: start, origin: feed.server.origin, rules: '[{"allow":false,"pattern":"/geheim/"}]' },
    ])

    await importAt(after(24 * 60))

    expect(feed.asked('/robots.txt')).toBe(2)
    expect(await database.db.select().from(robotsTxt)).toMatchObject([{ fetchedAt: after(24 * 60) }])
  })

  it('keeps the rules that refuse a feed, too', async () => {
    const feed = await addFeed('dicht', reply(200, feedWith('g1'), xml), {
      '/robots.txt': reply(200, 'User-agent: *\nDisallow: /rss/\n'),
    })

    await importAt(start)
    const { lines } = await importAt(after(15))

    expect(lines).toEqual([`${feed.server.origin}/rss/: not read, robots.txt does not allow it`])
    expect(feed.asked('/robots.txt')).toBe(1)
    expect(feed.asked()).toBe(0)
  })

  it('is not kept when it could not be read, so the next run tries again', async () => {
    const feed = await addFeed('krant', reply(200, feedWith('g1'), xml), { '/robots.txt': reply(500, 'Kapot') })

    await importAt(start)
    await importAt(after(15))

    expect(feed.asked('/robots.txt')).toBe(2)
    expect(feed.asked()).toBe(0)
    expect(await database.db.select().from(robotsTxt)).toEqual([])
  })
})
