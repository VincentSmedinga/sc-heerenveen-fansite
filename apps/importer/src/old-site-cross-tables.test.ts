import type { NewMatch } from '@fansite/db/schema'
import type { TestDatabase } from '@fansite/db/test-database'

import { clubNames, clubs, matches } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Fetcher, FetchOutcome } from './fetcher.ts'
import type { OldSiteMatch } from './old-site-file.ts'

import { compareCrossTables, crossTableSeasonsOf, fetchCrossTables } from './old-site-cross-tables.ts'

const eredivisie199091 = readFileSync(new URL('./fixtures/wikipedia-cross-table-1990-91.wiki', import.meta.url), 'utf8')
const origin = 'https://nl.wikipedia.org'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  for (const table of ['matches', 'club_names', 'clubs']) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
})

/** A fetcher that answers from a list of pages by their address, and keeps what was asked. */
function fetcherOf(pages: Record<string, FetchOutcome['kind'] | string>) {
  const asked: string[] = []
  const fetcher: Fetcher = {
    fetch: async (input) => {
      const url = String(input)
      const page = pages[url]

      asked.push(url)
      if (page === undefined) {
        return { kind: 'error', message: 'HTTP 404', reason: 'http-status', status: 404, url }
      }
      if (page === 'wait') {
        return { kind: 'wait', retryAfterSeconds: null, status: 429, url }
      }
      if (page === 'blocked-by-robots') {
        return { kind: 'blocked-by-robots', url }
      }
      if (page === 'error') {
        return { kind: 'error', message: 'The request took longer than 10 seconds', reason: 'timeout', url }
      }

      return {
        body: new TextEncoder().encode(page),
        contentType: 'text/x-wiki',
        etag: null,
        kind: 'fetched',
        lastModified: null,
        url,
      }
    },
  }

  return { asked, fetcher }
}

function oldMatch(overrides: Partial<OldSiteMatch>): OldSiteMatch {
  return {
    attendance: null,
    code: 'testdorp.thuis',
    competition: 1,
    dateTime: '1990-08-25 19:30:00',
    events: [],
    lineup: [],
    note: null,
    referee: null,
    result: { awayFullTime: 0, awayHalfTime: 0, homeFullTime: 0, homeHalfTime: 0, note: null },
    round: 1,
    season: '9091',
    statistics: { awayCorners: 0, awayFouls: 0, awayOffside: 0, homeCorners: 0, homeFouls: 0, homeOffside: 0 },
    ...overrides,
  }
}

const season = (name: string, competition: 'Eerste divisie' | 'Eredivisie' = 'Eredivisie') => ({
  competition,
  season: name,
  title: `${competition} ${name}`,
})

describe('crossTableSeasonsOf', () => {
  it('names each season of a league in the files once, the oldest first, and no cup or later season', () => {
    const seasons = crossTableSeasonsOf({
      matches: [
        oldMatch({ competition: 7, dateTime: '1992-08-22 19:30:00', season: '9293' }),
        oldMatch({}),
        oldMatch({ code: 'testdorp.uit', dateTime: '1991-02-02 19:30:00' }),
        // The cup has no cross table.
        oldMatch({ code: 'testdorp.bekerthuis', competition: 2, dateTime: '1993-10-10 14:30:00', season: '9394' }),
        // A season after the old fansite: the import of Wikipedia has those matches.
        oldMatch({ dateTime: '2007-08-18 19:45:00', season: '0708' }),
      ],
    })

    expect(seasons).toEqual([season('1990/91'), season('1992/93', 'Eerste divisie')])
    expect(crossTableSeasonsOf({ matches: [] })).toEqual([])
  })
})

describe('fetchCrossTables', () => {
  it('asks for the raw page of each season, and follows a redirect', async () => {
    const { asked, fetcher } = fetcherOf({
      [`${origin}/wiki/Eerste_divisie_1992/93?action=raw`]:
        '#DOORVERWIJZING [[Eerste divisie 1992/93 (mannenvoetbal)]]',
      [`${origin}/wiki/Eerste_divisie_1992/93_(mannenvoetbal)?action=raw`]: 'tweede pagina',
      [`${origin}/wiki/Eredivisie_1990/91?action=raw`]: 'eerste pagina',
    })
    const fetched = await fetchCrossTables(
      fetcher,
      origin,
      [season('1990/91'), season('1992/93', 'Eerste divisie'), season('1993/94')],
      0,
    )

    expect(fetched).toEqual([
      { ...season('1990/91'), kind: 'page', text: 'eerste pagina' },
      { ...season('1992/93', 'Eerste divisie'), kind: 'page', text: 'tweede pagina' },
      { ...season('1993/94'), kind: 'none', reason: 'de pagina Eredivisie 1993/94 bestaat niet' },
    ])
    expect(asked).toHaveLength(4)
  })

  it('gives the reason of a page that fails and goes on with the next', async () => {
    const { fetcher } = fetcherOf({
      [`${origin}/wiki/Eredivisie_1990/91?action=raw`]: 'error',
      [`${origin}/wiki/Eredivisie_1993/94?action=raw`]: 'pagina',
    })
    const fetched = await fetchCrossTables(fetcher, origin, [season('1990/91'), season('1993/94')], 0)

    expect(fetched).toMatchObject([
      {
        kind: 'none',
        reason: 'de pagina Eredivisie 1990/91 was niet op te halen (The request took longer than 10 seconds)',
      },
      { kind: 'page', text: 'pagina' },
    ])
  })

  it('asks nothing more after a request to wait or a refusal by robots.txt', async () => {
    for (const [answer, reason] of [
      ['wait', 'Wikipedia vroeg om te wachten'],
      ['blocked-by-robots', 'robots.txt van Wikipedia staat de pagina niet toe'],
    ] as const) {
      const { asked, fetcher } = fetcherOf({
        [`${origin}/wiki/Eredivisie_1990/91?action=raw`]: answer,
        [`${origin}/wiki/Eredivisie_1993/94?action=raw`]: 'pagina',
      })
      const fetched = await fetchCrossTables(fetcher, origin, [season('1990/91'), season('1993/94')], 0)

      expect(fetched.map((one) => one.kind === 'none' && one.reason)).toEqual([reason, reason])
      expect(asked).toHaveLength(1)
    }
  })
})

