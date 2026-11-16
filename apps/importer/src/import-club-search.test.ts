import type { TestDatabase } from '@fansite/db/test-database'
import type { RowDataPacket } from 'mysql2/promise'

import { connect } from '@fansite/db/client'
import { lockNameFor } from '@fansite/db/lock'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { fillStadiums } from './fill-stadiums.ts'
import {
  describeClubSearch,
  footballClubItem,
  runClubNumbersCommand,
  sameCountry,
  searchClubNumbers,
} from './import-club-search.ts'
import { readClubStadiums } from './import-club-stadiums.ts'
import { runImport } from './import-feeds.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'
import { infoRoute, itemRoute, labelRoute } from './test-wikidata.ts'

const now = new Date('2026-11-17T12:00:00Z')
const codes = new Map([
  ['Q29', 'ES'],
  ['Q55', 'NL'],
  ['Q142', 'FR'],
  ['Q145', 'GB'],
  ['Q183', 'DE'],
])
const club = (country: string, extra: Record<string, unknown> = {}) => ({
  countries: [country],
  instanceOf: [footballClubItem],
  ...extra,
})

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
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM club_home_grounds')
  await database.pool.query('DELETE FROM stadium_names')
  await database.pool.query('DELETE FROM stadiums')
  await database.pool.query('DELETE FROM clubs')
  await database.pool.query('DELETE FROM wikidata_items')
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

type Routes = { en?: Record<string, Handler>; nl?: Record<string, Handler>; wikidata?: Record<string, Handler> }

async function addClub(slug: string, name: string, country: null | string, extra = '') {
  await database.pool.query(
    `INSERT INTO clubs (slug, name, country, country_source${extra === '' ? '' : ', ' + extra.split('=')[0]}) VALUES (?, ?, ?, ?${extra === '' ? '' : ', ?'})`,
    [slug, name, country, country === null ? null : 'manual', ...(extra === '' ? [] : [extra.split('=')[1]])],
  )
}

async function rows(sql: string) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql)

  return result
}

async function serve({ en = {}, nl = {}, wikidata = {} }: Routes) {
  const robots = { '/robots.txt': reply(200, '', { 'Content-Type': 'text/plain' }) }
  const dutch = await startServer({ ...robots, ...nl })
  const english = await startServer({ ...robots, ...en })
  const data = await startServer({ ...robots, ...wikidata }, 'localhost')

  servers.push(dutch, english, data)

  return { data, en: english, nl: dutch }
}

const asked = (server: TestServer) => server.paths().filter((path) => path !== '/robots.txt')

async function search(served: Awaited<ReturnType<typeof serve>>, englishToo = true) {
  return searchClubNumbers(connection.db, fetcherFor([served.nl, served.en, served.data]), {
    clock: () => now,
    countryCodes: codes,
    englishOrigin: englishToo ? served.en.origin : null,
    origin: served.nl.origin,
    pause: 0,
    wikidata: served.data.origin,
  })
}

const numbers = () =>
  rows(
    'SELECT slug, country, country_source, wikidata_id, wikidata_source, wikidata_searched_at FROM clubs ORDER BY slug',
  )

