import type { TestDatabase } from '@fansite/db/test-database'

import { matchChanges, matches, matchImports, players, squadImports } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { endedSeasonOf, importEndedSeason, rereadEveryMs } from './import-ended-season.ts'
import { runImport } from './import-feeds.ts'
import { squadPageTitle } from './read-squad.ts'
import { pageTitles, pageUrl } from './read-wikipedia.ts'
import { articleRoutes } from './test-articles.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

const wiki = { 'Content-Type': 'text/x-wiki; charset=UTF-8', 'Last-Modified': 'Fri, 29 May 2026 08:00:00 GMT' }

type Pages = { cup: string; programme: string; standings: string }

/** The pages of 2025/26, the season that ends on 30 June 2026. */
const ended: Pages = {
  cup: fixture('wikipedia-season-cup.wiki'),
  programme: fixture('wikipedia-season-programme.wiki'),
  standings: fixture('wikipedia-season-standings.wiki'),
}

/** The pages of 2026/27, the season after it. */
const next: Pages = {
  cup: fixture('wikipedia-cup.wiki'),
  programme: fixture('wikipedia-programme.wiki'),
  standings: fixture('wikipedia-standings.wiki'),
}

const squad = fixture('wikipedia-squad.wiki')

/** The first match of the season starts half an hour later: a change that overwrites. */
const corrected = { ...ended, programme: ended.programme.replace('|time = 20:00 uur', '|time = 20:30 uur') }

const season = '2025/26'

/** The first moment of the season after it, in UTC like the day a season starts on. */
const firstOfJuly = new Date('2026-07-01T00:00:00Z')

const hour = 60 * 60 * 1000

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
  for (const table of [
    'match_changes',
    'matches',
    'player_season_stats',
    'players',
    'persons',
    'league_results',
    'standings',
    'squad_completeness',
    'wikipedia_pages',
    'match_imports',
    'squad_imports',
  ]) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

/** Reads the season that has ended at a moment, and gives the lines, one per line of text. */
async function rereadAt(server: TestServer, at: Date) {
  const lines = await importEndedSeason(database.db, fetcherFor([server]), {
    clock: () => at,
    englishOrigin: server.origin,
    origin: server.origin,
  })

  return lines.flatMap((line) => line.split('\n'))
}

/** The requests for pages of the seasons so far, not those for robots.txt and club articles. */
function seasonRequests(server: TestServer) {
  return server.paths().filter((path) => path?.includes('seizoen') || path?.includes('Eredivisie'))
}

/** Serves the match pages of these seasons, and the squad page of those that have one. */
async function serve(seasons: Record<string, { pages: Pages; squad?: string }>, extra: Record<string, Handler> = {}) {
  const routes: Record<string, Handler> = { '/robots.txt': reply(200, '', { 'Content-Type': 'text/plain' }) }
  const texts: string[] = []

  for (const [forSeason, { pages, squad: squadPage }] of Object.entries(seasons)) {
    for (const kind of ['cup', 'programme', 'standings'] as const) {
      routes[pageUrl('', pageTitles(forSeason)[kind])] = reply(200, pages[kind], wiki)
    }
    if (squadPage !== undefined) {
      routes[pageUrl('', squadPageTitle(forSeason))] = reply(200, squadPage, wiki)
    }

    texts.push(...Object.values(pages), squadPage ?? '')
  }

  const server = await startServer({ ...articleRoutes(texts), ...routes, ...extra })

  servers.push(server)

  return server
}

const healthOf = async (forSeason: string) => ({
  matches: (await database.db.select().from(matchImports).where(eq(matchImports.season, forSeason)))[0],
  squad: (await database.db.select().from(squadImports).where(eq(squadImports.season, forSeason)))[0],
})