describe('compareCrossTables', () => {
  const played: Omit<NewMatch, 'clubId' | 'opponent' | 'round'> = {
    competition: 'Eredivisie',
    dataSource: 'oude-fansite',
    goalsAgainst: 4,
    goalsFor: 1,
    home: true,
    matchDate: '1990-09-01',
    season: '1990/91',
    status: 'played',
  }

  /** The clubs of the test: found by their article, by another name or by their name. */
  async function insertClubs() {
    await database.db.insert(clubs).values([
      { name: 'Ajax', slug: 'ajax', wikipediaPage: 'AFC Ajax' },
      { name: 'Feyenoord', slug: 'feyenoord' },
      // Found by its article alone: the table shows `FC Den Haag`.
      { name: 'Haagse Club', slug: 'haagse-club', wikipediaPage: 'ADO Den Haag' },
      { name: 'FC Groningen', slug: 'fc-groningen' },
      { name: 'Fortuna', slug: 'fortuna' },
      { name: 'MVV', slug: 'mvv', wikipediaPage: 'MVV Maastricht' },
    ])

    const rows = await database.db.select().from(clubs)
    const id = (name: string) => rows.find((row) => row.name === name)?.id ?? 0

    // The table calls this club `Fortuna Sittard`: it is found by its other name.
    await database.db.insert(clubNames).values({ clubId: id('Fortuna'), name: 'Fortuna Sittard' })

    return id
  }

  const compare = async () =>
    compareCrossTables({ select: database.db.select.bind(database.db) }, [
      { ...season('1990/91'), kind: 'page', text: eredivisie199091 },
    ])

  it('lists the scores that differ and the matches the database does not have', async () => {
    const id = await insertClubs()
    const match = (name: string, round: number, values: Partial<NewMatch>): NewMatch => ({
      ...played,
      clubId: id(name),
      opponent: name,
      round: `Speelronde ${round}`,
      ...values,
    })

    await database.db.insert(matches).values([
      // The same as the table: home 1-4, away 4-0 for Ajax.
      match('Ajax', 1, {}),
      match('Ajax', 2, { goalsAgainst: 4, goalsFor: 0, home: false, matchDate: '1991-02-03' }),
      // The table has 0-0 at home, and 1-1 away.
      match('Feyenoord', 3, { goalsAgainst: 1, goalsFor: 0, matchDate: '1990-09-08' }),
      match('Feyenoord', 4, { goalsAgainst: 1, goalsFor: 2, home: false, matchDate: '1991-02-10' }),
      // Only the away match, without a score; the table has 3-2 for FC Den Haag.
      match('Haagse Club', 5, {
        goalsAgainst: null,
        goalsFor: null,
        home: false,
        matchDate: '1990-10-06',
        status: 'postponed',
      }),
      // Twice at home with a score, from two sources.
      match('FC Groningen', 6, { goalsAgainst: 2, goalsFor: 4, matchDate: '1990-11-03' }),
      match('FC Groningen', 7, {
        dataSource: 'wikipedia',
        dateText: '4 november 1990',
        goalsAgainst: 2,
        goalsFor: 4,
        matchDate: '1990-11-04',
      }),
      // A postponed match and the match that was played: the one with a score is compared.
      match('Fortuna', 8, { goalsAgainst: null, goalsFor: null, matchDate: '1990-12-01', status: 'postponed' }),
      match('Fortuna', 9, { goalsAgainst: 2, goalsFor: 1, matchDate: '1991-03-06' }),
      // The cup against the same club is another competition.
      match('MVV', 10, { competition: 'KNVB Beker', goalsAgainst: 0, goalsFor: 5, matchDate: '1990-11-10' }),
      // Another season against the same club.
      match('MVV', 11, { goalsAgainst: 0, goalsFor: 5, matchDate: '1993-11-10', season: '1993/94' }),
    ])

    const [table, ...others] = await compare()

    expect(others).toEqual([])
    expect(table).toMatchObject({
      compared: 34,
      competition: 'Eredivisie',
      season: '1990/91',
      title: 'Eredivisie 1990/91',
      unreadable: null,
      url: 'https://nl.wikipedia.org/wiki/Eredivisie_1990/91',
    })
    const unknown = (line: string) => line.includes('geen club met die naam in de database')

    // Sorted on the opponent, the home match first.
    expect(table?.lines.filter((line) => !unknown(line))).toEqual([
      'Thuis tegen FC Groningen: de database heeft 2 wedstrijden met een uitslag (3 november 1990 en 4 november 1990), de kruistabel heeft er één (4-2)',
      'Uit tegen FC Groningen: staat in de kruistabel (3-0) en niet in de database',
      'Thuis tegen Feyenoord, 8 september 1990: de database heeft 0-1, de kruistabel heeft 0-0',
      'Uit tegen Feyenoord, 10 februari 1991: de database heeft 1-2, de kruistabel heeft 1-1',
      'Uit tegen Fortuna: staat in de kruistabel (1-0) en niet in de database',
      'Thuis tegen Haagse Club: staat in de kruistabel (3-0) en niet in de database',
      'Uit tegen Haagse Club, 6 oktober 1990: de database heeft geen uitslag, de kruistabel heeft 3-2',
      'Thuis tegen MVV: staat in de kruistabel (1-0) en niet in de database',
      'Uit tegen MVV: staat in de kruistabel (2-0) en niet in de database',
    ])
    expect(table?.lines).toContain('Thuis tegen PSV: geen club met die naam in de database, de kruistabel heeft 0-3')
    // Eleven of the seventeen opponents are not in the database, at home and away.
    expect(table?.lines.filter(unknown)).toHaveLength(2 * 11)
    expect(table?.lines.join('\n')).not.toContain('Ajax')
  })

  it('finds a club by the name another season shows for the same article', async () => {
    await database.db.insert(clubs).values({ name: 'FC Den Haag', slug: 'fc-den-haag' })

    // The row of this season calls the club of the article `ADO Den Haag` just `Den Haag`.
    const renamed = eredivisie199091.replace("'''[[ADO Den Haag|FC Den Haag]]'''", "'''[[ADO Den Haag|Den Haag]]'''")
    const alone = await compareCrossTables(database.db, [{ ...season('1993/94'), kind: 'page', text: renamed }])
    const withOther = await compareCrossTables(database.db, [
      { ...season('1990/91'), kind: 'page', text: eredivisie199091 },
      { ...season('1993/94'), kind: 'page', text: renamed },
    ])

    expect(alone[0]?.lines).toContain(
      'Thuis tegen Den Haag: geen club met die naam in de database, de kruistabel heeft 3-0',
    )
    expect(withOther[1]?.lines).toContain(
      'Thuis tegen FC Den Haag: staat in de kruistabel (3-0) en niet in de database',
    )
  })

  it('says why a season has no comparison', async () => {
    const tables = await compareCrossTables(database.db, [
      { ...season('1990/91'), kind: 'none', reason: 'de pagina Eredivisie 1990/91 bestaat niet' },
      { ...season('1993/94'), kind: 'page', text: '== Eindstand ==' },
      // The Eredivisie of a season sc Heerenveen played a division lower.
      { ...season('1992/93'), kind: 'page', text: eredivisie199091.replaceAll('sc Heerenveen', 'Testdorp FC') },
      {
        ...season('1994/95'),
        kind: 'page',
        text: eredivisie199091.replace(
          "|align=right|'''[[Feyenoord]]'''||",
          "|align=right|'''[[Feyenoord]]'''||1 – 0||",
        ),
      },
    ])

    expect(tables.map((table) => table.unreadable)).toEqual([
      'de pagina Eredivisie 1990/91 bestaat niet',
      'de pagina heeft geen kopje Uitslagen',
      'sc Heerenveen staat niet in de tabel',
      'de rijen van de tabel passen niet bij de kolommen (the row of Feyenoord)',
    ])
    expect(tables.flatMap((table) => table.lines)).toEqual([])
    expect(await compareCrossTables(database.db, [])).toEqual([])
  })

  it('names a cell of ours that is no score, without the signs that are Markdown', async () => {
    const text = eredivisie199091.replace(
      /(\|align=right\|'''\[\[sc Heerenveen\]\]'''\|\|bgcolor="#FFCCCC"\|)1 – 4/u,
      '$1af_ge*l`ast',
    )
    const [table] = await compareCrossTables(database.db, [{ ...season('1990/91'), kind: 'page', text }])

    expect(table?.compared).toBe(33)
    expect(table?.lines).toContain('Thuis tegen Ajax: de uitslag in de kruistabel is niet te lezen (`afgelast`)')
  })
})