describe('searchClubNumbers', () => {
  it('gives a club the item of the one article with its name, from the English Wikipedia too', async () => {
    await addClub('valencia-cf', 'Valencia CF', 'ES')

    const served = await serve({
      en: infoRoute('Valencia CF', 7, 'Q10'),
      nl: infoRoute('Valencia CF', 3, 'Q10'),
      wikidata: itemRoute('Q10', club('Q29')),
    })
    const report = await search(served)

    expect(report).toMatchObject({ found: 1, notFound: 0, searched: 1, warnings: [] })
    expect(await numbers()).toEqual([
      {
        country: 'ES',
        country_source: 'manual',
        slug: 'valencia-cf',
        wikidata_id: 'Q10',
        wikidata_searched_at: now,
        wikidata_source: 'name',
      },
    ])
    // One item for two articles: the item is read once.
    expect(asked(served.data)).toEqual(['/wiki/Special:EntityData/Q10.json'])
  })

  it('finds a club that only the English Wikipedia has an article for, and keeps a country of Great Britain', async () => {
    await addClub('west-ham', 'West Ham United', 'GB-ENG')

    const report = await search(
      await serve({ en: infoRoute('West Ham United', 7, 'Q11'), wikidata: itemRoute('Q11', club('Q145')) }),
    )

    expect(report.found).toBe(1)
    expect(await numbers()).toMatchObject([{ country: 'GB-ENG', wikidata_id: 'Q11', wikidata_source: 'name' }])
  })

  it('leaves a women’s team next to the club out: it is another kind of item', async () => {
    await addClub('lyon', 'Olympique Lyonnais', 'FR')

    const report = await search(
      await serve({
        en: infoRoute('Olympique Lyonnais', 7, 'Q12'),
        nl: infoRoute('Olympique Lyonnais', 3, 'Q13'),
        wikidata: {
          ...itemRoute('Q12', club('Q142')),
          ...itemRoute('Q13', { countries: ['Q142'], instanceOf: ['Q99'] }),
        },
      }),
    )

    expect(report.found).toBe(1)
    expect(await numbers()).toMatchObject([{ wikidata_id: 'Q12' }])
  })

  it('writes nothing for two real candidates, says how many there were, and does not search again', async () => {
    await addClub('twee', 'Twee', 'NL')

    const served = await serve({
      en: infoRoute('Twee', 7, 'Q21'),
      nl: infoRoute('Twee', 3, 'Q20'),
      wikidata: { ...itemRoute('Q20', club('Q55')), ...itemRoute('Q21', club('Q55')) },
    })
    const report = await search(served)

    expect(report).toMatchObject({ found: 0, notFound: 1, searched: 1 })
    expect(report.warnings).toEqual([
      "Clubs: 'Twee' has 2 candidates on Wikipedia (2 articles with this name), so it gets no number",
    ])
    expect(await numbers()).toMatchObject([{ wikidata_id: null, wikidata_searched_at: now, wikidata_source: null }])

    const before = asked(served.nl).length

    expect(await search(served)).toMatchObject({ searched: 0 })
    expect(asked(served.nl)).toHaveLength(before)
  })

  it('writes nothing for a name without an article, and does not ask about it again', async () => {
    await addClub('vvv', 'VVV', 'NL')

    const served = await serve({})
    const report = await search(served)

    expect(report.warnings).toEqual([
      "Clubs: 'VVV' has 0 candidates on Wikipedia (0 articles with this name), so it gets no number",
    ])
    expect(await numbers()).toMatchObject([{ wikidata_id: null, wikidata_searched_at: now }])
    expect(asked(served.nl)).toEqual(['/wiki/VVV?action=info'])
    expect(asked(served.en)).toEqual(['/wiki/VVV?action=info'])
    expect(await search(served)).toMatchObject({ searched: 0 })
    expect(asked(served.nl)).toHaveLength(1)
  })

  it('does not take an item of another country, or one that is no football club', async () => {
    await addClub('duits', 'Duits', 'NL')
    await addClub('stad', 'Stad', 'NL')

    const report = await search(
      await serve({
        nl: { ...infoRoute('Duits', 3, 'Q30'), ...infoRoute('Stad', 4, 'Q31') },
        wikidata: {
          ...itemRoute('Q30', club('Q183')),
          ...itemRoute('Q31', { countries: ['Q55'], instanceOf: ['Q515'] }),
        },
      }),
    )

    expect(report).toMatchObject({ found: 0, notFound: 2, searched: 2 })
    expect(await numbers()).toMatchObject([{ wikidata_id: null }, { wikidata_id: null }])
  })

  it('writes nothing when another club has the number, and says so', async () => {
    await addClub('eerste', 'Eerste', 'NL')
    await addClub('tweede', 'Tweede', 'NL')
    await database.pool.query(
      "UPDATE clubs SET wikidata_id = 'Q40', wikidata_source = 'wikipedia' WHERE slug = 'eerste'",
    )

    const report = await search(
      await serve({ nl: infoRoute('Tweede', 3, 'Q40'), wikidata: itemRoute('Q40', club('Q55')) }),
    )

    expect(report.warnings).toEqual([
      "Clubs: 'Tweede' has the candidate Q40 that another club has, so it gets no number",
    ])
    expect(await numbers()).toMatchObject([
      { slug: 'eerste', wikidata_id: 'Q40' },
      { slug: 'tweede', wikidata_id: null, wikidata_searched_at: now },
    ])
  })

  it('does not search a club without a country, a club with a number, or a club the editors emptied', async () => {
    await addClub('zonder', 'Zonder', null)
    await addClub('met', 'Met', 'NL')
    await addClub('leeg', 'Leeg', 'NL')
    await database.pool.query("UPDATE clubs SET wikidata_id = 'Q50', wikidata_source = 'manual' WHERE slug = 'met'")
    await database.pool.query("UPDATE clubs SET wikidata_searched_at = '2026-11-01 10:00:00' WHERE slug = 'leeg'")

    const served = await serve({})

    expect(await search(served)).toMatchObject({ searched: 0 })
    expect(asked(served.nl)).toEqual([])
    expect(await numbers()).toMatchObject([
      { slug: 'leeg', wikidata_id: null },
      { slug: 'met', wikidata_id: 'Q50', wikidata_source: 'manual' },
      { country: null, slug: 'zonder', wikidata_id: null, wikidata_searched_at: null },
    ])
  })

  it('waits for a club with an article that was not read yet, and leaves the country the editors filled in', async () => {
    await database.pool.query(
      "INSERT INTO clubs (slug, name, wikipedia_page, country, country_source) VALUES ('wacht', 'Wacht', 'Wacht', 'NL', 'wikidata')",
    )

    const served = await serve({})

    expect(await search(served)).toMatchObject({ searched: 0 })
    expect(asked(served.nl)).toEqual([])
  })

  it('leaves a club unsearched when a request fails, so the next run tries again, and stops after three failures', async () => {
    for (const slug of ['a', 'b', 'c', 'd']) {
      await addClub(slug, slug.toUpperCase(), 'NL')
    }

    const down = (request: unknown, response: { end: () => void; writeHead: (status: number) => void }) => {
      void request
      response.writeHead(500)
      response.end()
    }
    const served = await serve({
      nl: Object.fromEntries(['A', 'B', 'C', 'D'].map((name) => [`/wiki/${name}?action=info`, down as Handler])),
    })
    const report = await search(served)

    expect(report.searched).toBe(0)
    expect(report.warnings[0]).toContain('requests to search clubs failed, so those clubs are tried again next run')
    expect(await numbers()).toMatchObject([
      { wikidata_searched_at: null },
      { wikidata_searched_at: null },
      { wikidata_searched_at: null },
      { wikidata_searched_at: null },
    ])
    expect(asked(served.nl)).toHaveLength(3)
  })

  it('asks only the Dutch Wikipedia without an English address', async () => {
    await addClub('nl', 'Alleen', 'NL')

    const served = await serve({ nl: infoRoute('Alleen', 3, 'Q60'), wikidata: itemRoute('Q60', club('Q55')) })

    expect(await search(served, false)).toMatchObject({ found: 1 })
    expect(asked(served.en)).toEqual([])
  })
})

