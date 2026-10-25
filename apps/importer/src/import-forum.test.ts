import type { TestDatabase } from '@fansite/db/test-database'

import { discussions, feeds, importResults, sources } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { desc, eq } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { MadeUpDiscussion } from './test-forum.ts'
import type { Handler, TestServer } from './test-server.ts'

import { importFeed, importFeeds, runImport } from './import-feeds.ts'
import { startRun } from './run-log.ts'
import { showStatus } from './status.ts'
import { discussionsPath, forumAnswer } from './test-forum.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

const firstRun = new Date('2026-10-23T12:00:00Z')
const secondRun = new Date('2026-10-23T12:15:00Z')

const jsonApi = { 'Content-Type': 'application/vnd.api+json' }

/** Seven discussions, two of them in the tags we leave out. */
const sevenDiscussions: MadeUpDiscussion[] = [
  {
    commentCount: 84,
    id: 1,
    lastPostedAt: '2026-10-23T13:28:21+02:00',
    lastPostedUser: 502,
    title: 'Wie wint er zondag?',
  },
  { id: 2, lastPostedAt: '2026-10-23T13:40:00+02:00', tags: [10], title: 'Welke muziek luister je nu?' },
  {
    commentCount: 1,
    id: 3,
    lastPostedAt: '2026-10-23T09:00:00+00:00',
    lastPostedUser: null,
    tags: [3],
    title: 'Opstelling',
  },
  { id: 4, lastPostedAt: '2026-10-22T20:00:00+00:00', tags: [9], title: 'Een andere club' },
  { id: 5, lastPostedAt: '2026-10-22T10:00:00+00:00', title: 'Nieuwe spits gezocht' },
  { id: 6, lastPostedAt: '2026-10-21T10:00:00+00:00', title: 'Het stadion in de winter' },
  { id: 7, lastPostedAt: '2026-10-20T10:00:00+00:00', title: 'Vorige week op de tribune' },
]

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

/** Puts the forum in the register with its feed. */
async function addForum(server: TestServer, { enabled = true } = {}) {
  const [source] = await database.db
    .insert(sources)
    .values({ domain: 'forum.test', enabled, kind: 'forum', name: 'Testforum' })
    .$returningId()
  const [feed] = await database.db
    .insert(feeds)
    .values({ sourceId: source?.id ?? 0, url: `${server.origin}${discussionsPath}` })
    .$returningId()
  const [stored] = await database.db
    .select()
    .from(feeds)
    .where(eq(feeds.id, feed?.id ?? 0))

  if (stored === undefined) {
    throw new Error('The feed is not in the database')
  }

  return stored
}

/** Starts a web server on this computer that answers the request for the discussions, as the API does. */
async function serve(answer: Handler | string) {
  const handler =
    typeof answer === 'string'
      ? (request: Parameters<Handler>[0], response: Parameters<Handler>[1]) => {
          // The real API sets a session cookie, and we must ignore it. It also sends nothing we could ask about again.
          response.setHeader('Set-Cookie', 'flarum_session=verzonnen; Path=/; HttpOnly')
          response.setHeader('ETag', '"verzonnen"')
          reply(200, answer, jsonApi)(request, response)
        }
      : answer
  const server = await startServer({ [discussionsPath]: handler })

  servers.push(server)

  return server
}

const discussionsInDatabase = () => database.db.select().from(discussions).orderBy(desc(discussions.lastPostedAt))

