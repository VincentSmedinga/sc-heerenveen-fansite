import type { TestDatabase } from '@fansite/db/test-database'

import { feeds, sources } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { runImport } from './import-feeds.ts'
import { showStatus } from './status.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

const start = new Date('2026-10-22T10:07:00Z')

const feed =
  '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Een feed</title>' +
  '<item><title>Kop</title><link>https://krant.test/g1</link><guid>g1</guid></item></channel></rss>'

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
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

/**
 * Starts a web server with a feed at `/rss/`, and puts it in the register under a source with
 * this name.
 */
async function addFeed(name: string, handler: Handler, { enabled = true } = {}) {
  const server = await startServer({ '/rss/': handler })

  servers.push(server)

  const [source] = await database.db
    .insert(sources)
    .values({ domain: `${name.toLowerCase()}.test`, enabled, kind: 'news', name })
    .$returningId()

  await database.db.insert(feeds).values({ sourceId: source?.id ?? 0, url: `${server.origin}/rss/` })

  return `${server.origin}/rss/`
}

function after(minutes: number) {
  return new Date(start.getTime() + minutes * 60 * 1000)
}

async function importAt(now: Date) {
  await runImport(database.url, {
    clock: () => now,
    makeFetcher: (robots) => fetcherFor(servers, { robots }),
    write: () => undefined,
  })
}

async function statusAt(now: Date) {
  const lines: string[] = []
  const code = await showStatus(database.url, { clock: () => now, write: (line) => lines.push(line) })

  return { code, lines }
}

describe('the overview', () => {
  it('shows a broken feed as unhealthy after three runs, next to a feed that works, and exits with 1', async () => {
    const good = await addFeed('Krant', reply(200, feed, { 'Content-Type': 'text/xml' }))
    const broken = await addFeed('Kapot', reply(500, 'Kapot'))

    for (const minutes of [0, 15, 30]) {
      await importAt(after(minutes))
    }

    expect(await statusAt(after(31))).toEqual({
      code: 1,
      lines: [
        'Last run: started 2026-10-22 10:37:00 UTC, finished 2026-10-22 10:37:00 UTC',
        '',
        'Krant: healthy',
        `  feed: ${good}`,
        '  last success: 2026-10-22 10:37:00 UTC',
        '  failed runs in a row: 0',
        '  last error: none',
        '',
        'Kapot: unhealthy',
        `  feed: ${broken}`,
        '  last success: never',
        '  failed runs in a row: 3',
        '  last error: 2026-10-22 10:37:00 UTC, HTTP 500',
        '  next try from: 2026-10-22 11:36:00 UTC',
        '',
        'Unhealthy feeds: 1 of 2',
      ],
    })
  })

  it('exits with 0 when every feed is healthy, also after a failure or two', async () => {
    await addFeed('Kapot', reply(500, 'Kapot'))

    await importAt(start)
    await importAt(after(15))

    const { code, lines } = await statusAt(after(16))

    expect(code).toBe(0)
    expect(lines).toContain('Kapot: healthy')
    expect(lines).toContain('  failed runs in a row: 2')
  })

  it('leaves out the feeds of a source that is switched off', async () => {
    await addFeed('Uit', reply(500, 'Kapot'), { enabled: false })

    expect(await statusAt(start)).toEqual({
      code: 0,
      lines: [
        'Last run: none yet',
        'There are no feeds: no source that is switched on has a feed. See `pnpm db:seed`.',
      ],
    })
  })

  it('says when the last run has not finished', async () => {
    await database.pool.query('INSERT INTO import_runs (started_at) VALUES (?)', [start])

    expect((await statusAt(start)).lines[0]).toBe('Last run: started 2026-10-22 10:07:00 UTC, not finished')
  })

  it('changes nothing in the database', async () => {
    await addFeed('Kapot', reply(500, 'Kapot'))
    for (const minutes of [0, 15, 30]) {
      await importAt(after(minutes))
    }

    const everything = async () =>
      Promise.all(
        ['feeds', 'import_runs', 'import_results', 'items', 'robots_txt', 'sources'].map(
          async (table) => (await database.pool.query(`SELECT * FROM ${table}`))[0],
        ),
      )
    const before = await everything()

    // Long after the last run, when a run would have removed old runs and tried the feed again.
    await statusAt(after(60 * 24 * 40))

    expect(await everything()).toEqual(before)
  })
})
