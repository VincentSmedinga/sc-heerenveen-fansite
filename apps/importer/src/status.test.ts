import type { TestDatabase } from '@fansite/db/test-database'

import { feeds, sources, squadCompleteness } from '@fansite/db/schema'
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
  await database.pool.query('DELETE FROM persons')
  await database.pool.query('DELETE FROM wikidata_items')
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
    wikipediaOrigin: null,
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
        '',
        'Matches 2026/27 (Wikipedia): not read yet',
        '',
        'Squad 2026/27 (Wikipedia): not read yet',
        '',
        'Completeness of the squad 2026/27: not calculated yet',
        '',
        'Person names: 0 from a sort key, 0 guessed, 0 from the list, 0 without a name',
        'Persons that look alike: 0',
        'Persons from Wikidata: 0 of 0 read, 0 to go',
        '  with a Q-number: 0, with a birth date: 0, with a nationality: 0',
        '  line: 0 from Wikidata, 0 from the squad, 0 from the list, 0 without',
      ],
    })
  })

  it('shows the chance that the squad of the current season is whole, and warns when the table of the selection says less than almost', async () => {
    const row = {
      bestSource: 'selectie' as const,
      calculatedAt: start,
      checks: [
        {
          detail: 'the list has 12 players, a squad has 20 or more',
          name: 'size' as const,
          outcome: 'failed' as const,
        },
      ],
      level: 'weinig' as const,
      playerCount: 12,
      probability: 20,
      season: '2026/27',
    }

    await database.db
      .insert(squadCompleteness)
      .values([row, { ...row, level: 'compleet', probability: 95, season: '2025/26' }])

    const { code, lines } = await statusAt(start)

    expect(code).toBe(0)
    expect(lines).toContain(
      'Completeness of the squad 2026/27: 20% weinig, 12 players, best source selectie, calculated 2026-10-22 10:07:00 UTC',
    )
    expect(lines).toContain(
      '  warning: the table of the selection should hold the whole squad, but the chance is weinig: the list has 12 players, a squad has 20 or more',
    )
    expect(lines.filter((line) => line.startsWith('Completeness'))).toHaveLength(1)

    await database.db.update(squadCompleteness).set({ level: 'bijna', probability: 60 })

    expect((await statusAt(start)).lines.some((line) => line.includes('warning: the table'))).toBe(false)
    await database.db.delete(squadCompleteness)
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
        '',
        'Matches 2026/27 (Wikipedia): not read yet',
        '',
        'Squad 2026/27 (Wikipedia): not read yet',
        '',
        'Completeness of the squad 2026/27: not calculated yet',
        '',
        'Person names: 0 from a sort key, 0 guessed, 0 from the list, 0 without a name',
        'Persons that look alike: 0',
        'Persons from Wikidata: 0 of 0 read, 0 to go',
        '  with a Q-number: 0, with a birth date: 0, with a nationality: 0',
        '  line: 0 from Wikidata, 0 from the squad, 0 from the list, 0 without',
      ],
    })
  })

  it('shows how many persons are read from Wikidata and what they have', async () => {
    await database.pool.query("INSERT INTO wikidata_items (id, label) VALUES ('Q29999', 'Nederland')")
    await database.pool.query(
      `INSERT INTO persons (wikipedia_page, wikidata_id, birth_date, birth_date_precision, line, line_source, wikidata_read_at)
       VALUES ('A', 'Q1', '1990-01-01', 'year', 'doelman', 'wikidata', ?),
              ('B', NULL, NULL, NULL, NULL, NULL, ?),
              ('C', NULL, NULL, NULL, NULL, NULL, NULL)`,
      [start, start],
    )
    await database.pool.query(
      "INSERT INTO person_nationalities (person_id, position, item_id) SELECT id, 0, 'Q29999' FROM persons WHERE wikipedia_page = 'A'",
    )

    expect((await statusAt(start)).lines.slice(-3)).toEqual([
      'Persons from Wikidata: 2 of 3 read, 1 to go',
      '  with a Q-number: 1, with a birth date: 1, with a nationality: 1',
      '  line: 1 from Wikidata, 0 from the squad, 0 from the list, 2 without',
    ])
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
        [
          'feeds',
          'import_runs',
          'import_results',
          'items',
          'match_changes',
          'match_imports',
          'matches',
          'players',
          'robots_txt',
          'sources',
          'squad_imports',
          'standings',
          'wikipedia_pages',
        ].map(async (table) => (await database.pool.query(`SELECT * FROM ${table}`))[0]),
      )
    const before = await everything()

    // Long after the last run, when a run would have removed old runs and tried the feed again.
    await statusAt(after(60 * 24 * 40))

    expect(await everything()).toEqual(before)
  })
})