describe('the season that has just ended', () => {
  it('is the season before, from 1 July up to and including 31 August', () => {
    expect(endedSeasonOf(new Date('2026-07-01T00:00:00Z'))).toBe('2025/26')
    expect(endedSeasonOf(new Date('2026-07-31T12:00:00Z'))).toBe('2025/26')
    expect(endedSeasonOf(new Date('2026-08-01T00:00:00Z'))).toBe('2025/26')
    expect(endedSeasonOf(new Date('2026-08-31T23:59:59.999Z'))).toBe('2025/26')
    expect(endedSeasonOf(new Date('2027-07-01T00:00:00Z'))).toBe('2026/27')
  })

  it('is none before 1 July and from 1 September on', () => {
    // The last moment of the season itself: it is still the current one.
    expect(endedSeasonOf(new Date('2026-06-30T23:59:59.999Z'))).toBeUndefined()
    expect(endedSeasonOf(new Date('2026-09-01T00:00:00Z'))).toBeUndefined()
    expect(endedSeasonOf(new Date('2026-11-09T12:00:00Z'))).toBeUndefined()
    expect(endedSeasonOf(new Date('2027-01-01T00:00:00Z'))).toBeUndefined()
  })

  it('turns with the days of UTC, like the season, and not with the clock in the Netherlands', () => {
    // 1 July, half past midnight in Amsterdam: the season has not turned yet, so 2025/26 is
    // still the current season and no season before it is read.
    expect(endedSeasonOf(new Date('2026-06-30T22:30:00Z'))).toBeUndefined()
    // 1 September, half past midnight in Amsterdam: still 31 August in UTC.
    expect(endedSeasonOf(new Date('2026-08-31T22:30:00Z'))).toBe('2025/26')
  })

  it('writes the second year with two digits at the turn of the century', () => {
    expect(endedSeasonOf(new Date('2100-07-15T12:00:00Z'))).toBe('2099/00')
  })
})

