import type { TestDatabase } from '@fansite/db/test-database'
import type { RowDataPacket } from 'mysql2'

import { connect } from '@fansite/db/client'
import { linkOpponentPersons } from '@fansite/db/opponent-persons'
import {
  clubs,
  clubSquadPlayers,
  matchAppearances,
  matches,
  matchGoals,
  matchReports,
  persons,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { runImport } from './import-feeds.ts'
import {
  describeOpponentSearch,
  importOpponentSearch,
  mostNamesPerRun,
  playedFor,
  searchOpponentPersons,
} from './search-opponent-persons.ts'
import { showStatus } from './status.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'
import { infoPath, infoRoute, itemPath, itemRoute, type TestItem } from './test-wikidata.ts'

const day = 86_400_000
const now = new Date('2026-11-26T12:00:00Z')

let database: TestDatabase
let connection: ReturnType<typeof connect>
const servers: TestServer[] = []

beforeAll(async () => {
  database = await createTestDatabase()
  connection = connect(database.url)
})

afterAll(async () => {
  await connection?.close()
  await database?.drop()
})

beforeEach(async () => {
  for (const table of [
    'opponent_name_searches',
    'club_squad_players',
    'match_goals',
    'match_appearances',
    'match_reports',
    'matches',
    'persons',
    'clubs',
  ]) {
    await database.pool.query(`DELETE FROM ${table}`)
  }

  matchCount = 0
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

let matchCount = 0

async function addClub(name: string, wikidataId: null | string) {
  const [club] = await connection.db
    .insert(clubs)
    .values({ name, slug: name.toLowerCase().replaceAll(/[^a-z0-9]+/g, ''), wikidataId })
    .$returningId()

  return club!.id
}

/** A played match against a club, with a report and these opponents on the pitch. */
async function addMatch(clubId: number, season: string, ...names: string[]) {
  matchCount += 1

  const date = `${season.slice(0, 4)}-09-${String(matchCount).padStart(2, '0')}`
  const [match] = await connection.db
    .insert(matches)
    .values({
      clubId,
      competition: 'Eredivisie',
      goalsAgainst: 0,
      goalsFor: 1,
      home: true,
      kickoffAt: new Date(`${date}T18:45:00Z`),
      matchDate: date,
      opponent: 'Tegenstander',
      round: `Speelronde ${matchCount}`,
      season,
      status: 'played',
    })
    .$returningId()
  const matchId = match!.id

  await connection.db.insert(matchReports).values({ matchId, status: 'klaar' })

  if (names.length > 0) {
    await connection.db
      .insert(matchAppearances)
      .values(names.map((name) => ({ matchId, ours: false, sourceName: name, starter: true })))
  }

  return matchId
}

/** The title of the person of every row of the opponent, as `name -> title` in order of id. */
async function linked() {
  return (
    await rows(
      'SELECT a.name, p.wikipedia_page AS page FROM match_appearances a LEFT JOIN persons p ON p.id = a.person_id ORDER BY a.id',
    )
  ).map((row) => [row['name'], row['page']])
}

async function rows(sql: string) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql)

  return result
}

const rawPath = (title: string) => `/wiki/${encodeURI(title.replaceAll(' ', '_'))}?action=raw`

function raw(title: string, text = 'Een voetballer.'): Record<string, Handler> {
  return { [rawPath(title)]: reply(200, text) }
}

const year = (value: number) => ({ precision: 9, time: `+${value}-00-00T00:00:00Z` })

type Served = Awaited<ReturnType<typeof serve>>

/** The routes of an article that is no redirect: text, page information and item. */
function article(title: string, item: string, facts: TestItem, pageId = 7, text?: string) {
  return {
    data: itemRoute(item, facts),
    nl: { ...raw(title, text), ...infoRoute(title, pageId, item) },
  }
}

/** A footballer who played for these clubs from 1990 to 2000. */
function footballer(...clubIds: string[]): TestItem {
  return {
    instanceOf: ['Q5'],
    teams: clubIds.map((value) => ({ end: year(2000), start: year(1990), value })),
  }
}

function search(served: Served, options: Partial<Parameters<typeof searchOpponentPersons>[2]> = {}) {
  return searchOpponentPersons(connection.db, fetcherFor([served.nl, served.data]), {
    clock: () => now,
    exceptions: [],
    origin: served.nl.origin,
    pause: 0,
    wikidata: served.data.origin,
    ...options,
  })
}

async function serve(...articles: { data?: Record<string, Handler>; nl?: Record<string, Handler> }[]) {
  const nl = await startServer(Object.assign({}, ...articles.map((one) => one.nl)))
  const data = await startServer(Object.assign({}, ...articles.map((one) => one.data)), 'localhost')

  servers.push(nl, data)

  return { data, nl }
}

const asked = (server: TestServer) => server.paths().filter((path) => path !== '/robots.txt')

describe('playedFor', () => {
  const item = (start: [number, number?] | null, end: [number, number?] | null) => ({
    human: true,
    id: 'Q1',
    teams: [
      {
        end: end === null ? null : { day: null, month: end[1] ?? null, year: end[0] },
        start: start === null ? null : { day: null, month: start[1] ?? null, year: start[0] },
        teamId: 'Q10',
      },
    ],
  })

  it('touches the season from 1 July to 30 June, with an open end or start', () => {
    expect(playedFor(item([1996, 6], [1997, 6]), 'Q10', '1995/96')).toBe(true)
    expect(playedFor(item([1996, 7], null), 'Q10', '1995/96')).toBe(false)
    expect(playedFor(item(null, [1995, 6]), 'Q10', '1995/96')).toBe(false)
    expect(playedFor(item(null, [1995, 7]), 'Q10', '1995/96')).toBe(true)
    expect(playedFor(item([1990], null), 'Q10', '1995/96')).toBe(true)
    expect(playedFor(item([1996], [1998]), 'Q10', '1995/96')).toBe(true)
    expect(playedFor(item([1997], [1998]), 'Q10', '1995/96')).toBe(false)
    expect(playedFor(item(null, [2000]), 'Q10', '1995/96')).toBe(true)
  })

  it('needs the club and at least one date', () => {
    expect(playedFor(item(null, null), 'Q10', '1995/96')).toBe(false)
    expect(playedFor(item([1990], [2000]), 'Q11', '1995/96')).toBe(false)
  })
})

describe('searchOpponentPersons', () => {
  it('makes a person from the article, with its title, item and name, and links the rows', async () => {
    const club = await addClub('N.E.C.', 'Q10')

    await addMatch(club, '1995/96', 'Jan de Vries')
    await addMatch(club, '1996/97', 'Jan de Vries')

    const served = await serve(
      article('Jan de Vries', 'Q100', footballer('Q10'), 42, 'Tekst\n{{DEFAULTSORT:Vries, Jan de}}'),
    )

    expect(await search(served)).toEqual({ linked: 2, made: 1, searched: 1, warnings: [], without: 0 })
    expect(
      await rows(
        'SELECT wikipedia_page, wikidata_id, wikipedia_page_id, name, given_name, family_name_prefix, family_name, name_source, wikidata_read_at FROM persons',
      ),
    ).toEqual([
      {
        family_name: 'Vries',
        family_name_prefix: 'de',
        given_name: 'Jan',
        name: 'Jan de Vries',
        name_source: 'sort_key',
        wikidata_id: 'Q100',
        // Left to the step that reads the persons from Wikidata.
        wikidata_read_at: null,
        wikipedia_page: 'Jan de Vries',
        wikipedia_page_id: 42,
      },
    ])
    expect(await linked()).toEqual([
      ['Jan de Vries', 'Jan de Vries'],
      ['Jan de Vries', 'Jan de Vries'],
    ])
    expect(asked(served.nl)).toEqual([rawPath('Jan de Vries'), infoPath('Jan de Vries')])
    expect(asked(served.data)).toEqual([itemPath('Q100')])

    // A second run asks nothing and changes nothing.
    const again = await serve()

    expect(await search(again)).toEqual({ linked: 0, made: 0, searched: 0, warnings: [], without: 0 })
    expect(asked(again.nl)).toEqual([])
    expect(await rows('SELECT id FROM persons')).toHaveLength(1)
  })

  it('follows a redirect, and links rows that spell the name differently', async () => {
    const club = await addClub('N.E.C.', 'Q10')

    await addMatch(club, '1995/96', 'Jan Vries')

    const served = await serve(
      { nl: raw('Jan Vries', '#DOORVERWIJZING [[Jan de Vries (1970)]]') },
      article('Jan de Vries (1970)', 'Q100', footballer('Q10')),
    )

    await search(served)

    expect(await linked()).toEqual([['Jan Vries', 'Jan de Vries (1970)']])
    expect(await rows('SELECT name FROM persons')).toEqual([{ name: 'Jan de Vries' }])
    expect(await rows('SELECT page FROM person_pages ORDER BY page')).toEqual([
      { page: 'Jan Vries' },
      { page: 'Jan de Vries (1970)' },
    ])
  })

  it('tries "Name (voetballer)" for the seasons the first article does not fit', async () => {
    const club = await addClub('N.E.C.', 'Q10')
    const other = await addClub('Vitesse', 'Q20')

    await addMatch(club, '1995/96', 'Piet Smit')
    await addMatch(other, '1995/96', 'Piet Smit')

    const served = await serve(
      article('Piet Smit', 'Q100', footballer('Q10')),
      article('Piet Smit (voetballer)', 'Q101', footballer('Q10', 'Q20'), 8),
    )

    expect(await search(served)).toMatchObject({ linked: 2, made: 2 })
    // The first article that fits counts, so N.E.C. keeps it although the second fits too.
    expect(await linked()).toEqual([
      ['Piet Smit', 'Piet Smit'],
      ['Piet Smit', 'Piet Smit (voetballer)'],
    ])
  })

  it('does not ask for "(voetballer)" when the first article fits every season', async () => {
    await addMatch(await addClub('N.E.C.', 'Q10'), '1995/96', 'Piet Smit')

    const served = await serve(article('Piet Smit', 'Q100', footballer('Q10')))

    await search(served)

    expect(asked(served.nl)).not.toContain(rawPath('Piet Smit (voetballer)'))
  })

  it.each([
    ['no article', {}],
    ['an article without an item', { nl: { ...raw('Piet Smit'), ...infoRoute('Piet Smit', 7, null) } }],
    ['a disambiguation page', article('Piet Smit', 'Q100', { instanceOf: ['Q4167410'] })],
    ['a footballer of another club', article('Piet Smit', 'Q100', footballer('Q20'))],
    ['a club without years', article('Piet Smit', 'Q100', { instanceOf: ['Q5'], teams: [{ value: 'Q10' }] })],
    [
      'a deprecated statement',
      article('Piet Smit', 'Q100', {
        instanceOf: ['Q5'],
        teams: [{ rank: 'deprecated', start: year(1990), value: 'Q10' }],
      }),
    ],
    [
      'a club in other years',
      article('Piet Smit', 'Q100', { instanceOf: ['Q5'], teams: [{ start: year(2001), value: 'Q10' }] }),
    ],
    ['an item that is gone', { nl: { ...raw('Piet Smit'), ...infoRoute('Piet Smit', 7, 'Q100') } }],
  ])('leaves the row a name with %s, and remembers the search', async (_, routes) => {
    await addMatch(await addClub('N.E.C.', 'Q10'), '1995/96', 'Piet Smit')

    expect(await search(await serve(routes))).toEqual({ linked: 0, made: 0, searched: 1, warnings: [], without: 1 })
    expect(await rows('SELECT id FROM persons')).toEqual([])
    expect(await rows('SELECT name, season FROM opponent_name_searches')).toEqual([
      { name: 'Piet Smit', season: '1995/96' },
    ])
  })

  it('counts a statement with a normal rank next to a preferred one', async () => {
    await addMatch(await addClub('N.E.C.', 'Q10'), '1995/96', 'Piet Smit')

    await search(
      await serve(
        article('Piet Smit', 'Q100', {
          instanceOf: ['Q5'],
          teams: [
            { rank: 'preferred', start: year(2001), value: 'Q20' },
            { end: year(1997), value: 'Q10' },
          ],
        }),
      ),
    )

    expect(await linked()).toEqual([['Piet Smit', 'Piet Smit']])
  })

  it('uses the person who has the item or the article already', async () => {
    const club = await addClub('N.E.C.', 'Q10')

    await addMatch(club, '1995/96', 'Piet Smit', 'Kees Bos')
    await connection.db
      .insert(persons)
      .values([{ wikidataId: 'Q100', wikipediaPage: 'Pieter Smit' }, { wikipediaPage: 'Kees Bos' }])

    const served = await serve(
      article('Piet Smit', 'Q100', footballer('Q10')),
      article('Kees Bos', 'Q200', footballer('Q10'), 9),
    )

    expect(await search(served)).toMatchObject({ linked: 2, made: 0 })
    expect(await linked()).toEqual([
      ['Piet Smit', 'Pieter Smit'],
      ['Kees Bos', 'Kees Bos'],
    ])
    expect(await rows('SELECT id FROM persons')).toHaveLength(2)
  })

  it('does not take a person with a title of the English Wikipedia', async () => {
    await addMatch(await addClub('N.E.C.', 'Q10'), '1995/96', 'Piet Smit')
    await connection.db.insert(persons).values({ englishTitle: true, wikipediaPage: 'Piet Smit' })

    expect(await search(await serve(article('Piet Smit', 'Q100', footballer('Q10'))))).toMatchObject({
      linked: 0,
      made: 0,
      without: 1,
    })
  })

  it('searches only rows of the opponent that no rule can link', async () => {
    const club = await addClub('N.E.C.', 'Q10')
    const without = await addClub('Onbekend', null)
    const matchId = await addMatch(club, '1995/96', 'Via Naam', 'Via Selectie', 'Via Doelpunt', 'Op De Lijst')

    await addMatch(without, '1995/96', 'Zonder Nummer')
    await connection.db
      .insert(matchAppearances)
      .values({ matchId, ours: true, sourceName: 'Een Van Ons', starter: true })

    const [named] = await connection.db.insert(persons).values({ name: 'Via Naam' }).$returningId()

    await connection.db
      .insert(clubSquadPlayers)
      .values({ clubId: club, personId: named!.id, readAt: now, sourceName: 'Via Selectie' })

    const [goalRow] = await rows("SELECT id FROM match_appearances WHERE name = 'Via Doelpunt'")

    await connection.db.insert(matchGoals).values({
      appearanceId: Number(goalRow!['id']),
      matchId,
      minute: 1,
      ours: false,
      personId: named!.id,
      sourceName: 'Via Doelpunt',
    })

    const served = await serve()
    const report = await search(served, { exceptions: [{ club: 'N.E.C.', name: 'Op De Lijst' }] })

    expect(report.searched).toBe(0)
    expect(asked(served.nl)).toEqual([])
    expect(await rows('SELECT * FROM opponent_name_searches')).toEqual([])
  })

  it('never changes a row with a person', async () => {
    const club = await addClub('N.E.C.', 'Q10')

    await addMatch(club, '1995/96', 'Piet Smit')

    const [other] = await connection.db.insert(persons).values({ wikipediaPage: 'Een ander' }).$returningId()

    await database.pool.query('UPDATE match_appearances SET person_id = ?', [other!.id])
    await addMatch(club, '1996/97', 'Piet Smit')
    await search(await serve(article('Piet Smit', 'Q100', footballer('Q10'))))

    expect(await linked()).toEqual([
      ['Piet Smit', 'Een ander'],
      ['Piet Smit', 'Piet Smit'],
    ])
  })

  it('keeps the proven person of a club, also with two persons of one name', async () => {
    const club = await addClub('N.E.C.', 'Q10')
    const other = await addClub('Vitesse', 'Q20')
    const third = await addClub('Cambuur', 'Q30')

    await addMatch(club, '1995/96', 'Piet Smit')
    await addMatch(other, '1995/96', 'Piet Smit')
    await addMatch(third, '1995/96', 'Piet Smit')

    await search(
      await serve(
        article('Piet Smit', 'Q100', footballer('Q10')),
        article('Piet Smit (voetballer)', 'Q101', footballer('Q20'), 8),
      ),
    )
    await linkOpponentPersons(connection.db, { exceptions: [] })

    expect(await linked()).toEqual([
      ['Piet Smit', 'Piet Smit'],
      ['Piet Smit', 'Piet Smit (voetballer)'],
      // Two persons have the name, so the rule of the name gives nobody.
      ['Piet Smit', null],
    ])
  })

  it('leaves the rest of the rows of a name to the rule of the name, with one person', async () => {
    await addMatch(await addClub('N.E.C.', 'Q10'), '1995/96', 'Piet Smit')
    await addMatch(await addClub('Cambuur', 'Q30'), '1995/96', 'Piet Smit')

    await search(await serve(article('Piet Smit', 'Q100', footballer('Q10'))))

    expect(await linked()).toEqual([
      ['Piet Smit', 'Piet Smit'],
      ['Piet Smit', null],
    ])

    await linkOpponentPersons(connection.db, { exceptions: [] })

    expect(await linked()).toEqual([
      ['Piet Smit', 'Piet Smit'],
      ['Piet Smit', 'Piet Smit'],
    ])
  })

  it('searches the names with the most rows first, with all their clubs and seasons', async () => {
    const club = await addClub('N.E.C.', 'Q10')
    const other = await addClub('Vitesse', 'Q20')

    await addMatch(club, '1995/96', 'Een Rij', 'Drie Rijen')
    await addMatch(other, '1996/97', 'Drie Rijen')
    await addMatch(other, '1997/98', 'Drie Rijen', 'Twee Rijen')
    await addMatch(club, '1998/99', 'Twee Rijen')

    const served = await serve()

    expect(await search(served, { limit: 2 })).toMatchObject({ searched: 2 })
    expect(asked(served.nl)).toEqual(
      ['Drie Rijen', 'Drie Rijen (voetballer)', 'Twee Rijen', 'Twee Rijen (voetballer)'].map(rawPath),
    )
    expect(await rows("SELECT season FROM opponent_name_searches WHERE name = 'Drie Rijen'")).toHaveLength(3)
  })

  it('searches 50 names in a run at most', async () => {
    await addMatch(
      await addClub('N.E.C.', 'Q10'),
      '1995/96',
      ...Array.from({ length: mostNamesPerRun + 1 }, (_, index) => `Speler ${index}`),
    )

    expect(mostNamesPerRun).toBe(50)
    expect(await search(await serve())).toMatchObject({ searched: 50 })
    expect(await search(await serve())).toMatchObject({ searched: 1 })
  })

  it('searches again after 180 days: not after 179, but after 181', async () => {
    await addMatch(await addClub('N.E.C.', 'Q10'), '1995/96', 'Piet Smit')

    await search(await serve())

    const later = (days: number) => ({ clock: () => new Date(now.getTime() + days * day) })

    expect(await search(await serve(), later(179))).toMatchObject({ searched: 0 })
    expect(await search(await serve(), later(181))).toMatchObject({ searched: 1 })
    // The new search counts from its own day.
    expect(await search(await serve(), later(182))).toMatchObject({ searched: 0 })
  })

  it('searches a known name again at once for a new club or season', async () => {
    const club = await addClub('N.E.C.', 'Q10')

    await addMatch(club, '1995/96', 'Piet Smit')
    await search(await serve())
    await addMatch(club, '1996/97', 'Piet Smit')

    expect(await search(await serve(), { clock: () => new Date(now.getTime() + day) })).toMatchObject({ searched: 1 })
    expect(await rows('SELECT season FROM opponent_name_searches ORDER BY season')).toHaveLength(2)
  })

  it('does not remember a name of which a request fails, and searches it again', async () => {
    await addMatch(await addClub('N.E.C.', 'Q10'), '1995/96', 'Piet Smit')

    const broken = await serve({
      data: { [itemPath('Q100')]: reply(500) },
      nl: { ...raw('Piet Smit'), ...infoRoute('Piet Smit', 7, 'Q100') },
    })
    const report = await search(broken)

    expect(report).toMatchObject({ linked: 0, searched: 0 })
    expect(report.warnings).toEqual([
      "Opponents' names: warning, a request failed for 1 name, which a next run searches again",
    ])
    expect(await rows('SELECT * FROM opponent_name_searches')).toEqual([])
    expect(await search(await serve(article('Piet Smit', 'Q100', footballer('Q10'))))).toMatchObject({ linked: 1 })
  })

  it('stops after three failed requests in a row, and names nobody in the log', async () => {
    const names = ['Aad Een', 'Bob Twee', 'Cor Drie', 'Dik Vier']

    await addMatch(await addClub('N.E.C.', 'Q10'), '1995/96', ...names)

    const served = await serve({ nl: Object.fromEntries(names.map((name) => [rawPath(name), reply(500)])) })
    const lines = describeOpponentSearch(await search(served))

    expect(asked(served.nl)).toHaveLength(3)
    expect(lines).toEqual(["Opponents' names: warning, a request failed for 3 names, which a next run searches again"])
  })

  it('goes on when a request succeeds between the failures', async () => {
    const names = ['Aad Een', 'Bob Twee', 'Cor Drie', 'Dik Vier', 'Eef Vijf']

    await addMatch(await addClub('N.E.C.', 'Q10'), '1995/96', ...names)

    const served = await serve({
      nl: Object.fromEntries(names.filter((name) => name !== 'Cor Drie').map((name) => [rawPath(name), reply(500)])),
    })

    expect(await search(served)).toMatchObject({ searched: 1 })
    expect(asked(served.nl)).toContain(rawPath('Eef Vijf'))
  })

  it('stops at once when robots.txt refuses a request', async () => {
    await addMatch(await addClub('N.E.C.', 'Q10'), '1995/96', 'Aad Een', 'Bob Twee')

    const served = await serve({ nl: { '/robots.txt': reply(200, 'User-agent: *\nDisallow: /wiki/\n') } })

    expect(await search(served)).toMatchObject({
      searched: 0,
      warnings: ["Opponents' names: warning, robots.txt does not allow a request, so the search stops for this run"],
    })
    expect(asked(served.nl)).toEqual([])
  })

  it('stops at once when a server asks us to wait', async () => {
    await addMatch(await addClub('N.E.C.', 'Q10'), '1995/96', 'Aad Een', 'Bob Twee')

    const served = await serve({ nl: { [rawPath('Aad Een')]: reply(429, '', { 'Retry-After': '60' }) } })

    expect(await search(served)).toMatchObject({ searched: 0 })
    expect(asked(served.nl)).toEqual([rawPath('Aad Een')])
  })

  it('waits between two requests', async () => {
    await addMatch(await addClub('N.E.C.', 'Q10'), '1995/96', 'Piet Smit')

    const served = await serve(article('Piet Smit', 'Q100', footballer('Q10')))
    const start = performance.now()

    await search(served, { pause: 100 })

    // Three requests, so two waits.
    expect(performance.now() - start).toBeGreaterThanOrEqual(195)
  })

  it('leaves a name with redirects that lead nowhere a name, which is no failed request', async () => {
    await addMatch(await addClub('N.E.C.', 'Q10'), '1995/96', 'Piet Smit')

    const served = await serve({ nl: raw('Piet Smit', '#REDIRECT [[Piet Smit]]') })

    expect(await search(served)).toMatchObject({ searched: 1, warnings: [], without: 1 })
  })

  it('asks for no title that no article can have', async () => {
    await addMatch(await addClub('N.E.C.', 'Q10'), '1995/96', 'Speler?')

    const served = await serve()

    expect(await search(served)).toMatchObject({ searched: 1, without: 1 })
    expect(asked(served.nl)).toEqual([])
  })
})

describe('importOpponentSearch', () => {
  it('logs counts only', async () => {
    await addMatch(await addClub('N.E.C.', 'Q10'), '1995/96', 'Piet Smit', 'Kees Bos')

    const served = await serve(article('Piet Smit', 'Q100', footballer('Q10')))

    expect(
      await importOpponentSearch(connection.db, fetcherFor([served.nl, served.data]), {
        origin: served.nl.origin,
        pause: 0,
        wikidata: served.data.origin,
      }),
    ).toEqual(["Opponents' names: 2 searched, 1 new person, 1 row linked, 1 without a fitting article."])
  })

  it('turns a failure into a warning without names', async () => {
    const broken = {
      select: () => {
        throw new Error('Failed query: params: Piet Smit', { cause: Object.assign(new Error(), { code: 'ER_X' }) })
      },
    }

    expect(await importOpponentSearch(broken as never, fetcherFor([]), { origin: 'x', wikidata: 'y' })).toEqual([
      "Opponents' names: warning, not searched: ER_X",
    ])
  })

  it('has the names never searched in the status', async () => {
    await addMatch(await addClub('N.E.C.', 'Q10'), '1995/96', 'Piet Smit', 'Kees Bos')

    const status = async () => {
      const lines: string[] = []

      await showStatus(database.url, { clock: () => now, write: (line) => lines.push(line) })

      return lines.filter((line) => line.startsWith("Opponents' names"))
    }

    expect(await status()).toEqual(["Opponents' names not searched on Wikipedia yet: 2"])
    await search(await serve())
    expect(await status()).toEqual(["Opponents' names not searched on Wikipedia yet: 0"])
  })

  it('runs in the regular import, before the rows are linked', async () => {
    await addMatch(await addClub('N.E.C.', 'Q10'), '1995/96', 'Piet Smit')
    await addMatch(await addClub('Cambuur', 'Q30'), '1995/96', 'Piet Smit')

    const served = await serve(article('Piet Smit', 'Q100', footballer('Q10')))
    const lines: string[] = []

    await runImport(database.url, {
      makeFetcher: () => fetcherFor([served.nl, served.data]),
      personDataPause: 0,
      wikidataOrigin: served.data.origin,
      wikipediaOrigin: served.nl.origin,
      write: (line) => lines.push(line),
    })

    expect(lines.filter((line) => line.startsWith("Opponents'"))).toEqual([
      "Opponents' names: 1 searched, 1 new person, 1 row linked, 0 without a fitting article.",
      expect.stringContaining('1 through the name'),
    ])
  })
})
