import type { TestDatabase } from '@fansite/db/test-database'

import { feeds, matches, players, sources, squadImports, wikipediaPages } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { runImport } from './import-feeds.ts'
import { formatSquadReport, importSquad } from './import-squad.ts'
import { squadPageTitle } from './read-squad.ts'
import { pageTitles, pageUrl } from './read-wikipedia.ts'
import { showStatus } from './status.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

const wiki = { 'Content-Type': 'text/x-wiki; charset=UTF-8', 'Last-Modified': 'Sat, 17 Oct 2026 07:23:24 GMT' }

/** Sunday 25 October 2026. */
const first = new Date('2026-10-25T12:00:00Z')

const hours = (count: number) => count * 60 * 60 * 1000

const season = '2026/27'

const original = fixture('wikipedia-squad.wiki')

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
    'players',
    'squad_imports',
    'wikipedia_pages',
    'matches',
    'standings',
    'match_imports',
    'sources',
  ]) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

/** Runs the squad import at this moment against this server. */
function importAt(server: TestServer, at: Date) {
  return importSquad(database.db, fetcherFor([server]), { clock: () => at, origin: server.origin })
}

/** The requests for pages so far; the robots.txt is not counted. */
function pageRequests(server: TestServer) {
  return server.paths().filter((path) => path !== '/robots.txt')
}

/**
 * Starts a web server on this computer that serves the squad page of the seasons as Wikipedia
 * does, from `squad`, which a test can change between runs. With `matchPages` it serves the
 * pages of the matches too. The tests ask no real site.
 */
async function serve(squad: null | string = original, { matchPages = false, robots = '' } = {}) {
  const current = { squad }
  const routes: Record<string, Handler> = { '/robots.txt': reply(200, robots, { 'Content-Type': 'text/plain' }) }

  for (const year of ['2026/27', '2027/28']) {
    routes[pageUrl('', squadPageTitle(year))] = (_request, response) => {
      response.writeHead(current.squad === null ? 404 : 200, wiki)
      response.end(current.squad ?? 'Niet gevonden')
    }
  }
  if (matchPages) {
    const pages = pageTitles(season)

    routes[pageUrl('', pages.cup)] = reply(200, fixture('wikipedia-cup.wiki'), wiki)
    routes[pageUrl('', pages.programme)] = reply(200, fixture('wikipedia-programme.wiki'), wiki)
    routes[pageUrl('', pages.standings)] = reply(200, fixture('wikipedia-standings.wiki'), wiki)
  }

  const server = await startServer(routes)

  servers.push(server)

  return { page: current, server }
}

/** Everything the import writes, to see that a failing run changed none of it. */
async function snapshot() {
  return {
    pages: await database.db.select().from(wikipediaPages).orderBy(asc(wikipediaPages.title)),
    players: await database.db.select().from(players).orderBy(asc(players.id)),
  }
}

/** The page without the rows of these players, by name. A row starts at its `|-` line. */
function without(text: string, ...names: string[]) {
  return text
    .split(/(?=^\|-)/mu)
    .filter((row) => !names.some((name) => row.includes(`[[${name}]]`)))
    .join('')
}

