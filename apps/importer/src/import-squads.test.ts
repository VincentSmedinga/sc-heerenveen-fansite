import type { TestDatabase } from '@fansite/db/test-database'

import { lockNameFor, withLock } from '@fansite/db/lock'
import {
  persons,
  players,
  playerSeasonStats,
  squadCompleteness,
  squadImports,
  wikipediaPages,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { MergedPlayer } from './import-past-squad.ts'
import type { Handler, TestServer } from './test-server.ts'

import { formatPastSquadReport, importPastSquad, mergePlayers } from './import-past-squad.ts'
import { fromSquadUsage, runSquadImport, runSquadsImport, squadUsage } from './import-squads.ts'
import { englishSquadPage } from './read-english-squad.ts'
import { squadPageTitle } from './read-squad.ts'
import { transfersPageTitle } from './read-transfers.ts'
import { pageUrl } from './read-wikipedia.ts'
import { squadSources } from './squad-sources.ts'
import { articleRoutes } from './test-articles.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

const wiki = { 'Content-Type': 'text/x-wiki; charset=UTF-8', 'Last-Modified': 'Fri, 29 May 2026 08:00:00 GMT' }

/** Sunday 25 October 2026: the current season is 2026/27, and 2025/26 is over. */
const now = new Date('2026-10-25T12:00:00Z')

/**
 * The page of 2013/14 with two lists: the table of the selection of the fixture of that season,
 * and the lists of transfers of 2007/08 under it, in which Cecilio Lopes is Marten de Roon, who
 * is in the selection too.
 */
const twoLists = (() => {
  const transfers = fixture('wikipedia-transfers-2007-08.wiki')

  return (
    fixture('wikipedia-selection-2013-14.wiki').split('== Transfers ==')[0] +
    transfers.slice(transfers.indexOf('==Transfers==')).replace('[[Cecilio Lopes]]', '[[Marten de Roon]]')
  )
})()

/** The same page, but a heading of the selection that no reader knows. */
const brokenList = twoLists.replace('Keepers', 'Reservisten')

const season = '2013/14'

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
    'squad_completeness',
    'squad_imports',
    'wikipedia_pages',
    'persons',
    'sources',
  ]) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

/** The path a page is asked on. */
const pathOf = (title: string) => pageUrl('', title)

/** Reads the squad of a season at this moment from this server, and gives the report. */
function importAt(server: TestServer, forSeason: string, englishServer: TestServer = server) {
  return importPastSquad(database.db, fetcherFor([server, englishServer]), forSeason, {
    clock: () => now,
    englishOrigin: englishServer.origin,
    origin: server.origin,
  })
}

/** The requests for pages so far; the robots.txt is not counted. */
function pageRequests(server: TestServer) {
  return server.paths().filter((path) => path !== '/robots.txt')
}

/** Runs one of the commands against these servers, and collects what it prints. */
async function runCommand(
  command: typeof runSquadImport,
  argument: string | undefined,
  server: TestServer,
  englishServer: TestServer = server,
) {
  const lines: string[] = []
  const code = await command(database.url, argument, {
    clock: () => now,
    englishOrigin: englishServer.origin,
    makeFetcher: (robots) => fetcherFor([server, englishServer], { robots }),
    wikipediaOrigin: server.origin,
    write: (line) => lines.push(line),
  })

  return { code, lines }
}

/**
 * Starts a web server on this computer that serves Wikipedia pages: the pages of `pages` by
 * title, and an article for every title they link, so the persons can be looked up. Any other
 * path is a 404, as on Wikipedia. The tests ask no real site.
 */
async function serve(pages: Record<string, string>, extra: Record<string, Handler> = {}) {
  const server = await startServer({
    '/robots.txt': reply(200, '', { 'Content-Type': 'text/plain' }),
    ...articleRoutes(Object.values(pages)),
    ...Object.fromEntries(Object.entries(pages).map(([title, text]) => [pathOf(title), reply(200, text, wiki)])),
    ...extra,
  })

  servers.push(server)

  return server
}