describe('the weekly read of the season that has just ended', () => {
  it('reads the matches on 1 July with the checks of the command, and waits a week', async () => {
    const server = await serve({ [season]: { pages: ended } })

    const lines = await rereadAt(server, firstOfJuly)

    expect(lines).toContain(
      'Matches 2025/26: 38 new, 0 updated, 0 unchanged, 0 removed; table of 18 clubs for 2026-05-17',
    )
    expect(lines).toContain('Squad 2025/26: no squad page on Wikipedia, so no squad')
    expect(await database.db.select().from(matches).where(eq(matches.season, season))).toHaveLength(38)
    expect(await healthOf(season)).toMatchObject({
      matches: { lastOutcome: 'imported', retryAt: new Date(firstOfJuly.getTime() + rereadEveryMs) },
      squad: { retryAt: new Date(firstOfJuly.getTime() + rereadEveryMs) },
    })
  })

  it('asks nothing and says nothing within the week, and reads again once the week is over', async () => {
    const server = await serve({ [season]: { pages: ended } })

    await rereadAt(server, firstOfJuly)

    const asked = seasonRequests(server).length

    expect(asked).toBeGreaterThan(0)
    expect(await rereadAt(server, new Date(firstOfJuly.getTime() + hour))).toEqual([])
    expect(await rereadAt(server, new Date(firstOfJuly.getTime() + rereadEveryMs - 1))).toEqual([])
    expect(seasonRequests(server)).toHaveLength(asked)

    const again = await rereadAt(server, new Date(firstOfJuly.getTime() + rereadEveryMs))

    expect(again).toContain(
      'Matches 2025/26: 0 new, 0 updated, 38 unchanged, 0 removed; table of 18 clubs for 2026-05-17',
    )
    expect(seasonRequests(server)).toHaveLength(asked * 2)
  })

  it('waits for the pause the hourly import left on 30 June before the first read', async () => {
    const server = await serve({ [season]: { pages: ended } })
    const retryAt = new Date(firstOfJuly.getTime() + hour / 2)

    await database.db.insert(matchImports).values({ lastOutcome: 'imported', retryAt, season })
    await database.db.insert(squadImports).values({ lastOutcome: 'imported', retryAt, season })

    expect(await rereadAt(server, firstOfJuly)).toEqual([])
    expect(seasonRequests(server)).toEqual([])
    expect(await rereadAt(server, retryAt)).not.toEqual([])
  })

  it('asks nothing on 30 June, when the season is still the current one', async () => {
    const server = await serve({ [season]: { pages: ended } })

    expect(await rereadAt(server, new Date('2026-06-30T23:59:59Z'))).toEqual([])
    expect(server.requests).toEqual([])
    expect(await healthOf(season)).toEqual({ matches: undefined, squad: undefined })
    expect(await healthOf('2024/25')).toEqual({ matches: undefined, squad: undefined })
  })

  it('still reads on 31 August, and no more from 1 September on', async () => {
    const server = await serve({ [season]: { pages: ended } })

    expect(await rereadAt(server, new Date('2026-08-31T23:59:59Z'))).toContain(
      'Matches 2025/26: 38 new, 0 updated, 0 unchanged, 0 removed; table of 18 clubs for 2026-05-17',
    )

    const asked = server.requests.length

    // Long after the week is over: the pause is not what stops it.
    expect(await rereadAt(server, new Date('2026-09-01T00:00:00Z'))).toEqual([])
    expect(await rereadAt(server, new Date('2026-09-15T12:00:00Z'))).toEqual([])
    expect(await rereadAt(server, new Date('2027-06-30T23:59:59Z'))).toEqual([])
    expect(server.requests).toHaveLength(asked)
  })

  it('brings a correction in by itself: held in the first week, taken over in the next', async () => {
    await rereadAt(await serve({ [season]: { pages: ended } }), firstOfJuly)

    const server = await serve({ [season]: { pages: corrected } })
    const held = await rereadAt(server, new Date(firstOfJuly.getTime() + rereadEveryMs))

    expect(held.join('\n')).toContain('0 new, 0 updated, 37 unchanged, 0 removed, 1 held;')
    expect(await database.db.select().from(matchChanges)).toMatchObject([{ season, status: 'pending' }])

    await rereadAt(server, new Date(firstOfJuly.getTime() + 2 * rereadEveryMs))

    expect(await database.db.select().from(matches).where(eq(matches.round, 'Speelronde 1'))).toMatchObject([
      { kickoffAt: new Date('2025-08-09T18:30:00Z') },
    ])
    expect(await database.db.select().from(matchChanges)).toMatchObject([{ resolution: 'stood', status: 'accepted' }])
  })

  it('reads the squad of a season the hourly import read, from its squad table', async () => {
    const server = await serve({ '2026/27': { pages: next, squad } })
    const at = new Date('2027-07-01T00:00:00Z')

    const lines = await rereadAt(server, at)

    expect(lines).toContain('Squad 2026/27: 25 new, 0 improved, 0 unchanged, from 1 page')
    expect(await database.db.select().from(players).where(eq(players.season, '2026/27'))).toHaveLength(25)
    expect((await healthOf('2026/27')).squad).toMatchObject({
      lastOutcome: 'imported',
      retryAt: new Date(at.getTime() + rereadEveryMs),
    })

    const asked = server.requests.length

    expect(await rereadAt(server, new Date(at.getTime() + hour))).toEqual([])
    expect(server.requests).toHaveLength(asked)
    expect(await rereadAt(server, new Date(at.getTime() + rereadEveryMs))).toContain(
      'Squad 2026/27: 0 new, 0 improved, 25 unchanged, from 1 page',
    )
  })

  it('makes a warning of a page that fails a check, keeps the rows, and reads the squad anyway', async () => {
    await rereadAt(await serve({ [season]: { pages: ended } }), firstOfJuly)

    const before = await database.db.select().from(matches).where(eq(matches.season, season))
    const broken = await serve({ [season]: { pages: { ...ended, programme: 'Geen wedstrijden meer.' } } })
    const at = new Date(firstOfJuly.getTime() + rereadEveryMs)

    const lines = await rereadAt(broken, at)

    expect(lines[0]).toMatch(/^Matches 2025\/26: warning, nothing changed and the last good copy stays: /u)
    expect(lines).toContain('Squad 2025/26: no squad page on Wikipedia, so no squad')
    expect(await database.db.select().from(matches).where(eq(matches.season, season))).toEqual(before)
    // A page that fails a check today fails it in an hour too: the next read is a week later.
    expect((await healthOf(season)).matches).toMatchObject({
      failuresInARow: 1,
      lastOutcome: 'error',
      retryAt: new Date(at.getTime() + rereadEveryMs),
    })
  })

  it('keeps the shorter pause when Wikipedia asks us to wait: nothing was read', async () => {
    const server = await serve(
      { [season]: { pages: ended } },
      { [pageUrl('', pageTitles(season).programme)]: reply(429, 'Te druk', { 'Retry-After': '120' }) },
    )

    const lines = await rereadAt(server, firstOfJuly)

    expect(lines[0]).toBe('Matches 2025/26: not read, Wikipedia asks us to wait 120 seconds')
    expect((await healthOf(season)).matches).toMatchObject({
      lastOutcome: 'wait',
      retryAt: new Date(firstOfJuly.getTime() + 120_000),
    })
  })
})