describe('the first import, into an empty database', () => {
  it('stores the players of the table with a search term, and the page it read', async () => {
    const { server } = await serve()

    const report = await importAt(server, first)

    expect(report).toEqual({
      kind: 'imported',
      players: { added: 25, removed: 0, unchanged: 0, updated: 0 },
      season,
      warnings: [],
    })
    expect(formatSquadReport(report)).toBe('Squad 2026/27: 25 new, 0 updated, 0 unchanged, 0 removed')

    const stored = await database.db.select().from(players).orderBy(asc(players.id))

    expect(stored).toHaveLength(25)
    expect(stored.every((player) => player.season === season)).toBe(true)
    expect(stored[0]).toMatchObject({
      name: 'Bernt Klaverboer',
      position: 'doelman',
      searchTerm: 'Klaverboer',
      shirtNumber: 22,
    })
    expect(stored.find((player) => player.name === 'Sten Kremers')).toMatchObject({
      position: 'doelman',
      searchTerm: 'Kremers',
      shirtNumber: null,
    })
    expect(new Set(stored.map((player) => player.position))).toEqual(
      new Set(['aanvaller', 'doelman', 'middenvelder', 'verdediger']),
    )
    expect(await database.db.select().from(wikipediaPages)).toEqual([
      {
        kind: 'squad',
        readAt: first,
        season,
        title: 'Sc Heerenveen in het seizoen 2026/27 (mannen)',
        version: wiki['Last-Modified'],
      },
    ])
  })

  it('fetches only /wiki/<page>?action=raw, once, with the user agent of the importer', async () => {
    const { server } = await serve()

    await importAt(server, first)

    expect(pageRequests(server)).toEqual(['/wiki/Sc_Heerenveen_in_het_seizoen_2026/27_(mannen)?action=raw'])
    expect(String(server.requests[0]?.headers['user-agent'])).toMatch(
      /^scHeerenveenFansite\/.+ \(\+https:\/\/github\.com\//u,
    )
  })

  it('records the health of the import', async () => {
    const { server } = await serve()

    await importAt(server, first)

    expect(await database.db.select().from(squadImports)).toEqual([
      {
        failuresInARow: 0,
        lastError: null,
        lastErrorAt: null,
        lastOutcome: 'imported',
        lastSuccessAt: first,
        lastWarning: null,
        lastWarningAt: null,
        retryAt: new Date(first.getTime() + 59 * 60 * 1000),
        season,
      },
    ])
  })

  it('stores a name that Wikipedia writes with a disambiguation without it', async () => {
    const { server } = await serve(original.replace('[[Dylan Vente]]', '[[Dylan Vente (voetballer)]]'))

    await importAt(server, first)

    expect(await database.db.select().from(players).where(eq(players.name, 'Dylan Vente'))).toMatchObject([
      { searchTerm: 'Vente' },
    ])
  })
})

describe('reading again', () => {
  it('reads at most once an hour, and then finds nothing changed', async () => {
    const { server } = await serve()

    await importAt(server, first)

    const early = await importAt(server, new Date(first.getTime() + 30 * 60 * 1000))

    expect(early).toMatchObject({ kind: 'postponed', retryAt: new Date(first.getTime() + 59 * 60 * 1000) })
    expect(pageRequests(server)).toHaveLength(1)

    const later = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(later).toMatchObject({ kind: 'imported', players: { added: 0, removed: 0, unchanged: 25, updated: 0 } })
    expect(pageRequests(server)).toHaveLength(2)
    expect(await database.db.select().from(players)).toHaveLength(25)
  })

  it('replaces the squad: a player who left disappears, a new one comes, a new number is taken over', async () => {
    const { page, server } = await serve()

    await importAt(server, first)

    const before = await database.db.select().from(players).where(eq(players.name, 'Dirk Proper'))

    // Marko Farji leaves, Pim Verbeek arrives and Dirk Proper changes his number.
    page.squad = without(original, 'Marko Farji')
      .replace(
        '\n|}',
        "\n|-\n|'''30'''||{{NL-VLAG}}|| align=\"left\" |[[Pim Verbeek]]||2028||0||0||0||0||0||0||'''0'''||'''0'''||'''0'''\n|}",
      )
      .replace(
        "|'''6'''\n|{{NL-VLAG}}\n| align=\"left\" |[[Dirk Proper]]",
        "|'''8'''\n|{{NL-VLAG}}\n| align=\"left\" |[[Dirk Proper]]",
      )

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ kind: 'imported', players: { added: 1, removed: 1, unchanged: 23, updated: 1 } })

    const names = (await database.db.select().from(players)).map((player) => player.name)

    expect(names).not.toContain('Marko Farji')
    expect(names).toContain('Pim Verbeek')
    expect(await database.db.select().from(players).where(eq(players.name, 'Dirk Proper'))).toMatchObject([
      { id: before[0]?.id, shirtNumber: 8 },
    ])
  })

  it('keeps the search term of a player that is known, so a correction survives', async () => {
    const { server } = await serve()

    await importAt(server, first)
    await database.db.update(players).set({ searchTerm: 'Vente (Dylan)' }).where(eq(players.name, 'Dylan Vente'))
    await importAt(server, new Date(first.getTime() + hours(1)))

    expect((await database.db.select().from(players).where(eq(players.name, 'Dylan Vente')))[0]?.searchTerm).toBe(
      'Vente (Dylan)',
    )
  })

  it('treats a name that differs only in an accent as the same player', async () => {
    const { page, server } = await serve()

    await importAt(server, first)
    page.squad = original.replace('[[Luca Oyen]]', '[[Luca Öyen]]')

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ kind: 'imported', players: { added: 0, removed: 0, unchanged: 24, updated: 1 } })
    expect(await database.db.select().from(players)).toHaveLength(25)
    expect(await database.db.select().from(players).where(eq(players.shirtNumber, 11))).toMatchObject([
      { name: 'Luca Öyen', searchTerm: 'Oyen' },
    ])
  })
})