describe('importing the discussions of a forum', () => {
  it('stores the newest five outside Offtopics and Sport overig, with the five fields and nothing else', async () => {
    const server = await serve(forumAnswer(sevenDiscussions))
    const feed = await addForum(server)

    const report = await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    expect(report).toMatchObject({ added: 5, kind: 'imported', skipped: [], unchanged: 0, updated: 0 })

    const rows = await discussionsInDatabase()

    expect(rows).toMatchObject([
      {
        lastPostedAt: new Date('2026-10-23T11:28:21Z'),
        lastPostedBy: 'Buffon1',
        replyCount: 83,
        sourceId: feed.sourceId,
        title: 'Wie wint er zondag?',
        url: `${server.origin}/d/1-discussie-1/84`,
      },
      {
        lastPostedAt: new Date('2026-10-23T09:00:00Z'),
        lastPostedBy: null,
        replyCount: 0,
        sourceId: feed.sourceId,
        title: 'Opstelling',
        url: `${server.origin}/d/3-discussie-3/1`,
      },
      expect.objectContaining({ title: 'Nieuwe spits gezocht' }),
      expect.objectContaining({ title: 'Het stadion in de winter' }),
      expect.objectContaining({ title: 'Vorige week op de tribune' }),
    ])
  })

  it('builds the addresses from the address of the forum in the register', async () => {
    const server = await serve(forumAnswer([{ id: 7, slug: '7-een-slug' }]))
    const feed = await addForum(server)

    await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    expect((await discussionsInDatabase())[0]?.url).toBe(`${server.origin}/d/7-een-slug/5`)
  })

  it('stores nothing of the forum that it was not asked to keep', async () => {
    const server = await serve(forumAnswer(sevenDiscussions))
    const feed = await addForum(server)

    await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    const [everything] = await database.pool.query('SELECT * FROM discussions')

    expect(JSON.stringify(everything)).not.toContain('thumbnail')
    expect(JSON.stringify(everything)).not.toContain('avatar')
    expect(JSON.stringify(everything)).not.toContain('lastSeenAt')
    expect(JSON.stringify(everything)).not.toContain('Welke muziek')
    expect(JSON.stringify(everything)).not.toContain('Een andere club')
  })

  it('asks as a guest: no cookie, no key, and no question whether anything changed', async () => {
    const server = await serve(forumAnswer(sevenDiscussions))
    const feed = await addForum(server)
    const fetcher = fetcherFor(servers)

    await importFeed(database.db, fetcher, feed, firstRun)
    await importFeed(database.db, fetcher, await addedFeed(feed.id), secondRun)

    const asked = server.requests.filter((request) => request.url === discussionsPath)

    expect(asked).toHaveLength(2)
    for (const request of asked) {
      expect(request.headers['cookie']).toBeUndefined()
      expect(request.headers['authorization']).toBeUndefined()
      expect(request.headers['if-none-match']).toBeUndefined()
      expect(request.headers['if-modified-since']).toBeUndefined()
    }
  })

  it('gives an empty database its discussions, although the forum sent an ETag the time before', async () => {
    const server = await serve(forumAnswer(sevenDiscussions))
    const feed = await addForum(server)
    const fetcher = fetcherFor(servers)

    await importFeed(database.db, fetcher, feed, firstRun)
    await database.pool.query('DELETE FROM discussions')
    await importFeed(database.db, fetcher, await addedFeed(feed.id), secondRun)

    expect(await discussionsInDatabase()).toHaveLength(5)
    expect((await addedFeed(feed.id)).etag).toBeNull()
  })

  it('replaces the discussions each run: a discussion that left the five is gone, and so is an old title', async () => {
    let answer = forumAnswer(sevenDiscussions)
    const server = await serve((request, response) => reply(200, answer, jsonApi)(request, response))
    const feed = await addForum(server)
    const fetcher = fetcherFor(servers)

    await importFeed(database.db, fetcher, feed, firstRun)

    answer = forumAnswer([
      { id: 8, lastPostedAt: '2026-10-23T14:00:00+00:00', title: 'Net erbij' },
      {
        commentCount: 90,
        id: 1,
        lastPostedAt: '2026-10-23T13:28:21+02:00',
        lastPostedUser: 503,
        title: 'Wie wint er zondag, denk je?',
      },
      {
        commentCount: 1,
        id: 3,
        lastPostedAt: '2026-10-23T09:00:00+00:00',
        lastPostedUser: null,
        tags: [3],
        title: 'Opstelling',
      },
      { id: 5, lastPostedAt: '2026-10-22T10:00:00+00:00', title: 'Nieuwe spits gezocht' },
      { id: 6, lastPostedAt: '2026-10-21T10:00:00+00:00', title: 'Het stadion in de winter' },
    ])

    const report = await importFeed(database.db, fetcher, feed, secondRun)

    expect(report).toMatchObject({ added: 1, kind: 'imported', unchanged: 3, updated: 1 })
    expect((await discussionsInDatabase()).map((row) => row.title)).toEqual([
      'Net erbij',
      'Wie wint er zondag, denk je?',
      'Opstelling',
      'Nieuwe spits gezocht',
      'Het stadion in de winter',
    ])
    expect((await discussionsInDatabase())[1]).toMatchObject({ lastPostedBy: 'Friesche Pompebled', replyCount: 89 })
  })

  it('removes all discussions when the forum has none that we show', async () => {
    let answer = forumAnswer(sevenDiscussions)
    const server = await serve((request, response) => reply(200, answer, jsonApi)(request, response))
    const feed = await addForum(server)
    const fetcher = fetcherFor(servers)

    await importFeed(database.db, fetcher, feed, firstRun)

    answer = forumAnswer([{ id: 2, tags: [10] }])

    expect(await importFeed(database.db, fetcher, feed, secondRun)).toMatchObject({ added: 0, kind: 'imported' })
    expect(await discussionsInDatabase()).toEqual([])
  })

  it.each([
    ['the forum answers with an error', reply(500, 'Kapot', jsonApi)],
    ['the forum asks us to wait', reply(429, '', { 'Retry-After': '120' })],
    ['the answer is not JSON', reply(200, '<html>Onderhoud</html>', { 'Content-Type': 'text/html' })],
    ['the answer holds no list of discussions', reply(200, '{"errors":[{"status":"403"}]}', jsonApi)],
    ['no discussion in the answer can be read', reply(200, '{"data":[{"id":"1","type":"discussions"}]}', jsonApi)],
  ])('keeps the discussions it has when %s', async (_name, broken) => {
    let handler: Handler = (request, response) => reply(200, forumAnswer(sevenDiscussions), jsonApi)(request, response)
    const server = await serve((request, response) => handler(request, response))
    const feed = await addForum(server)
    const fetcher = fetcherFor(servers)

    await importFeed(database.db, fetcher, feed, firstRun)
    const before = await discussionsInDatabase()

    handler = broken

    await importFeed(database.db, fetcher, feed, secondRun)

    expect(await discussionsInDatabase()).toEqual(before)
  })

  it('reports a discussion it skips, and keeps the others', async () => {
    const answer = JSON.parse(forumAnswer(sevenDiscussions))

    answer.data[4].attributes.title = ''

    const server = await serve(JSON.stringify(answer))
    const feed = await addForum(server)

    const report = await importFeed(database.db, fetcherFor(servers), feed, firstRun)

    expect(report).toMatchObject({
      added: 4,
      kind: 'imported',
      skipped: [{ position: 5, reason: 'there is no title' }],
    })
  })
})