describe('the hourly import in July and August', () => {
  async function run(server: TestServer, at: Date) {
    const lines: string[] = []
    const code = await runImport(database.url, {
      clock: () => at,
      englishOrigin: server.origin,
      makeFetcher: (robots) => fetcherFor([server], { robots }),
      wikidataOrigin: null,
      wikipediaOrigin: server.origin,
      write: (line) => lines.push(line),
    })

    return { code, lines: lines.flatMap((line) => line.split('\n')) }
  }

  it('reads the season that has ended after the current one, in the same run', async () => {
    const server = await serve({ '2026/27': { pages: next, squad }, [season]: { pages: ended } })

    const { code, lines } = await run(server, firstOfJuly)
    const heads = lines.filter((line) => /^(Matches|Squad) \d{4}\/\d{2}: \d+ new/u.test(line))

    expect(code).toBe(0)
    expect(heads.map((line) => line.slice(0, line.indexOf(':')))).toEqual([
      'Matches 2026/27',
      'Squad 2026/27',
      'Matches 2025/26',
    ])
    expect(await database.db.select().from(matches).where(eq(matches.season, season))).toHaveLength(38)
  })

  it('stays a run that worked when the season that has ended fails: a warning, and the current season is stored', async () => {
    const server = await serve({
      '2026/27': { pages: next, squad },
      [season]: { pages: { ...ended, programme: 'Geen wedstrijden meer.' } },
    })

    const { code, lines } = await run(server, firstOfJuly)

    expect(code).toBe(0)
    expect(lines.some((line) => line.startsWith('Matches 2025/26: warning, nothing changed'))).toBe(true)
    expect(lines.some((line) => line.startsWith('Matches 2026/27: 35 new'))).toBe(true)
    expect(await healthOf('2026/27')).toMatchObject({
      matches: { failuresInARow: 0, lastOutcome: 'imported' },
      squad: { failuresInARow: 0, lastOutcome: 'imported' },
    })
    expect(await database.db.select().from(matches).where(eq(matches.season, season))).toEqual([])
  })

  it('reads the current season only from 1 September on', async () => {
    const server = await serve({ '2026/27': { pages: next, squad }, [season]: { pages: ended } })

    const { code, lines } = await run(server, new Date('2026-09-01T00:00:00Z'))

    expect(code).toBe(0)
    expect(lines.join('\n')).not.toContain('2025/26')
    expect(await healthOf(season)).toEqual({ matches: undefined, squad: undefined })
  })
})