describe('a read that fails a check or a page that has changed', () => {
  const failures: [string, (text: string) => string, string][] = [
    [
      'the table is gone',
      (text) => text.replace('=== Spelers ===', '=== Selectie ==='),
      'the squad page has no table under the heading Spelers',
    ],
    [
      'a group heading we do not know',
      (text) => text.replace('|Middenvelders', '|Trainers'),
      "the squad table has a heading we do not know: 'Trainers'",
    ],
    [
      'a shirt number we do not know',
      (text) => text.replace("|'''22'''||", "|'''een'''||"),
      "Bernt Klaverboer has a shirt number we do not know: 'een'",
    ],
    [
      'fewer than 18 players',
      (text) =>
        without(
          text,
          'Mats Egbring',
          'Darling Bladi',
          'Jimte Scholten',
          'Oliver Braude',
          'Levi Smans',
          'Marcus Linday',
          'Luca Oyen',
          'Marko Farji',
        ),
      'the squad has 17 players, not 18 to 45',
    ],
    [
      'one goalkeeper only',
      (text) => without(text, 'Timo Schreuder', 'Andries Noppert', 'Sten Kremers'),
      'the squad has 1 goalkeeper, not at least 2',
    ],
    [
      'no forwards',
      (text) => text.replace('|Aanvallers', '|Aanvallers\n|-\n! colspan="13" align="left" |Doelmannen'),
      'the squad has no aanvaller',
    ],
    [
      'a name twice',
      (text) => text.replace('[[Maas Willemsen]]', '[[Sam Kersten]]'),
      'the name Sam Kersten is in the squad twice',
    ],
  ]

  it.each(failures)(
    'leaves the last good squad, writes a warning with the reason and counts the failure: %s',
    async (_name, change, reason) => {
      const { page, server } = await serve()

      await importAt(server, first)

      const before = await snapshot()

      page.squad = change(original)

      const report = await importAt(server, new Date(first.getTime() + hours(1)))

      expect(report.kind).toBe('error')
      expect(formatSquadReport(report)).toContain(
        'Squad 2026/27: warning, nothing changed and the last good copy stays: ',
      )
      expect(formatSquadReport(report)).toContain(reason)
      expect(await snapshot()).toEqual(before)
      expect((await database.db.select().from(squadImports))[0]).toMatchObject({
        failuresInARow: 1,
        lastOutcome: 'error',
        lastSuccessAt: first,
      })
    },
  )

  it('leaves the last good squad when the page cannot be read', async () => {
    const { page, server } = await serve()

    await importAt(server, first)

    const before = await snapshot()

    page.squad = null

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ kind: 'error', message: expect.stringContaining('HTTP 404') })
    expect(await snapshot()).toEqual(before)
  })

  it('writes nothing in an empty database either', async () => {
    const { server } = await serve('Een kale pagina')

    expect(await importAt(server, first)).toMatchObject({ kind: 'error' })
    expect(await snapshot()).toEqual({ pages: [], players: [] })
  })

  it('does not read a page that robots.txt closes, and counts no failure', async () => {
    const { server } = await serve(original, { robots: 'User-agent: *\nDisallow: /wiki/' })

    const report = await importAt(server, first)

    expect(report).toMatchObject({ kind: 'blocked-by-robots' })
    expect(pageRequests(server)).toEqual([])
    expect(await database.db.select().from(players)).toEqual([])
    expect((await database.db.select().from(squadImports))[0]).toMatchObject({
      failuresInARow: 0,
      lastOutcome: 'blocked-by-robots',
    })
  })

  it('waits as long as Wikipedia asks, and counts it as no failure', async () => {
    const { server: ok } = await serve()
    const busy = await startServer({
      '/robots.txt': reply(200, ''),
      [pageUrl('', squadPageTitle(season))]: reply(429, 'Te druk', { 'Retry-After': '120' }),
    })

    servers.push(busy)

    const report = await importAt(busy, first)

    expect(report).toMatchObject({ kind: 'wait', retryAfterSeconds: 120 })
    expect(formatSquadReport(report)).toBe('Squad 2026/27: not read, Wikipedia asks us to wait 120 seconds')
    expect((await database.db.select().from(squadImports))[0]).toMatchObject({
      failuresInARow: 0,
      lastOutcome: 'wait',
      retryAt: new Date(first.getTime() + 120 * 1000),
    })
    expect(await importAt(ok, new Date(first.getTime() + 180 * 1000))).toMatchObject({ kind: 'imported' })
  })
})