async function storedPlayers(forSeason = season) {
  return database.db.select().from(players).where(eq(players.season, forSeason)).orderBy(asc(players.name))
}

describe('squadSources', () => {
  it('has a Dutch table of statistics for 1990/91 to 1999/00 and 2005/06', () => {
    for (const forSeason of ['1990/91', '1995/96', '1999/00', '2005/06']) {
      const sources = squadSources(forSeason)

      expect(sources).toHaveLength(1)
      expect(sources[0]?.origin).toBe('nl')
      expect(sources[0]?.title).toBe(`Sc Heerenveen in het seizoen ${forSeason}`)
      expect(sources[0]?.readers.map((reader) => reader.name)).toEqual(['statistics'])
    }
  })

  it('has the transfers and the scorers for 2006/07, on the page without "(mannen)"', () => {
    const [source, ...others] = squadSources('2006/07')

    expect(others).toEqual([])
    expect(source?.title).toBe(transfersPageTitle('2006/07'))
    expect(source?.title).toBe('Sc Heerenveen in het seizoen 2006/07')
    expect(source?.readers.map((reader) => reader.name)).toEqual(['transfers', 'scorers'])
  })

  it('has the selection and the transfers for 2007/08 to 2017/18, on the page with "(mannen)"', () => {
    for (const forSeason of ['2007/08', '2012/13', '2017/18']) {
      const [source, ...others] = squadSources(forSeason)

      expect(others).toEqual([])
      expect(source?.title).toBe(`Sc Heerenveen in het seizoen ${forSeason} (mannen)`)
      expect(source?.readers.map((reader) => reader.name)).toEqual(['selection', 'transfers'])
    }
  })

  it('has the squad table for 2022/23 and 2023/24', () => {
    for (const forSeason of ['2022/23', '2023/24']) {
      const [source] = squadSources(forSeason)

      expect(source?.title).toBe(squadPageTitle(forSeason))
      expect(source?.readers.map((reader) => reader.name)).toEqual(['squad table'])
    }
  })

  it('has the English page for the five seasons the Dutch Wikipedia has no squad for', () => {
    for (const forSeason of ['2018/19', '2019/20', '2020/21', '2021/22', '2024/25']) {
      const [source] = squadSources(forSeason)

      expect(source?.origin).toBe('english')
      expect(source?.title).toBe(englishSquadPage(forSeason))
      expect(source?.readers.map((reader) => reader.name)).toEqual(['English squad'])
    }
  })

  it('has no reader for the seasons without a page', () => {
    for (const forSeason of ['2000/01', '2002/03', '2004/05', '2025/26', '1989/90']) {
      expect(squadSources(forSeason)).toEqual([])
    }
  })
})

describe('mergePlayers', () => {
  const read = (source: MergedPlayer['source'], ...found: Partial<MergedPlayer>[]) => ({
    players: found.map((one) => ({
      appearances: 12,
      goals: 3,
      name: 'Name',
      page: null,
      position: null,
      shirtNumber: null,
      ...one,
    })),
    source,
  })

  it('merges a player of two lists by his page, and keeps the best source with the position and number it has', () => {
    const { players: merged } = mergePlayers([
      read('transfers', { name: 'Marten de Roon', page: 'Marten de Roon' }),
      read('selectie', { name: 'Marten de Roon', page: 'Marten de Roon', position: 'middenvelder', shirtNumber: 15 }),
    ])

    expect(merged).toEqual([
      { name: 'Marten de Roon', page: 'Marten de Roon', position: 'middenvelder', shirtNumber: 15, source: 'selectie' },
    ])
  })

  it('takes the position and the number of the list that has them, also when it is not the best', () => {
    const { players: merged } = mergePlayers([
      read('selectie', { name: 'Jakob Poulsen', page: 'Jakob Poulsen' }),
      read('engels', { name: 'Jakob Poulsen', position: 'middenvelder', shirtNumber: 8 }),
    ])

    expect(merged).toEqual([
      { name: 'Jakob Poulsen', page: 'Jakob Poulsen', position: 'middenvelder', shirtNumber: 8, source: 'selectie' },
    ])
  })

  it('merges by name, without accents and capitals, when a list has no page', () => {
    const { players: merged } = mergePlayers([
      read('engels', { name: 'Arbër Zeneli', position: 'middenvelder' }),
      read('transfers', { name: 'ARBER ZENELI', page: 'Arbër Zeneli' }),
    ])

    expect(merged).toEqual([
      { name: 'Arbër Zeneli', page: 'Arbër Zeneli', position: 'middenvelder', shirtNumber: null, source: 'engels' },
    ])
  })

  it('keeps two players with different pages apart, and warns about a name that is taken', () => {
    const { players: merged, warnings } = mergePlayers([
      read(
        'selectie',
        { name: 'Jan de Boer', page: 'Jan de Boer (voetballer, 1990)' },
        { name: 'Jan de Boer', page: 'Jan de Boer (voetballer, 2000)' },
      ),
    ])

    expect(merged.map((one) => one.page)).toEqual(['Jan de Boer (voetballer, 1990)'])
    expect(warnings).toEqual(['Jan de Boer: a second player with this name, so he is left out'])
  })

  it('leaves out a number the database cannot hold, and does not keep the matches and goals', () => {
    const { players: merged } = mergePlayers([read('selectie', { name: 'Een Speler', shirtNumber: 120 })])

    expect(merged).toEqual([{ name: 'Een Speler', page: null, position: null, shirtNumber: null, source: 'selectie' }])
  })
})

