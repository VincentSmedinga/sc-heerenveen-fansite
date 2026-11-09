import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { listWikipediaPages } from '@fansite/db/queries'
import { clubs, matches, matchGoals, matchImports, players, standings, wikipediaPages } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { runSeasonImport } from './import-season.ts'
import { footballBoxPages } from './read-football-box.ts'
import { pageUrl } from './read-wikipedia.ts'
import { articleRoutes } from './test-articles.ts'
import { footballBoxText, footballBoxTitles } from './test-football-box.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

const wiki = { 'Content-Type': 'text/x-wiki; charset=UTF-8', 'Last-Modified': 'Mon, 09 Nov 2026 08:00:00 GMT' }

/** Monday 9 November 2026: the three seasons are long over. */
const now = new Date('2026-11-09T12:00:00Z')

const seasons = ['2007/08', '2008/09', '2009/10']

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
    'persons',
    'club_names',
    'clubs',
    'players',
    'wikipedia_pages',
    'match_imports',
  ]) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

/** Runs `pnpm run import:season <season>` against the two servers, and collects the lines. */
async function run({ dutch, english }: { dutch: TestServer; english: TestServer }, season: string) {
  const lines: string[] = []
  const code = await runSeasonImport(database.url, season, {
    clock: () => now,
    englishOrigin: english.origin,
    makeFetcher: (robots) => fetcherFor([dutch, english], { robots }),
    wikipediaOrigin: dutch.origin,
    write: (line) => lines.push(line),
  })

  return { code, lines: lines.flatMap((line) => line.split('\n')) }
}

/**
 * Starts two web servers, one for the Dutch Wikipedia and one for the English, each with the
 * pages of its language, so a test sees which Wikipedia a page is asked from. The Dutch one
 * also has an article for every club and person the import asks about. `change` changes the
 * text of a page by its title. The tests ask no real site.
 */
async function serve(change: Record<string, (text: string) => string> = {}) {
  const robots = { '/robots.txt': reply(200, '', { 'Content-Type': 'text/plain' }) }
  const routes: Record<'en' | 'nl', Record<string, Handler>> = { en: {}, nl: {} }
  const pages = seasons.flatMap(footballBoxPages)

  for (const page of pages) {
    const text = (change[page.title] ?? ((same) => same))(footballBoxText(page.title))

    routes[page.language][pageUrl('', page.title)] = reply(200, text, wiki)
  }

  const dutch = await startServer({
    ...articleRoutes(
      pages.filter((page) => page.language === 'nl').map((page) => footballBoxText(page.title)),
      {
        titles: [
          'AZ (voetbalclub)',
          'JFK Ventspils',
          'PAOK Saloniki',
          'Portsmouth FC',
          'PSV (voetbalclub)',
          'RBC (voetbalclub)',
          'Roda JC Kerkrade',
          'SBV Vitesse',
          'SC Braga',
          'SDC Putten',
          'Sporting Clube de Portugal',
          'Vitória FC (Setúbal)',
          'Willem II (voetbalclub)',
        ],
      },
    ),
    ...articleRoutes(['[[AC Milan]] [[ADO Den Haag]] [[FC Groningen]] [[FC Utrecht]] [[Helsingborgs IF]]']),
    ...articleRoutes(['[[Heracles Almelo]] [[Hertha BSC]] [[RKC Waalwijk]] [[Sparta Rotterdam]] [[VfL Wolfsburg]]']),
    ...articleRoutes(['[[VVV-Venlo]]']),
    ...robots,
    ...routes.nl,
  })
  const english = await startServer({ ...robots, ...routes.en }, 'localhost')

  servers.push(dutch, english)

  return { dutch, english }
}

/** The paths of the six pages among the requests of a server. */
const pageRequests = (server: TestServer) => {
  const paths = new Set(footballBoxTitles.map((title) => pageUrl('', title)))

  return server.paths().filter((path) => path !== undefined && paths.has(path))
}

/** Every row the import writes for a season, to see that a run changed none of them. */
async function rowsOf(season: string) {
  return {
    goals: await database.db
      .select({ goal: matchGoals })
      .from(matchGoals)
      .innerJoin(matches, eq(matchGoals.matchId, matches.id))
      .where(eq(matches.season, season))
      .orderBy(asc(matchGoals.id)),
    matches: await database.db.select().from(matches).where(eq(matches.season, season)).orderBy(asc(matches.id)),
    pages: (await database.db.select().from(wikipediaPages).where(eq(wikipediaPages.season, season))).map((page) => ({
      ...page,
      readAt: null,
    })),
  }
}