describe('seasons', () => {
  const oldPlayer = {
    name: 'Oude Speler',
    position: 'doelman',
    searchTerm: 'Speler',
    season: '2025/26',
    shirtNumber: 1,
  } as const

  it('leaves the players of an earlier season as they are when a squad is read', async () => {
    await database.db.insert(players).values(oldPlayer)

    const { server } = await serve()

    await importAt(server, first)
    // Another squad with the same name in the earlier season does not clash with it either.
    await database.db.insert(players).values({ ...oldPlayer, name: 'Bernt Klaverboer', season: '2025/26' })
    await importAt(server, new Date(first.getTime() + hours(1)))

    const old = await database.db.select().from(players).where(eq(players.season, '2025/26'))

    expect(old.map((player) => player.name).sort()).toEqual(['Bernt Klaverboer', 'Oude Speler'])
    expect(await database.db.select().from(players).where(eq(players.season, season))).toHaveLength(25)
  })

  it('reads the page of the new season on 1 July, and keeps the squad of the old one', async () => {
    const { server } = await serve()

    await importAt(server, first)

    const july = new Date('2027-07-01T10:00:00Z')
    const report = await importAt(server, july)

    expect(report).toMatchObject({ kind: 'imported', players: { added: 25 }, season: '2027/28' })
    expect(pageRequests(server).at(-1)).toBe('/wiki/Sc_Heerenveen_in_het_seizoen_2027/28_(mannen)?action=raw')
    expect(await database.db.select().from(players).where(eq(players.season, season))).toHaveLength(25)
    expect(await database.db.select().from(players).where(eq(players.season, '2027/28'))).toHaveLength(25)
    expect((await database.db.select().from(squadImports)).map((row) => row.season).sort()).toEqual([
      '2026/27',
      '2027/28',
    ])
  })
})