describe('the import of a forum in the log and the health of the feeds', () => {
  it('writes the outcome in the log of the run and the health of the feed, like any other feed', async () => {
    const server = await serve(forumAnswer(sevenDiscussions))
    const feed = await addForum(server)
    const runId = await startRun(database.db, firstRun)

    await importFeeds(database.db, fetcherFor(servers), { clock: () => firstRun, runId })

    const [result] = await database.db.select().from(importResults).where(eq(importResults.feedId, feed.id))
    const [health] = await database.db.select().from(feeds).where(eq(feeds.id, feed.id))

    expect(result).toMatchObject({ added: 5, feedId: feed.id, outcome: 'imported', runId, skipped: 0 })
    expect(health).toMatchObject({ failuresInARow: 0, lastSuccessAt: firstRun })
  })

  it('counts a failed run, and calls the forum unhealthy after three, as with any other feed', async () => {
    const server = await serve(reply(500, 'Kapot', jsonApi))
    const feed = await addForum(server)
    const lines: string[] = []

    for (let run = 0; run < 3; run++) {
      const runId = await startRun(database.db, firstRun)

      await importFeeds(database.db, fetcherFor(servers), { clock: () => firstRun, runId })
      await database.pool.query('UPDATE feeds SET retry_at = NULL')
    }

    expect(await showStatus(database.url, { clock: () => firstRun, write: (line) => lines.push(line) })).toBe(1)
    expect(lines.join('\n')).toContain('Testforum: unhealthy')
    expect(lines.join('\n')).toContain(`feed: ${feed.url}`)
  })

  it('does not read a forum that is switched off, and the command takes its lock like for every feed', async () => {
    const server = await serve(forumAnswer(sevenDiscussions))

    await addForum(server, { enabled: false })

    const lines: string[] = []
    const code = await runImport(database.url, {
      clock: () => firstRun,
      makeFetcher: (robots) => fetcherFor(servers, { robots }),
      write: (line) => lines.push(line),
    })

    expect(code).toBe(0)
    expect(await discussionsInDatabase()).toEqual([])
    expect(server.requests).toHaveLength(0)
  })

  it('runs as part of the import command: robots.txt first, then the discussions, in the lines of the output', async () => {
    const server = await serve(forumAnswer(sevenDiscussions))

    await addForum(server)

    const lines: string[] = []
    const code = await runImport(database.url, {
      clock: () => firstRun,
      makeFetcher: (robots) => fetcherFor(servers, { robots }),
      write: (line) => lines.push(line),
    })

    expect(code).toBe(0)
    expect(lines).toEqual([`${server.origin}${discussionsPath}: 5 new, 0 updated, 0 unchanged, 0 skipped`])
    expect(server.paths()).toEqual(['/robots.txt', discussionsPath])
    expect(await discussionsInDatabase()).toHaveLength(5)
  })
})

async function addedFeed(id: number) {
  const [feed] = await database.db.select().from(feeds).where(eq(feeds.id, id))

  if (feed === undefined) {
    throw new Error(`There is no feed ${id}`)
  }

  return feed
}