describe('pnpm run import:season for 2007/08, 2008/09 and 2009/10', () => {
  it('stores the 63 matches of the six pages with the source wikipedia, and a second run changes nothing', async () => {
    const wikipedia = await serve()
    const first = []

    for (const season of seasons) {
      first.push(await run(wikipedia, season))
    }

    expect(first.map((result) => result.code)).toEqual([0, 0, 0])
    expect(first.map((result) => result.lines[0])).toEqual([
      'Matches 2007/08: 6 new, 0 updated, 0 unchanged, 0 removed; the pages of this season have no table',
      'Matches 2008/09: 11 new, 0 updated, 0 unchanged, 0 removed; the pages of this season have no table',
      'Matches 2009/10: 46 new, 0 updated, 0 unchanged, 0 removed; the pages of this season have no table',
    ])
    expect(first.flatMap((result) => result.lines).some((line) => line.includes('league results'))).toBe(false)

    const stored = await database.db.select().from(matches)

    expect(stored).toHaveLength(63)
    expect(stored.every((match) => match.dataSource === 'wikipedia' && match.status === 'played')).toBe(true)
    expect(await database.db.select().from(standings)).toEqual([])

    const before = await Promise.all(seasons.map(rowsOf))
    const second = []

    for (const season of seasons) {
      second.push(await run(wikipedia, season))
    }

    expect(second.map((result) => result.lines[0])).toEqual([
      'Matches 2007/08: 0 new, 0 updated, 6 unchanged, 0 removed; the pages of this season have no table',
      'Matches 2008/09: 0 new, 0 updated, 11 unchanged, 0 removed; the pages of this season have no table',
      'Matches 2009/10: 0 new, 0 updated, 46 unchanged, 0 removed; the pages of this season have no table',
    ])
    expect(await Promise.all(seasons.map(rowsOf))).toEqual(before)
    expect(await database.db.select().from(matches)).toHaveLength(63)
  })

  it('asks for the pages of the season alone, each on the Wikipedia of its language', async () => {
    const wikipedia = await serve()

    await run(wikipedia, '2008/09')

    expect(pageRequests(wikipedia.dutch)).toEqual([pageUrl('', 'KNVB Beker 2008/09 (mannen)')])
    expect(pageRequests(wikipedia.english)).toEqual([
      pageUrl('', '2008–09 UEFA Cup first round'),
      pageUrl('', '2008–09 UEFA Cup group stage'),
    ])
    // Nothing but robots.txt and the raw text of a page under /wiki/ is asked of either.
    expect(
      [...wikipedia.dutch.paths(), ...wikipedia.english.paths()].every(
        (path) => path === '/robots.txt' || /^\/wiki\/[^?]+\?action=raw$/u.test(path ?? ''),
      ),
    ).toBe(true)
  })

  it('keeps the pages with their language, for the credit', async () => {
    const wikipedia = await serve()

    await run(wikipedia, '2007/08')

    expect(await listWikipediaPages(database.db, '2007/08')).toEqual([
      { kind: 'matches', language: 'en', readAt: now, title: '2007–08 UEFA Cup first round' },
      { kind: 'matches', language: 'nl', readAt: now, title: 'Play-offs Nederlands voetbal 2008' },
    ])
  })

  it('stores the final of the cup of 2009 with extra time and the shoot-out, and its goals', async () => {
    const wikipedia = await serve()

    await run(wikipedia, '2008/09')

    const [final] = await database.db.select().from(matches).where(eq(matches.round, 'Finale'))
    const goals = await database.db
      .select()
      .from(matchGoals)
      .where(eq(matchGoals.matchId, final?.id ?? 0))

    expect(final).toMatchObject({
      afterNinetyAgainst: 1,
      afterNinetyFor: 1,
      competition: 'KNVB Beker',
      extraTime: true,
      goalsAgainst: 2,
      goalsFor: 2,
      penaltiesAgainst: 4,
      penaltiesFor: 5,
      stadium: 'De Kuip',
    })
    expect(goals.map((goal) => [goal.minute, goal.player])).toEqual([
      [27, 'Goran Popov'],
      [54, 'Eljero Elia'],
      [112, 'Bonaventure Kalou'],
      [118, 'Youssouf Hersi'],
    ])
  })

  it('ties a goal to a player of the season by the name, and logs the goals that find none', async () => {
    await database.db.insert(players).values(
      ['Gerald Sibon', 'Michal Papadopulos'].map((name) => ({
        name,
        position: 'aanvaller' as const,
        searchTerm: name.split(' ').slice(1).join(' '),
        season: '2009/10',
      })),
    )

    const wikipedia = await serve()
    const { lines } = await run(wikipedia, '2009/10')
    const squad = await database.db.select().from(players)
    const goals = await database.db.select().from(matchGoals).where(eq(matchGoals.ours, true))
    const idOf = (name: string) => squad.find((player) => player.name === name)?.id

    expect(
      goals.filter((goal) => goal.player === 'Sibon').every((goal) => goal.playerId === idOf('Gerald Sibon')),
    ).toBe(true)
    expect(goals.filter((goal) => goal.player === 'Sibon').length).toBeGreaterThan(5)
    expect(goals.filter((goal) => goal.player === 'Losada').every((goal) => goal.playerId === null)).toBe(true)
    // An English link is no person: no goal of an English page has a page or a person.
    expect(goals.every((goal) => goal.wikipediaPage === null && goal.personId === null)).toBe(true)
    expect(lines.find((line) => line.includes('no player in the squad table'))).toMatch(
      /^Matches 2009\/10: warning, \d+ goals of ours have no player in the squad table: Assaidi, /u,
    )
  })

  it('leaves a match without scorers when they do not add up to the result, with a line in the log', async () => {
    const wikipedia = await serve()
    const { lines } = await run(wikipedia, '2009/10')
    const [match] = await database.db.select().from(matches).where(eq(matches.round, 'Speelronde 15'))

    expect(match).toMatchObject({ goalsAgainst: 1, goalsFor: 3, opponent: 'RKC Waalwijk' })
    expect(
      await database.db
        .select()
        .from(matchGoals)
        .where(eq(matchGoals.matchId, match?.id ?? 0)),
    ).toEqual([])
    expect(lines).toContain(
      'Matches 2009/10: warning, no scorers: Speelronde 15 (Eredivisie): the scorers are 3-0, the result is 3-1',
    )
  })

  it('skips a match the editors added on the same day, with one line, and never changes it', async () => {
    const wikipedia = await serve()

    // The editors have the home match against Ajax of 1 May 2008 under another round, with a
    // field left open.
    await database.db.insert(matches).values(
      await withClubs(database.db, [
        {
          competition: 'Play-offs Champions League',
          dataSource: 'redactie',
          goalsAgainst: 2,
          goalsFor: 1,
          home: true,
          matchDate: '2008-05-01',
          opponent: 'Ajax',
          round: 'Halve finale heen',
          season: '2007/08',
          sourceLine: 'Leeuwarder Courant, 2 mei 2008',
          status: 'played',
        },
      ]),
    )
    await database.db.update(clubs).set({ wikipediaPage: 'AFC Ajax' }).where(eq(clubs.name, 'Ajax'))

    const editorMatch = () => database.db.select().from(matches).where(eq(matches.dataSource, 'redactie'))
    const before = await editorMatch()
    const { code, lines } = await run(wikipedia, '2007/08')

    expect(code).toBe(0)
    expect(lines[0]).toBe(
      'Matches 2007/08: 5 new, 0 updated, 1 unchanged, 0 removed; the pages of this season have no table',
    )
    expect(lines.filter((line) => line.includes('Halve finale, wedstrijd 1/2'))).toEqual([
      `Matches 2007/08: warning, Play-offs Champions League Halve finale, wedstrijd 1/2 (2008-05-01) left out: the editors added this match (match ${before[0]?.id}), and the import of Wikipedia leaves it as it is`,
    ])
    expect(lines.some((line) => line.includes('match difference'))).toBe(false)
    expect(await editorMatch()).toEqual(before)
    expect(before[0]).toMatchObject({ referee: null, stadium: null })
    expect(await database.db.select().from(matches)).toHaveLength(6)

    // A second run finds it again, and still changes nothing.
    await run(wikipedia, '2007/08')

    expect(await editorMatch()).toEqual(before)
    expect(await database.db.select().from(matches)).toHaveLength(6)
  })

  it('changes nothing when a page has changed shape, and says which', async () => {
    const wikipedia = await serve({
      '2008–09 UEFA Cup group stage': (text) => text.replace('===Group E===', '===Group F==='),
    })
    const { code, lines } = await run(wikipedia, '2008/09')

    expect(code).toBe(1)
    expect(lines[0]).toContain(
      "nothing changed and the last good copy stays: the page '2008–09 UEFA Cup group stage' has a match of ours under a heading we do not know: 'Group F'",
    )
    expect(await database.db.select().from(matches)).toEqual([])
    expect(await database.db.select().from(wikipediaPages)).toEqual([])
    expect(await database.db.select().from(matchImports)).toMatchObject([{ lastOutcome: 'error', season: '2008/09' }])
  })
})