describe('the import command', () => {
  /** Puts a source with a feed in the register. */
  async function addFeed() {
    const server = await startServer({
      '/rss/': reply(
        200,
        '<?xml version="1.0"?><rss version="2.0"><channel><title>T</title><item><title>Kop</title><link>https://krant.test/1</link><guid>g1</guid></item></channel></rss>',
        { 'Content-Type': 'text/xml' },
      ),
    })

    servers.push(server)

    const [source] = await database.db
      .insert(sources)
      .values({ domain: 'krant.test', kind: 'news', name: 'Krant' })
      .$returningId()

    await database.db.insert(feeds).values({ sourceId: source?.id ?? 0, url: `${server.origin}/rss/` })

    return server
  }

  async function run(wikipedia: TestServer, feed: TestServer) {
    const lines: string[] = []
    const code = await runImport(database.url, {
      clock: () => first,
      makeFetcher: (robots) => fetcherFor([feed, wikipedia], { robots }),
      wikipediaOrigin: wikipedia.origin,
      write: (line) => lines.push(line),
    })

    return { code, lines }
  }

  it('imports the squad after the matches, in the same run', async () => {
    const feed = await addFeed()
    const { server } = await serve(original, { matchPages: true })

    const { code, lines } = await run(server, feed)

    expect(code).toBe(0)
    expect(lines).toEqual([
      expect.stringContaining('1 new, 0 updated, 0 unchanged, 0 skipped'),
      expect.stringContaining('Matches 2026/27: 35 new'),
      'Squad 2026/27: 25 new, 0 updated, 0 unchanged, 0 removed',
    ])
    expect(pageRequests(server).at(-1)).toBe('/wiki/Sc_Heerenveen_in_het_seizoen_2026/27_(mannen)?action=raw')
    expect(await database.db.select().from(players)).toHaveLength(25)
  })

  it('still reads the squad when the matches fail, and does not fail the run for it', async () => {
    const feed = await addFeed()
    const { server } = await serve()

    const { code, lines } = await run(server, feed)

    expect(code).toBe(0)
    expect(lines[1]).toContain('Matches 2026/27: warning, nothing changed and the last good copy stays')
    expect(lines[2]).toBe('Squad 2026/27: 25 new, 0 updated, 0 unchanged, 0 removed')
    expect(await database.db.select().from(matches)).toEqual([])
  })

  it('still reads the matches and the feeds when the squad fails, and does not fail the run for it', async () => {
    const feed = await addFeed()
    const { server } = await serve('Een kale pagina', { matchPages: true })

    const { code, lines } = await run(server, feed)

    expect(code).toBe(0)
    expect(lines[1]).toContain('Matches 2026/27: 35 new')
    expect(lines[2]).toContain('Squad 2026/27: warning, nothing changed and the last good copy stays')
    expect(await database.db.select().from(matches)).toHaveLength(35)
    expect(await database.db.select().from(players)).toEqual([])
  })

  it('does not print a line for the squad when the hour is not over yet', async () => {
    const feed = await addFeed()
    const { server } = await serve(original, { matchPages: true })

    await run(server, feed)

    const { lines } = await run(server, feed)

    expect(lines).toHaveLength(1)
  })
})

describe('the status', () => {
  async function status(at: Date) {
    const lines: string[] = []
    const code = await showStatus(database.url, { clock: () => at, write: (line) => lines.push(line) })

    return { code, text: lines.join('\n') }
  }

  it('says that the squad has not been read yet', async () => {
    const { code, text } = await status(first)

    expect(code).toBe(0)
    expect(text).toContain('Squad 2026/27 (Wikipedia): not read yet')
  })

  it('shows the last good read, the last outcome, the failed runs and the page', async () => {
    const { page, server } = await serve()

    await importAt(server, first)
    page.squad = 'Een kale pagina'
    await importAt(server, new Date(first.getTime() + hours(1)))

    const { code, text } = await status(new Date(first.getTime() + hours(1) + 60_000))

    expect(code).toBe(0)
    expect(text).toContain('Squad 2026/27 (Wikipedia): healthy')
    expect(text).toContain('last success: 2026-10-25 12:00:00 UTC')
    expect(text).toContain('last outcome: error')
    expect(text).toContain('failed runs in a row: 1')
    expect(text).toContain('the squad page has no table under the heading Spelers')
    expect(text).toContain('next try from: 2026-10-25 13:59:00 UTC')
    expect(text).toContain(
      'page: Sc Heerenveen in het seizoen 2026/27 (mannen), version Sat, 17 Oct 2026 07:23:24 GMT, read 2026-10-25 12:00:00 UTC',
    )
  })

  it('exits with 1 when the import has failed three runs in a row', async () => {
    const { server } = await serve('Een kale pagina')

    for (const hour of [0, 1, 2]) {
      await importAt(server, new Date(first.getTime() + hours(hour)))
    }

    const { code, text } = await status(new Date(first.getTime() + hours(2) + 60_000))

    expect(code).toBe(1)
    expect(text).toContain('Squad 2026/27 (Wikipedia): unhealthy')
    expect(text).toContain('failed runs in a row: 3')
  })

  it('keeps the page of the squad out of the pages of the matches', async () => {
    const { server } = await serve()

    await importAt(server, first)

    const { text } = await status(first)
    const matchPart = text.slice(text.indexOf('Matches'), text.indexOf('Squad'))

    expect(matchPart).not.toContain('Sc Heerenveen in het seizoen')
    expect(text.slice(text.indexOf('Squad'))).toContain('page: Sc Heerenveen in het seizoen 2026/27 (mannen)')
  })
})