describe('the import', () => {
  it('searches a club without a number as a step, and a second import says nothing and asks nothing', async () => {
    await addClub('valencia-cf', 'Valencia CF', 'ES')
    await database.pool.query('DELETE FROM sources')

    const served = await serve({
      en: infoRoute('Valencia CF', 7, 'Q10'),
      wikidata: itemRoute('Q10', club('Q29')),
    })
    const run = async () => {
      const lines: string[] = []

      await runImport(database.url, {
        englishOrigin: served.en.origin,
        makeFetcher: () => fetcherFor([served.nl, served.en, served.data]),
        personDataPause: 0,
        wikidataOrigin: served.data.origin,
        wikipediaOrigin: served.nl.origin,
        write: (line) => lines.push(line),
      })

      return lines.filter((line) => line.startsWith('clubs (number by name)'))
    }

    expect(await run()).toEqual([
      'clubs (number by name): 1 club searched on Wikipedia, 1 got a number, 0 did not: the editors can fill it in',
    ])
    expect(await numbers()).toMatchObject([{ wikidata_id: 'Q10', wikidata_source: 'name' }])

    // The import asks the Dutch Wikipedia for other things too; the search is the page
    // information of the club.
    const searches = () => asked(served.nl).filter((path) => path?.includes('Valencia'))

    expect(searches()).toHaveLength(1)
    expect(await run()).toEqual([])
    expect(searches()).toHaveLength(1)
  })
})

