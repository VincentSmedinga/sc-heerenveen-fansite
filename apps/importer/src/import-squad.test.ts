import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import {
  feeds,
  matches,
  matchGoals,
  players,
  playerSeasonStats,
  sources,
  squadImports,
  wikipediaPages,
} from '@fansite/db/schema'
import { madeUpSquad } from '@fansite/db/seed'
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
    'player_season_stats',
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
      players: { added: 25, left: 0, unchanged: 0, updated: 0 },
      season,
      stats: { added: 50, unchanged: 0, updated: 0 },
      warnings: [],
    })
    expect(formatSquadReport(report)).toBe(
      [
        'Squad 2026/27: 25 new, 0 updated, 0 unchanged, 0 left the squad',
        'Squad 2026/27: numbers of the players: 50 new, 0 updated, 0 unchanged',
      ].join('\n'),
    )

    const stored = await database.db.select().from(players).orderBy(asc(players.id))

    expect(stored).toHaveLength(25)
    expect(stored.every((player) => player.season === season)).toBe(true)
    expect(stored[0]).toMatchObject({
      name: 'Bernt Klaverboer',
      position: 'doelman',
      searchTerm: 'Klaverboer',
      shirtNumber: 22,
      wikipediaPage: 'Bernt Klaverboer',
    })
    expect(stored.every((player) => player.inSquad && player.leftSquadAt === null)).toBe(true)
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
      { searchTerm: 'Vente', wikipediaPage: 'Dylan Vente (voetballer)' },
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

    expect(later).toMatchObject({ kind: 'imported', players: { added: 0, left: 0, unchanged: 25, updated: 0 } })
    expect(pageRequests(server)).toHaveLength(2)
    expect(await database.db.select().from(players)).toHaveLength(25)
  })

  /** The page after Marko Farji left, Pim Verbeek came and Dirk Proper changed his number. */
  const changed = () =>
    without(original, 'Marko Farji')
      .replace(
        '\n|}',
        "\n|-\n|'''30'''||{{NL-VLAG}}|| align=\"left\" |[[Pim Verbeek]]||2028||0||0||0||0||0||0||'''0'''||'''0'''||'''0'''\n|}",
      )
      .replace(
        "|'''6'''\n|{{NL-VLAG}}\n| align=\"left\" |[[Dirk Proper]]",
        "|'''8'''\n|{{NL-VLAG}}\n| align=\"left\" |[[Dirk Proper]]",
      )

  it('updates the squad: a player who left stays, marked as gone, a new one comes, a new number is taken over', async () => {
    const { page, server } = await serve()

    await importAt(server, first)

    const before = await database.db.select().from(players).orderBy(asc(players.id))

    page.squad = changed()

    const later = new Date(first.getTime() + hours(1))
    const report = await importAt(server, later)

    expect(report).toMatchObject({ kind: 'imported', players: { added: 1, left: 1, unchanged: 23, updated: 1 } })
    expect(formatSquadReport(report)).toBe(
      [
        'Squad 2026/27: 1 new, 1 updated, 23 unchanged, 1 left the squad',
        'Squad 2026/27: numbers of the players: 2 new, 0 updated, 48 unchanged',
      ].join('\n'),
    )

    const after = await database.db.select().from(players).orderBy(asc(players.id))
    const named = (name: string) => after.find((player) => player.name === name)

    expect(after).toHaveLength(26)
    expect(named('Marko Farji')).toMatchObject({ inSquad: false, leftSquadAt: later, wikipediaPage: 'Marko Farji' })
    expect(named('Pim Verbeek')).toMatchObject({ inSquad: true, leftSquadAt: null })
    expect(named('Dirk Proper')).toMatchObject({ shirtNumber: 8 })
    // Nobody who is in the table or was in it before gets a new id.
    expect(after.slice(0, 25).map((player) => [player.id, player.name])).toEqual(
      before.map((player) => [player.id, player.name]),
    )
  })

  it('keeps the id of a player when his number, position, name or page change', async () => {
    const { page, server } = await serve()

    await importAt(server, first)

    const [klaverboer] = await database.db.select().from(players).where(eq(players.name, 'Bernt Klaverboer'))

    // A new spelling of the name, on the same page.
    page.squad = original.replace('[[Bernt Klaverboer]]', '[[Bernt Klaverboer|Bernt Klaverboer-Jansen]]')
    await importAt(server, new Date(first.getTime() + hours(1)))

    expect(await database.db.select().from(players).where(eq(players.id, klaverboer!.id))).toMatchObject([
      { name: 'Bernt Klaverboer-Jansen', wikipediaPage: 'Bernt Klaverboer' },
    ])
    expect(await database.db.select().from(players)).toHaveLength(25)
  })

  it('does not mark a player who is gone again, and does not move the moment he left', async () => {
    const { page, server } = await serve()

    await importAt(server, first)
    page.squad = changed()

    const left = new Date(first.getTime() + hours(1))

    await importAt(server, left)

    const report = await importAt(server, new Date(first.getTime() + hours(2)))

    expect(report).toMatchObject({ kind: 'imported', players: { added: 0, left: 0, unchanged: 25, updated: 0 } })
    expect(await database.db.select().from(players).where(eq(players.name, 'Marko Farji'))).toMatchObject([
      { inSquad: false, leftSquadAt: left },
    ])
  })

  it('puts a player who comes back in the squad again, with his old id', async () => {
    const { page, server } = await serve()

    await importAt(server, first)

    const [farji] = await database.db.select().from(players).where(eq(players.name, 'Marko Farji'))

    page.squad = without(original, 'Marko Farji')
    await importAt(server, new Date(first.getTime() + hours(1)))
    page.squad = original

    const report = await importAt(server, new Date(first.getTime() + hours(2)))

    expect(report).toMatchObject({ kind: 'imported', players: { added: 0, left: 0, unchanged: 24, updated: 1 } })
    expect(await database.db.select().from(players)).toHaveLength(25)
    expect(await database.db.select().from(players).where(eq(players.name, 'Marko Farji'))).toMatchObject([
      { id: farji!.id, inSquad: true, leftSquadAt: null },
    ])
  })

  it('fills the page of a player from before the pages were kept, and keeps his id', async () => {
    const { server } = await serve()

    await importAt(server, first)
    await database.db.update(players).set({ wikipediaPage: null })

    const before = await database.db.select().from(players).orderBy(asc(players.id))
    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ kind: 'imported', players: { added: 0, left: 0, unchanged: 0, updated: 25 } })

    const after = await database.db.select().from(players).orderBy(asc(players.id))

    expect(after.map((player) => [player.id, player.inSquad])).toEqual(before.map((player) => [player.id, true]))
    expect(after.every((player) => player.wikipediaPage !== null)).toBe(true)
    expect(after.find((player) => player.name === 'Roberts Uldrikis')?.wikipediaPage).toBe('Roberts Uldriķis')
  })

  it('replaces the made-up squad of the seed with the first good read, and nothing after it', async () => {
    await database.db.insert(players).values(madeUpSquad(first))

    const { page, server } = await serve()

    expect(await database.db.select().from(players)).toHaveLength(madeUpSquad(first).length)
    await importAt(server, first)

    const read = await database.db.select().from(players).orderBy(asc(players.id))

    expect(read).toHaveLength(25)
    expect(read.map((player) => player.name)).not.toContain('Tjerk Brandsma')

    // After that a player who is gone stays.
    page.squad = without(original, 'Marko Farji')
    await importAt(server, new Date(first.getTime() + hours(1)))

    expect(await database.db.select().from(players)).toHaveLength(25)
  })

  it('does not replace anything after a failed first read', async () => {
    await database.db.insert(players).values(madeUpSquad(first))

    const { server } = await serve(original.replace('=== Spelers ===', '=== Selectie ==='))

    expect(await importAt(server, first)).toMatchObject({ kind: 'error' })
    expect(await database.db.select().from(players)).toHaveLength(madeUpSquad(first).length)
  })

  it('keeps the goals of a player who left, and of every player in the squad, linked to the same id', async () => {
    const { page, server } = await serve()

    await importAt(server, first)

    const [farji] = await database.db.select().from(players).where(eq(players.name, 'Marko Farji'))
    const [match] = await database.db
      .insert(matches)
      .values(
        await withClubs(database.db, [
          {
            competition: 'Eredivisie',
            goalsAgainst: 0,
            goalsFor: 1,
            home: true,
            kickoffAt: first,
            matchDate: '2026-10-25',
            opponent: 'Testdorp FC',
            round: 'Speelronde 1',
            season,
            status: 'played',
          },
        ]),
      )
      .$returningId()

    await database.db.insert(matchGoals).values({
      matchId: match!.id,
      minute: 10,
      ours: true,
      player: 'Farji',
      playerId: farji!.id,
      wikipediaPage: 'Marko Farji',
    })
    page.squad = without(original, 'Marko Farji')
    await importAt(server, new Date(first.getTime() + hours(1)))

    expect(await database.db.select().from(matchGoals)).toMatchObject([{ playerId: farji!.id }])
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

    expect(report).toMatchObject({ kind: 'imported', players: { added: 0, left: 0, unchanged: 24, updated: 1 } })
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

describe('the numbers of the players', () => {
  /** The page with the row of this player written again, with these cells after the contract */
  function withNumbers(text: string, name: string, shirt: number, numbers: string) {
    return text
      .split(/(?=^\|-)/mu)
      .map((row) =>
        row.includes(`[[${name}]]`)
          ? `|-\n|'''${shirt}'''||{{NL-VLAG}}|| align="left" |[[${name}]]||2029||${numbers}\n`
          : row,
      )
      .join('')
  }

  async function statsOf(name: string) {
    return database.db
      .select({
        appearances: playerSeasonStats.appearances,
        assists: playerSeasonStats.assists,
        competition: playerSeasonStats.competition,
        goals: playerSeasonStats.goals,
        updatedAt: playerSeasonStats.updatedAt,
      })
      .from(playerSeasonStats)
      .innerJoin(players, eq(playerSeasonStats.playerId, players.id))
      .where(eq(players.name, name))
      .orderBy(asc(playerSeasonStats.competition))
  }

  /** A match that was played, with the Eredivisie goals of the squad table. */
  async function playMatchWithTheGoalsOfTheTable() {
    const rows = await database.db
      .select({ goals: playerSeasonStats.goals, name: players.name, playerId: players.id })
      .from(playerSeasonStats)
      .innerJoin(players, eq(playerSeasonStats.playerId, players.id))
      .where(eq(playerSeasonStats.competition, 'Eredivisie'))
    const scorers = rows.flatMap((row) => Array.from({ length: row.goals }, () => row))
    const [{ insertId }] = await database.db.insert(matches).values(
      (
        await withClubs(database.db, [
          {
            competition: 'Eredivisie',
            goalsAgainst: 0,
            goalsFor: scorers.length,
            home: true,
            kickoffAt: new Date('2026-10-24T18:45:00Z'),
            matchDate: '2026-10-24',
            opponent: 'Testdorp FC',
            round: 'Speelronde 1',
            season,
            status: 'played',
          },
        ])
      )[0]!,
    )

    await database.db.insert(matchGoals).values(
      scorers.map((scorer, index) => ({
        matchId: insertId,
        minute: index + 1,
        ours: true,
        player: scorer.name,
        playerId: scorer.playerId,
      })),
    )

    return insertId
  }

  it('stores the appearances, goals and assists of each player in each competition', async () => {
    const { server } = await serve()

    await importAt(server, first)

    expect(await database.db.select().from(playerSeasonStats)).toHaveLength(50)
    expect(await statsOf('Luca Oyen')).toEqual([
      { appearances: 8, assists: 1, competition: 'Eredivisie', goals: 2, updatedAt: first },
      { appearances: 0, assists: 0, competition: 'KNVB Beker', goals: 0, updatedAt: first },
    ])
    expect((await database.db.select().from(playerSeasonStats)).every((row) => row.season === season)).toBe(true)
  })

  it('gives a player without numbers, an empty cell, no row, and a dash is zero', async () => {
    const text = withNumbers(
      withNumbers(original, 'Luca Oyen', 11, '||||||||||||||||'),
      'Jacob Trenskow',
      20,
      '-||-||-||2||1||-||2||1||0',
    )
    const { server } = await serve(text)

    const report = await importAt(server, first)

    expect(report).toMatchObject({
      kind: 'imported',
      players: { added: 25 },
      stats: { added: 48, unchanged: 0, updated: 0 },
      warnings: [],
    })
    expect(await statsOf('Luca Oyen')).toEqual([])
    expect(await statsOf('Jacob Trenskow')).toEqual([
      { appearances: 0, assists: 0, competition: 'Eredivisie', goals: 0, updatedAt: first },
      { appearances: 2, assists: 0, competition: 'KNVB Beker', goals: 1, updatedAt: first },
    ])
    expect(await database.db.select().from(players).where(eq(players.name, 'Luca Oyen'))).toHaveLength(1)
  })

  it('updates the numbers in the next run, without double rows, and moves the moment only for a change', async () => {
    const { page, server } = await serve()

    await importAt(server, first)
    page.squad = withNumbers(original, 'Luca Oyen', 11, '9||3||1||1||1||0||10||4||1')

    const later = new Date(first.getTime() + hours(1))
    const report = await importAt(server, later)

    expect(report).toMatchObject({ kind: 'imported', stats: { added: 0, unchanged: 48, updated: 2 } })
    expect(await database.db.select().from(playerSeasonStats)).toHaveLength(50)
    expect(await statsOf('Luca Oyen')).toEqual([
      { appearances: 9, assists: 1, competition: 'Eredivisie', goals: 3, updatedAt: later },
      { appearances: 1, assists: 0, competition: 'KNVB Beker', goals: 1, updatedAt: later },
    ])
    expect((await statsOf('Dylan Vente'))[0]?.updatedAt).toEqual(first)

    // The same page again changes nothing, also not the moment.
    const again = await importAt(server, new Date(first.getTime() + hours(2)))

    expect(again).toMatchObject({ kind: 'imported', stats: { added: 0, unchanged: 50, updated: 0 } })
    expect(await database.db.select().from(playerSeasonStats)).toHaveLength(50)
    expect((await statsOf('Luca Oyen'))[0]?.updatedAt).toEqual(later)
  })

  it('keeps the last numbers of a player who leaves the table', async () => {
    const { page, server } = await serve()

    await importAt(server, first)
    page.squad = without(original, 'Marko Farji')
    await importAt(server, new Date(first.getTime() + hours(1)))

    expect(await database.db.select().from(players).where(eq(players.name, 'Marko Farji'))).toMatchObject([
      { inSquad: false },
    ])
    expect(await statsOf('Marko Farji')).toEqual([
      { appearances: 4, assists: 0, competition: 'Eredivisie', goals: 1, updatedAt: first },
      { appearances: 0, assists: 0, competition: 'KNVB Beker', goals: 0, updatedAt: first },
    ])
    expect(await database.db.select().from(playerSeasonStats)).toHaveLength(50)
  })

  it('keeps the numbers of a player whose cells become empty', async () => {
    const { page, server } = await serve()

    await importAt(server, first)
    page.squad = withNumbers(original, 'Luca Oyen', 11, '||||||||||||||||')

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ kind: 'imported', stats: { added: 0, unchanged: 48, updated: 0 } })
    expect(await statsOf('Luca Oyen')).toHaveLength(2)
  })

  it('leaves a player out, with a warning, when his row is already taken by another player of the table', async () => {
    const { page, server } = await serve()

    await importAt(server, first)
    // One player is known by the page, another by the name: both would land on the same row.
    page.squad = original
      .replace('[[Sam Kersten]]', '[[Sam Kersten|Sammie Kersten]]')
      .replace(
        '\n|}',
        "\n|-\n|'''40'''||{{NL-VLAG}}|| align=\"left\" |[[Anderen Pagina|Sam Kersten]]||2028||1||0||0||0||0||0||1||0||0\n|}",
      )

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({
      kind: 'imported',
      warnings: ['Sam Kersten: could not be linked to a player in the squad, so the numbers are skipped'],
    })
    expect(await database.db.select().from(playerSeasonStats)).toHaveLength(50)
    expect(await database.db.select().from(players)).toHaveLength(25)
  })

  it('does not warn when the goals in the table are those of the matches', async () => {
    const { server } = await serve()

    await importAt(server, first)
    await playMatchWithTheGoalsOfTheTable()

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    expect(report).toMatchObject({ kind: 'imported', warnings: [] })
    expect((await database.db.select().from(squadImports))[0]).toMatchObject({ lastWarning: null })
  })

  it('warns when the goals differ, with the name, the season and both numbers, and changes nothing', async () => {
    const { server } = await serve()

    await importAt(server, first)

    const matchId = await playMatchWithTheGoalsOfTheTable()
    const [oyen] = await database.db.select().from(players).where(eq(players.name, 'Luca Oyen'))

    // One goal less for Oyen. His own goal and a goal of the opponent don't count for him.
    await database.pool.query('DELETE FROM match_goals WHERE player_id = ? LIMIT 1', [oyen?.id])
    await database.db.insert(matchGoals).values([
      { matchId, minute: 80, ours: false, ownGoal: true, player: 'Oyen', playerId: oyen?.id ?? null },
      { matchId, minute: 81, ours: false, player: 'Oyen' },
    ])

    const before = await database.db.select().from(playerSeasonStats).orderBy(asc(playerSeasonStats.id))
    const later = new Date(first.getTime() + hours(1))
    const report = await importAt(server, later)

    expect(report).toMatchObject({
      kind: 'imported',
      warnings: ['Luca Oyen (2026/27) has 2 goals in the Eredivisie in the squad table and 1 in the matches'],
    })
    expect(formatSquadReport(report).split('\n').at(-1)).toBe(
      'Squad 2026/27: warning, Luca Oyen (2026/27) has 2 goals in the Eredivisie in the squad table and 1 in the matches',
    )
    expect((await database.db.select().from(squadImports))[0]).toMatchObject({
      failuresInARow: 0,
      lastOutcome: 'imported',
      lastWarning: 'Luca Oyen (2026/27) has 2 goals in the Eredivisie in the squad table and 1 in the matches',
      lastWarningAt: later,
    })
    // The table stays the source: nothing in the numbers changed.
    expect(await database.db.select().from(playerSeasonStats).orderBy(asc(playerSeasonStats.id))).toEqual(before)
  })

  it('compares each competition on its own', async () => {
    const { server } = await serve(withNumbers(original, 'Luca Oyen', 11, '8||0||1||1||2||0||9||2||1'))

    await importAt(server, first)
    await playMatchWithTheGoalsOfTheTable()

    const report = await importAt(server, new Date(first.getTime() + hours(1)))

    // Oyen has no Eredivisie goal in the table now, so the goals of the matches are not his.
    expect(report).toMatchObject({
      warnings: ['Luca Oyen (2026/27) has 2 goals in the KNVB Beker in the squad table and 0 in the matches'],
    })
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

    const { code, lines: reports } = await run(server, feed)
    const lines = reports.flatMap((report) => report.split('\n')).filter((line) => !/: new (club|name) /u.test(line))

    expect(code).toBe(0)
    expect(lines.slice(0, 4)).toEqual([
      expect.stringContaining('1 new, 0 updated, 0 unchanged, 0 skipped'),
      expect.stringContaining('Matches 2026/27: 35 new'),
      expect.stringContaining('Squad 2026/27: 25 new, 0 updated, 0 unchanged, 0 left the squad'),
      'Squad 2026/27: numbers of the players: 50 new, 0 updated, 0 unchanged',
    ])
    // The goals of the made-up matches differ from the made-up table: a line for each.
    expect(lines.length).toBeGreaterThan(4)
    expect(lines.slice(4).every((line) => /^Squad 2026\/27: warning, .+ goals? in the Eredivisie/u.test(line))).toBe(
      true,
    )
    expect(pageRequests(server).at(-1)).toBe('/wiki/Sc_Heerenveen_in_het_seizoen_2026/27_(mannen)?action=raw')
    expect(await database.db.select().from(players)).toHaveLength(25)
  })

  it('still reads the squad when the matches fail, and does not fail the run for it', async () => {
    const feed = await addFeed()
    const { server } = await serve()

    const { code, lines: reports } = await run(server, feed)
    const lines = reports.flatMap((report) => report.split('\n'))

    expect(code).toBe(0)
    expect(lines[1]).toContain('Matches 2026/27: warning, nothing changed and the last good copy stays')
    expect(lines[2]).toBe('Squad 2026/27: 25 new, 0 updated, 0 unchanged, 0 left the squad')
    expect(lines[3]).toBe('Squad 2026/27: numbers of the players: 50 new, 0 updated, 0 unchanged')
    // No match was played in the database, so there is nothing to compare the goals with.
    expect(lines).toHaveLength(4)
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
