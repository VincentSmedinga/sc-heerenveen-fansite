import type { TestDatabase } from '@fansite/db/test-database'

import { listSeasonStandings, listWikipediaPages } from '@fansite/db/queries'
import { standings } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestServer } from './test-server.ts'

import { runTablesImport, tablesUsage } from './import-tables.ts'
import { oldStandingsPages, oldStandingsSeasons, pointsPerWinIn } from './old-standings.ts'
import { pageUrl } from './read-wikipedia.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/wikipedia-standings-${name}.wiki`, import.meta.url), 'utf8')

const wiki = { 'Content-Type': 'text/x-wiki; charset=UTF-8' }

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
  await database.pool.query('DELETE FROM standings')
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

async function run(server: TestServer, argument?: string) {
  const lines: string[] = []
  const code = await runTablesImport(database.url, argument, {
    makeFetcher: (robots) => fetcherFor([server], { robots }),
    wikipediaOrigin: server.origin,
    write: (line) => lines.push(line),
  })

  return { code, lines }
}

/** A Wikipedia that has these tables, by season. */
async function serve(tables: Record<string, string>) {
  const server = await startServer(
    Object.fromEntries(
      Object.entries(tables).map(([season, text]) => [
        pageUrl('', oldStandingsPages[season]?.title ?? ''),
        reply(200, text, wiki),
      ]),
    ),
  )

  servers.push(server)

  return server
}

describe('the list of final tables', () => {
  it('has the twenty seasons 1990/91 to 2009/10, and the two seasons in the Eerste divisie', () => {
    expect(oldStandingsSeasons).toHaveLength(20)
    expect(oldStandingsSeasons[0]).toBe('1990/91')
    expect(oldStandingsSeasons.at(-1)).toBe('2009/10')
    expect(Object.entries(oldStandingsPages).filter(([, page]) => page.competition === 'Eerste divisie')).toMatchObject(
      [
        ['1991/92', { clubs: 20 }],
        ['1992/93', { clubs: 18 }],
      ],
    )
  })

  it('counts two points for a win before 1995/96, and three from then on', () => {
    expect([pointsPerWinIn('1990/91'), pointsPerWinIn('1994/95')]).toEqual([2, 2])
    expect([pointsPerWinIn('1995/96'), pointsPerWinIn('2009/10')]).toEqual([3, 3])
  })
})

describe('the command for the final tables', () => {
  it('stores the table of 1990/91 with the points of the page, two for a win', async () => {
    const server = await serve({ '1990/91': fixture('1990-91') })
    const { code, lines } = await run(server, '1990/91')

    expect(code).toBe(0)
    expect(lines[0]).toContain('Table 1990/91: 18 clubs of the Eredivisie')
    expect((await listSeasonStandings(database.db, '1990/91')).slice(0, 2)).toMatchObject([
      { club: 'PSV', competition: 'Eredivisie', points: 53, position: 1 },
      { position: 2 },
    ])
  })

  it('stores the 20 clubs of 1991/92 as a table of the Eerste divisie', async () => {
    const server = await serve({ '1991/92': fixture('1991-92') })
    const { code } = await run(server, '1991/92')
    const table = await listSeasonStandings(database.db, '1991/92')

    expect(code).toBe(0)
    expect(table).toHaveLength(20)
    expect(new Set(table.map((row) => row.competition))).toEqual(new Set(['Eerste divisie']))
    expect(table[2]).toMatchObject({ club: 'sc Heerenveen', position: 3 })
  })

  it('reads the heading with a year, and replaces the rows of an earlier run, so a second run changes nothing', async () => {
    await database.db.insert(standings).values({
      club: 'Oude Club',
      drawn: 0,
      goalDifference: 0,
      goalsAgainst: 0,
      goalsFor: 0,
      lost: 0,
      played: 0,
      points: 0,
      pointsDeducted: 0,
      position: 1,
      season: '1998/99',
      validOn: '1999-06-30',
      won: 0,
    })

    const server = await serve({ '1998/99': fixture('1998-99') })

    await run(server, '1998/99')

    const first = await listSeasonStandings(database.db, '1998/99')

    await run(server, '1998/99')

    expect(first).toHaveLength(18)
    expect(first[0]).toMatchObject({ club: 'Feyenoord', points: 80 })
    expect(await listSeasonStandings(database.db, '1998/99')).toEqual(first)
    expect(await listWikipediaPages(database.db, '1998/99')).toMatchObject([
      { kind: 'standings', language: 'nl', title: 'Eredivisie 1998/99' },
    ])
  })

  it('stores nothing and says why when a number does not add up', async () => {
    const server = await serve({ '1990/91': fixture('1990-91').replace("'''53'''", "'''54'''") })
    const { code, lines } = await run(server, '1990/91')

    expect(code).toBe(1)
    expect(lines.join('\n')).toContain('PSV: points are not 2 x won + drawn')
    expect(await listSeasonStandings(database.db, '1990/91')).toEqual([])
  })

  it('says a page is missing and goes on with the other seasons', async () => {
    const server = await serve({ '1998/99': fixture('1998-99') })
    const { code, lines } = await run(server, '')

    expect(code).toBe(1)
    expect(lines.filter((line) => line.includes('not stored'))).toHaveLength(19)
    expect(lines.at(-1)).toBe('Tables: 1 of 20 stored.')
    expect(await listSeasonStandings(database.db, '1998/99')).toHaveLength(18)
  })

  it('refuses a season that has no page in the list, without a request', async () => {
    const server = await serve({})
    const { code, lines } = await run(server, '2010/11')

    expect(code).toBe(1)
    expect(lines.join('\n')).toContain(tablesUsage)
    expect(server.requests).toEqual([])
  })
})