describe('importPastSquad', () => {
  it('puts the lists of two readers together, with the best source, and stores the page for the credit', async () => {
    const server = await serve({ [squadPageTitle(season)]: twoLists })
    const report = await importAt(server, season)

    expect(report).toMatchObject({ kind: 'imported', pages: 1, players: { improved: 0, unchanged: 0 }, season })

    const rows = await storedPlayers()
    const deRoon = rows.filter((row) => row.name === 'Marten de Roon')

    // In both lists: one row, with the source, position and number of the selection.
    expect(deRoon).toHaveLength(1)
    expect(deRoon[0]).toMatchObject({
      inSquad: true,
      leftSquadAt: null,
      position: 'middenvelder',
      shirtNumber: 15,
      source: 'selectie',
      wikipediaPage: 'Marten de Roon',
    })
    expect(deRoon[0]?.personId).not.toBeNull()
    // Only in the transfers: that source, and no position or number.
    expect(rows.find((row) => row.name === 'Niek Loohuis')).toMatchObject({
      position: null,
      shirtNumber: null,
      source: 'transfers',
    })
    expect(new Set(rows.map((row) => row.source))).toEqual(new Set(['selectie', 'transfers']))
    // The matches and goals of a table do not go to the numbers of the players.
    expect(await database.db.select().from(playerSeasonStats)).toEqual([])
    expect(await database.db.select().from(wikipediaPages)).toEqual([
      { kind: 'squad', readAt: now, season, title: squadPageTitle(season), version: wiki['Last-Modified'] },
    ])
    expect(await database.db.select().from(squadImports)).toMatchObject([
      { failuresInARow: 0, lastOutcome: 'imported', season },
    ])
    // The chance is stored with the read: two sources, and the best of them.
    const [completeness] = await database.db.select().from(squadCompleteness)

    expect(completeness).toMatchObject({
      bestSource: 'selectie',
      calculatedAt: now,
      playerCount: rows.length,
      season,
    })
    expect(completeness?.probability).toBeGreaterThan(0)
    expect(formatPastSquadReport(report)).toContain(`Completeness ${season}: ${completeness?.probability}%`)
  })

  it('asks one request for each new title of a player, says how many, and none the second time', async () => {
    const server = await serve({ [squadPageTitle(season)]: twoLists })
    const report = await importAt(server, season)
    const titles = (await storedPlayers()).filter((row) => row.wikipediaPage !== null)

    expect(report.kind === 'imported' && report.persons).toEqual([
      expect.stringContaining(`persons: ${titles.length} titles asked`),
    ])
    // The page, and one request for each title.
    expect(pageRequests(server)).toHaveLength(1 + titles.length)

    const again = await importAt(server, season)

    expect(again).toMatchObject({ kind: 'imported', persons: [] })
    expect(pageRequests(server)).toHaveLength(2 + titles.length)
  })

  it('writes no player when it reads the season a second time', async () => {
    const server = await serve({ [squadPageTitle(season)]: twoLists })

    await importAt(server, season)

    const before = { persons: await database.db.select().from(persons), players: await storedPlayers() }
    const again = await importAt(server, season)

    expect(again).toMatchObject({ kind: 'imported', players: { added: 0, improved: 0 } })
    expect(await storedPlayers()).toEqual(before.players)
    expect(await database.db.select().from(persons)).toEqual(before.persons)
  })

  it('improves a source, a position and a number on a second read, and removes nobody', async () => {
    const server = await serve({ [squadPageTitle(season)]: twoLists })

    await database.db.insert(players).values([
      // Known from a worse list, without a position or a number.
      {
        name: 'Marten de Roon',
        searchTerm: 'de Roon',
        season,
        source: 'transfers',
        wikipediaPage: 'Marten de Roon',
      },
      // Not on the page any more: stays.
      { name: 'Een Oude Speler', searchTerm: 'Speler', season, source: 'doelpunten' },
    ])

    const report = await importAt(server, season)

    expect(report).toMatchObject({ kind: 'imported', players: { improved: 1 } })

    const rows = await storedPlayers()

    expect(rows.find((row) => row.name === 'Marten de Roon')).toMatchObject({
      position: 'middenvelder',
      shirtNumber: 15,
      source: 'selectie',
    })
    expect(rows.find((row) => row.name === 'Een Oude Speler')).toMatchObject({ inSquad: true, source: 'doelpunten' })
  })

  it('does not replace a position or number with one of a worse list', async () => {
    const server = await serve({ [squadPageTitle(season)]: twoLists })

    await database.db.insert(players).values({
      name: 'Niek Loohuis',
      position: 'verdediger',
      searchTerm: 'Loohuis',
      season,
      shirtNumber: 4,
      source: 'selectie',
    })
    await importAt(server, season)

    expect((await storedPlayers()).find((row) => row.name === 'Niek Loohuis')).toMatchObject({
      position: 'verdediger',
      shirtNumber: 4,
      source: 'selectie',
    })
  })

  it('writes a gap for a season without a page: no request, no row, one line', async () => {
    const server = await serve({})
    const report = await importAt(server, '2002/03')

    expect(report).toEqual({ kind: 'none', season: '2002/03' })
    expect(formatPastSquadReport(report)).toBe('Squad 2002/03: no squad page on Wikipedia, so no squad')
    expect(server.requests).toEqual([])
    expect(await database.db.select().from(players)).toEqual([])
    expect(await database.db.select().from(squadImports)).toEqual([])
    expect(await database.db.select().from(wikipediaPages)).toEqual([])
  })

  it('treats a page that is not there, and a page without a table, as a gap', async () => {
    const missing = await serve({})

    expect(await importAt(missing, season)).toEqual({ kind: 'none', season })

    const noTable = await serve({ [squadPageTitle('2012/13')]: 'Het seizoen 2012/13 van sc Heerenveen.\n' })

    expect(await importAt(noTable, '2012/13')).toEqual({ kind: 'none', season: '2012/13' })
    expect(await database.db.select().from(players)).toEqual([])
  })

  it('leaves a season alone when a reader reports an error, and records the failure', async () => {
    const server = await serve({ [squadPageTitle(season)]: brokenList })
    const report = await importAt(server, season)

    expect(report).toMatchObject({ kind: 'error', season })
    expect(report.kind === 'error' && report.message).toContain(`${squadPageTitle(season)} (selection)`)
    expect(await database.db.select().from(players)).toEqual([])
    expect(await database.db.select().from(wikipediaPages)).toEqual([])
    expect(await database.db.select().from(squadImports)).toMatchObject([
      { failuresInARow: 1, lastOutcome: 'error', season },
    ])
  })

  it('leaves a season alone when a page cannot be fetched', async () => {
    const server = await serve({}, { [pathOf(squadPageTitle(season))]: reply(500, 'Kapot') })
    const report = await importAt(server, season)

    expect(report).toMatchObject({ kind: 'error', season })
    expect(await database.db.select().from(players)).toEqual([])
  })

  it('stores a player without a page with no person and no request for a title', async () => {
    const title = englishSquadPage('2018/19') ?? ''
    const english = await serve({ [title]: fixture('wikipedia-english-squad-2018-19.wiki') })
    const dutch = await serve({})
    const report = await importAt(dutch, '2018/19', english)

    expect(report).toMatchObject({ kind: 'imported', pages: 1, persons: [] })
    expect(pageRequests(english)).toEqual([pathOf(title)])
    expect(pageRequests(dutch)).toEqual([])

    const rows = await storedPlayers('2018/19')

    expect(rows.length).toBeGreaterThan(5)
    expect(rows.every((row) => row.source === 'engels' && row.wikipediaPage === null && row.personId === null)).toBe(
      true,
    )
    expect(rows.find((row) => row.name === 'Warner Hahn')).toMatchObject({ position: 'doelman', shirtNumber: 1 })
    expect(await database.db.select().from(wikipediaPages)).toMatchObject([{ kind: 'squad', title }])
  })

  it('leaves the person empty when a title cannot be asked, warns, and fills it in the next read', async () => {
    const server = await serve(
      { [squadPageTitle(season)]: twoLists },
      { [pathOf('Marten de Roon')]: reply(500, 'Kapot') },
    )
    const first = await importAt(server, season)

    expect(first.kind === 'imported' && first.warnings.some((line) => line.startsWith('Persons:'))).toBe(true)
    expect((await storedPlayers()).find((row) => row.name === 'Marten de Roon')?.personId).toBeNull()

    // Wikipedia answers again.
    server.requests.length = 0

    const working = await serve({ [squadPageTitle(season)]: twoLists })
    const second = await importAt(working, season)

    expect(second).toMatchObject({ kind: 'imported', players: { added: 0, improved: 1 } })
    expect((await storedPlayers()).find((row) => row.name === 'Marten de Roon')?.personId).not.toBeNull()
  })

  it('refuses a season that is not over, before it asks or writes anything', async () => {
    const server = await serve({ [squadPageTitle('2026/27')]: twoLists })

    for (const forSeason of ['2026/27', '2027/28']) {
      expect(await importAt(server, forSeason)).toMatchObject({ kind: 'error', season: forSeason })
    }
    expect(server.requests).toEqual([])
    expect(await database.db.select().from(players)).toEqual([])
  })
})