describe('describeClubSearch', () => {
  it('says nothing for a run that searched nothing, else how many it searched and found', () => {
    expect(describeClubSearch({ found: 0, notFound: 0, searched: 0, warnings: [] })).toEqual([])
    expect(describeClubSearch({ found: 2, notFound: 1, searched: 3, warnings: [] })).toEqual([
      'clubs (number by name): 3 clubs searched on Wikipedia, 2 got a number, 1 did not: the editors can fill it in',
    ])
  })
})

describe('sameCountry', () => {
  it('takes the United Kingdom for a country of it, and nothing else for another country', () => {
    expect(sameCountry('NL', 'NL')).toBe(true)
    expect(sameCountry('GB-WLS', 'GB')).toBe(true)
    expect(sameCountry('GB-WLS', 'GB-WLS')).toBe(true)
    expect(sameCountry('GB-WLS', 'GB-ENG')).toBe(false)
    expect(sameCountry('NL', 'DE')).toBe(false)
    expect(sameCountry('NL', undefined)).toBe(false)
  })
})

describe('the command and the next steps', () => {
  it('finds Olympique Lyonnais, and the next import gives its away match of 2000 a stadium', async () => {
    await addClub('olympique-lyonnais', 'Olympique Lyonnais', 'FR')
    await database.pool.query(
      `INSERT INTO matches (club_id, opponent, competition, season, round, home, status, goals_for, goals_against,
         match_date, data_source)
       SELECT id, name, 'Champions League', '2000/01', 'Groepsfase', 0, 'played', 1, 1, '2000-09-12', 'oude-fansite' FROM clubs`,
    )

    const served = await serve({
      en: infoRoute('Olympique Lyonnais', 7, 'Q70'),
      wikidata: {
        ...itemRoute('Q70', club('Q142', { homeGrounds: [{ value: 'Q71' }] })),
        ...itemRoute('Q71', { labels: { nl: 'Stade de Gerland' }, placesIn: ['Q72'] }),
        ...labelRoute('Q72', 'Lyon'),
      },
    })
    const lines: string[] = []

    expect(
      await runClubNumbersCommand(database.url, {
        clock: () => now,
        englishOrigin: served.en.origin,
        makeFetcher: () => fetcherFor([served.nl, served.en, served.data]),
        personDataPause: 0,
        wikidataOrigin: served.data.origin,
        wikipediaOrigin: served.nl.origin,
        write: (line) => lines.push(line),
      }),
    ).toBe(0)
    expect(lines).toEqual([
      'clubs (number by name): 1 club searched on Wikipedia, 1 got a number, 0 did not: the editors can fill it in',
    ])
    expect(await numbers()).toMatchObject([
      { country: 'FR', country_source: 'manual', wikidata_id: 'Q70', wikidata_source: 'name' },
    ])

    // The steps that were already there do the rest.
    await readClubStadiums(connection.db, fetcherFor([served.data]), {
      clock: () => now,
      pause: 0,
      wikidata: served.data.origin,
    })
    await fillStadiums(connection.db)

    expect(await rows('SELECT stadium_id FROM matches')).not.toEqual([{ stadium_id: null }])
    expect(
      await rows('SELECT n.name FROM matches m JOIN stadium_names n ON n.stadium_id = m.stadium_id AND n.position = 0'),
    ).toEqual([{ name: 'Stade de Gerland' }])
  })

  it('says so and does nothing when an import holds the lock', async () => {
    const lines: string[] = []
    // The same lock name as the import, taken by another connection.
    const other = await database.pool.getConnection()

    try {
      await other.query('SELECT GET_LOCK(?, 0)', [lockNameFor(database.url, 'import')])

      expect(await runClubNumbersCommand(database.url, { write: (line) => lines.push(line) })).toBe(1)
      expect(lines).toEqual([
        'An import is still running on this database, so this command does nothing. Try again in a few minutes.',
      ])
    } finally {
      await other.query('SELECT RELEASE_LOCK(?)', [lockNameFor(database.url, 'import')])
      other.release()
    }
  })
})