describe('import:squad', () => {
  it('reads one season and exits with 0, also for a season without a page', async () => {
    const server = await serve({ [squadPageTitle(season)]: twoLists })
    const read = await runCommand(runSquadImport, season, server)
    const gap = await runCommand(runSquadImport, '2002/03', server)

    expect(read.code).toBe(0)
    expect(read.lines[0]).toMatch(/^Squad 2013\/14: \d+ new, 0 improved, 0 unchanged, from 1 page\n/u)
    expect(gap).toEqual({ code: 0, lines: ['Squad 2002/03: no squad page on Wikipedia, so no squad'] })
  })

  it('refuses the current season, a future season and a wrong argument before it asks anything', async () => {
    const server = await serve({ [squadPageTitle('2026/27')]: twoLists })

    for (const argument of ['2026/27', '2027/28', '2013-14', undefined]) {
      const { code, lines } = await runCommand(runSquadImport, argument, server)

      expect(code).toBe(1)
      expect(lines.join('\n')).toContain(squadUsage)
    }
    expect(server.requests).toEqual([])
    expect(await database.db.select().from(players)).toEqual([])
  })

  it('does nothing while an import holds the lock, and says so', async () => {
    const server = await serve({ [squadPageTitle(season)]: twoLists })
    const held = await withLock(database.pool, lockNameFor(database.url, 'import'), 0, () =>
      runCommand(runSquadImport, season, server),
    )

    expect(held.ran && held.result.code).toBe(1)
    expect(held.ran && held.result.lines.join('\n')).toContain('An import is still running')
    expect(server.requests).toEqual([])
    expect(await database.db.select().from(players)).toEqual([])
  })

  it('exits with 1 when the season could not be read', async () => {
    const server = await serve({ [squadPageTitle(season)]: brokenList })
    const { code, lines } = await runCommand(runSquadImport, season, server)

    expect(code).toBe(1)
    expect(lines.join('\n')).toContain('warning, nothing changed')
  })
})

describe('import:squads', () => {
  it('reads every season that is over from the first, the oldest first, with a gap for the seasons without a page', async () => {
    const english = await serve({
      [englishSquadPage('2024/25') ?? '']: fixture('wikipedia-english-squad-2024-25.wiki'),
    })
    const server = await serve({})
    const { code, lines } = await runCommand(runSquadsImport, '2023/24', server, english)

    expect(code).toBe(0)
    expect(lines.filter((line) => line.startsWith('Squad '))).toEqual([
      'Squad 2023/24: no squad page on Wikipedia, so no squad',
      expect.stringMatching(/^Squad 2024\/25: \d+ new, 0 improved, 0 unchanged, from 1 page\n/u),
      'Squad 2025/26: no squad page on Wikipedia, so no squad',
    ])
    expect(lines.at(-1)).toBe('Squads: 3 of 3 read, 2 of them without a page.')
    expect((await storedPlayers('2024/25')).length).toBeGreaterThan(0)
  })

  it('carries on after a season that fails, and exits with 1', async () => {
    const server = await serve({
      [squadPageTitle('2013/14')]: brokenList,
      [squadPageTitle('2014/15')]: twoLists,
    })
    const { code, lines } = await runCommand(runSquadsImport, '2013/14', server)

    expect(code).toBe(1)
    expect(lines.some((line) => line.startsWith('Squad 2013/14: warning, nothing changed'))).toBe(true)
    expect(lines.some((line) => /^Squad 2014\/15: \d+ new/u.test(line))).toBe(true)
    expect(lines.at(-1)).toMatch(
      /^Squads: 12 of 13 read, 11 of them without a page, 1 not read:\n {2}2013\/14: warning, nothing changed/u,
    )
    expect(await storedPlayers('2013/14')).toEqual([])
    expect((await storedPlayers('2014/15')).length).toBeGreaterThan(0)
  })

  it('skips every season while an import holds the lock, and counts it as not read', async () => {
    const server = await serve({ [squadPageTitle('2014/15')]: twoLists })
    const held = await withLock(database.pool, lockNameFor(database.url, 'import'), 0, () =>
      runCommand(runSquadsImport, '2024/25', server),
    )

    expect(held.ran && held.result.code).toBe(1)
    expect(held.ran && held.result.lines).toEqual([
      expect.stringContaining('Squad 2024/25: not read. An import is still running on this database'),
      expect.stringContaining('Squad 2025/26: not read. An import is still running on this database'),
      expect.stringMatching(/^Squads: 0 of 2 read, 2 not read:\n {2}2024\/25: An import is still running/u),
    ])
    expect(server.requests).toEqual([])
  })

  it('writes nothing the second time', async () => {
    const server = await serve({ [squadPageTitle('2014/15')]: twoLists })

    await runCommand(runSquadsImport, '2014/15', server)

    const before = await storedPlayers('2014/15')
    const { code, lines } = await runCommand(runSquadsImport, '2014/15', server)

    expect(code).toBe(0)
    expect(lines.find((line) => line.startsWith('Squad 2014/15:'))).toMatch(/ 0 new, 0 improved, \d+ unchanged,/u)
    expect(await storedPlayers('2014/15')).toEqual(before)
  })

  it('refuses the current season and a future season before it asks anything', async () => {
    const server = await serve({})

    for (const argument of ['2026/27', '2027/28']) {
      const { code, lines } = await runCommand(runSquadsImport, argument, server)

      expect(code).toBe(1)
      expect(lines.join('\n')).toContain(fromSquadUsage)
    }
    expect(server.requests).toEqual([])
  })
})
