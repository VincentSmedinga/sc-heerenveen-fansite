import type { TestDatabase } from '@fansite/db/test-database'

import { lockNameFor, withLock } from '@fansite/db/lock'
import {
  personPages,
  persons,
  playerFieldDifferences,
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
import { infoUrl, itemUrl } from './import-person-data.ts'
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
      country: null,
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
      {
        country: null,
        englishPage: null,
        name: 'Marten de Roon',
        page: 'Marten de Roon',
        personId: null,
        position: 'middenvelder',
        shirtNumber: 15,
        source: 'selectie',
      },
    ])
  })

  it('takes the position and the number of the list that has them, also when it is not the best', () => {
    const { players: merged } = mergePlayers([
      read('selectie', { name: 'Jakob Poulsen', page: 'Jakob Poulsen' }),
      read('engels', { name: 'Jakob Poulsen', position: 'middenvelder', shirtNumber: 8 }),
    ])

    expect(merged).toEqual([
      {
        country: null,
        englishPage: null,
        name: 'Jakob Poulsen',
        page: 'Jakob Poulsen',
        personId: null,
        position: 'middenvelder',
        shirtNumber: 8,
        source: 'selectie',
      },
    ])
  })

  it('merges by name, without accents and capitals, when a list has no page', () => {
    const { players: merged } = mergePlayers([
      read('engels', { name: 'Arbër Zeneli', position: 'middenvelder' }),
      read('transfers', { name: 'ARBER ZENELI', page: 'Arbër Zeneli' }),
    ])

    expect(merged).toEqual([
      {
        country: null,
        englishPage: null,
        name: 'Arbër Zeneli',
        page: 'Arbër Zeneli',
        personId: null,
        position: 'middenvelder',
        shirtNumber: null,
        source: 'engels',
      },
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

  it('takes the country of the best list that has one', () => {
    const { players: merged } = mergePlayers([
      read('transfers', { country: 'BE', name: 'Brian Vandenbussche', page: 'Brian Vandenbussche' }),
      read('engels', { country: 'NL', name: 'Brian Vandenbussche' }),
      read('selectie', { name: 'Brian Vandenbussche', page: 'Brian Vandenbussche' }),
    ])

    expect(merged).toMatchObject([{ country: 'NL', source: 'selectie' }])
  })

  it('leaves out a number the database cannot hold, and does not keep the matches and goals', () => {
    const { players: merged } = mergePlayers([read('selectie', { name: 'Een Speler', shirtNumber: 120 })])

    expect(merged).toEqual([
      {
        country: null,
        englishPage: null,
        name: 'Een Speler',
        page: null,
        personId: null,
        position: null,
        shirtNumber: null,
        source: 'selectie',
      },
    ])
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
      {
        kind: 'squad',
        language: 'nl',
        readAt: now,
        season,
        title: squadPageTitle(season),
        version: wiki['Last-Modified'],
      },
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

  it('stores the country of the flag, says how many players have one, and changes nothing the second time', async () => {
    const server = await serve({ [squadPageTitle(season)]: twoLists })
    const report = await importAt(server, season)
    const rows = await storedPlayers()

    expect(rows.find((row) => row.name === 'Marten de Roon')?.country).toBe('NL')
    expect(rows.find((row) => row.name === 'Kenny Otigba')?.country).toBe('HU')
    // A player of the transfers only has no flag.
    expect(rows.find((row) => row.name === 'Niek Loohuis')?.country).toBeNull()
    expect(report.kind === 'imported' && report.countries).toEqual({
      known: rows.filter((row) => row.country !== null).length,
      total: rows.length,
    })
    expect(formatPastSquadReport(report)).toContain(
      `countries of the players: ${rows.filter((row) => row.country !== null).length} of ${rows.length} have one`,
    )

    const again = await importAt(server, season)

    expect(again).toMatchObject({ kind: 'imported', players: { added: 0, improved: 0 } })
    expect(await storedPlayers()).toEqual(rows)
  })

  it('keeps one row and the spelling that stays when a list writes a title the owner replaced', async () => {
    const stays = await serve({ [squadPageTitle(season)]: twoLists.replaceAll('Marten de Roon', 'Jan Harm Schippers') })

    await importAt(stays, season)

    const before = await storedPlayers()

    expect(before.filter((row) => row.name.includes('Schippers'))).toMatchObject([
      { name: 'Jan Harm Schippers', wikipediaPage: 'Jan Harm Schippers' },
    ])

    const other = await serve({ [squadPageTitle(season)]: twoLists.replaceAll('Marten de Roon', 'Jan-Harm Schippers') })
    const again = await importAt(other, season)

    expect(again).toMatchObject({ kind: 'imported', players: { added: 0, improved: 0 } })
    expect(await storedPlayers()).toEqual(before)
    expect(
      (await database.db.select().from(persons)).filter((row) => row.wikipediaPage?.includes('Schippers')),
    ).toMatchObject([{ wikipediaPage: 'Jan Harm Schippers' }])
  })

  it.each([
    ['Jan-Harm Schippers', 'Jan Harm Schippers'],
    ['Robert van der Berg', 'Robert van den Berg'],
  ])('renames the row of %s when the row and the list both have the other spelling still', async (old, kept) => {
    const page = twoLists.replaceAll('Marten de Roon', old)
    const server = await serve({ [squadPageTitle(season)]: page })

    await importAt(server, season)

    // A row of before the owner chose: the name and the page are the other spelling.
    const [row] = (await storedPlayers()).filter((one) => one.name === kept)

    await database.db.update(players).set({ name: old, wikipediaPage: old }).where(eq(players.id, row!.id))

    const count = (await storedPlayers()).length
    const again = await importAt(server, season)

    expect(again).toMatchObject({ kind: 'imported', players: { added: 0 } })
    expect(await storedPlayers()).toHaveLength(count)
    expect((await storedPlayers()).filter((one) => [kept, old].includes(one.name))).toMatchObject([
      { id: row!.id, name: kept, wikipediaPage: kept },
    ])
  })

  it('fills in a country that is empty, and keeps one that is there when the list is not better', async () => {
    const server = await serve({ [squadPageTitle(season)]: twoLists })

    await database.db.insert(players).values([
      { name: 'Marten de Roon', searchTerm: 'de Roon', season, source: 'selectie', wikipediaPage: 'Marten de Roon' },
      { country: 'BE', name: 'Kenny Otigba', searchTerm: 'Otigba', season, source: 'selectie' },
    ])
    await importAt(server, season)

    const rows = await storedPlayers()

    expect(rows.find((row) => row.name === 'Marten de Roon')?.country).toBe('NL')
    expect(rows.find((row) => row.name === 'Kenny Otigba')?.country).toBe('BE')
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

  it('gives a scorer the import of the matches made the row of the list, found by his page or his person (#1024)', async () => {
    const server = await serve({ [squadPageTitle(season)]: twoLists })
    const [{ insertId: personId }] = await database.db.insert(persons).values({ wikipediaPage: 'Marten de Roon' })

    await database.db.insert(personPages).values([
      { page: 'Marten de Roon', personId },
      { page: 'M. de Roon', personId },
    ])
    await database.db.insert(players).values({
      name: 'M. de Roon',
      personId,
      searchTerm: 'de Roon',
      season,
      source: 'doelpunten',
      wikipediaPage: 'M. de Roon',
    })

    const [before] = await storedPlayers()
    const report = await importAt(server, season)

    expect(report).toMatchObject({ kind: 'imported', players: { improved: 1 } })
    expect((await storedPlayers()).filter((row) => row.personId === personId)).toMatchObject([
      { id: before!.id, position: 'middenvelder', shirtNumber: 15, source: 'selectie' },
    ])
  })

  describe('what the editors set of a player (#1022)', () => {
    const deRoon = async () => (await storedPlayers()).find((row) => row.wikipediaPage === 'Marten de Roon')
    const waiting = () => database.db.select().from(playerFieldDifferences).orderBy(asc(playerFieldDifferences.id))

    it('leaves the fields the editors set alone, keeps what a list says instead as a difference, once', async () => {
      const server = await serve({ [squadPageTitle(season)]: twoLists })

      // Known from a worse list, so the lists would improve the line and the number.
      await database.db.insert(players).values({
        editorsFields: ['name', 'position', 'shirt_number'],
        name: 'M. de Roon',
        position: 'verdediger',
        searchTerm: 'de Roon',
        season,
        shirtNumber: 6,
        source: 'transfers',
        wikipediaPage: 'Marten de Roon',
      })

      const [before] = await storedPlayers()

      await importAt(server, season)

      expect(await deRoon()).toMatchObject({
        id: before!.id,
        name: 'M. de Roon',
        position: 'verdediger',
        shirtNumber: 6,
        // What the editors did not set is still improved.
        source: 'selectie',
      })
      expect(await waiting()).toMatchObject([
        { editorsValue: 'M. de Roon', field: 'name', importValue: 'Marten de Roon', playerId: before!.id, season },
        { editorsValue: '6', field: 'shirt_number', importValue: '15', status: 'pending' },
        { editorsValue: 'verdediger', field: 'position', importValue: 'middenvelder', status: 'pending' },
      ])

      // A second read keeps no second row, and the difference that is gone closes itself.
      await database.db.update(players).set({ shirtNumber: 15 }).where(eq(players.id, before!.id))
      await importAt(server, season)

      expect(await waiting()).toMatchObject([
        { field: 'name', status: 'pending' },
        { field: 'shirt_number', resolution: 'reverted', status: 'rejected' },
        { field: 'position', status: 'pending' },
      ])
    })

    it('merges the player of the lists into the player the editors added, by his page or his person', async () => {
      const server = await serve({ [squadPageTitle(season)]: twoLists })
      const [{ insertId: personId }] = await database.db.insert(persons).values({ wikipediaPage: 'Marten de Roon' })

      await database.db.insert(personPages).values([
        { page: 'Marten de Roon', personId },
        { page: 'M. de Roon', personId },
      ])
      await database.db.insert(players).values([
        // Found by his person: the lists link another title of his page.
        {
          editorsFields: ['name', 'wikipedia_page'],
          name: 'M. de Roon',
          personId,
          searchTerm: 'de Roon',
          season,
          source: 'redactie',
          wikipediaPage: 'M. de Roon',
        },
        // Found by his page, with a number of the editors.
        {
          editorsFields: ['name', 'shirt_number', 'wikipedia_page'],
          name: 'Kenny Otigba',
          searchTerm: 'Otigba',
          season,
          shirtNumber: 44,
          source: 'redactie',
          wikipediaPage: 'Kenny Otigba',
        },
      ])

      const before = await storedPlayers()
      const total = (await importAt(server, season), await storedPlayers()).length
      const rows = await storedPlayers()

      // No second row of either, and the lists fill in what they lack.
      expect(rows.filter((row) => row.personId === personId)).toMatchObject([
        {
          id: before.find((row) => row.name === 'M. de Roon')!.id,
          name: 'M. de Roon',
          position: 'middenvelder',
          shirtNumber: 15,
          source: 'redactie',
          wikipediaPage: 'M. de Roon',
        },
      ])
      expect(rows.filter((row) => row.name.includes('Otigba'))).toMatchObject([
        { position: 'verdediger', shirtNumber: 44, source: 'redactie' },
      ])
      expect(rows.find((row) => row.name === 'Kenny Otigba')?.personId).not.toBeNull()
      expect(await waiting()).toMatchObject([
        { editorsValue: '44', field: 'shirt_number', importValue: '2' },
        { editorsValue: 'M. de Roon', field: 'name', importValue: 'Marten de Roon' },
        { editorsValue: 'M. de Roon', field: 'wikipedia_page', importValue: 'Marten de Roon' },
      ])

      // The next read adds nobody.
      await importAt(server, season)
      expect(await storedPlayers()).toHaveLength(total)
    })

    it('keeps a player the editors added whom no list has', async () => {
      const server = await serve({ [squadPageTitle(season)]: twoLists })

      await database.db
        .insert(players)
        .values({ editorsFields: ['name'], name: 'Sanne Spits', searchTerm: 'Spits', season, source: 'redactie' })
      await importAt(server, season)

      expect((await storedPlayers()).find((row) => row.name === 'Sanne Spits')).toMatchObject({
        inSquad: true,
        source: 'redactie',
      })
    })
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

  describe('the persons of the English squad (issue 1043)', () => {
    const englishTitle = englishSquadPage('2018/19') ?? ''
    const page = [
      '==Players==',
      '===First-team squad===',
      '{{Fs start}}',
      '{{Fs player|no=1|nat=NED|pos=GK|name=[[Warner Hahn]]}}',
      '{{Fs player|no=3|nat=DEN|pos=DF|name=[[Daniel Høegh]]}}',
      '{{Fs player|no=21|nat=JAP|pos=MF|name=[[Yuki Kobayashi (footballer, born 1992)|Yuki Kobayashi]]}}',
      '{{Fs end}}',
    ].join('\n')
    const info = (id: string) => reply(200, `<script>{"wgArticleId":77}</script> Special:EntityPage/${id}`)
    const item = (id: string, dutch: null | string) =>
      reply(
        200,
        JSON.stringify({
          entities: { [id]: { id, sitelinks: dutch === null ? {} : { nlwiki: { title: dutch } } } },
        }),
      )

    /** The three servers of a run: the English page, the Dutch articles and Wikidata. */
    async function servers3(extraEnglish: Record<string, Handler> = {}, text = page) {
      const english = await serve(
        { [englishTitle]: text },
        {
          [infoUrl('', 'Daniel Høegh')]: info('Q1'),
          [infoUrl('', 'Yuki Kobayashi (footballer, born 1992)')]: info('Q2'),
          ...extraEnglish,
        },
      )
      const dutch = await serve({}, { [pathOf('Daniel Høegh')]: reply(200, 'Een Deense verdediger.', wiki) })
      const wikidata = await startServer({
        '/robots.txt': reply(200, '', { 'Content-Type': 'text/plain' }),
        [itemUrl('', 'Q1')]: item('Q1', 'Daniel Høegh'),
        [itemUrl('', 'Q2')]: item('Q2', null),
      })

      servers.push(wikidata)

      return { dutch, english, wikidata }
    }

    const run = ({ dutch, english, wikidata }: Awaited<ReturnType<typeof servers3>>) =>
      importPastSquad(database.db, fetcherFor([dutch, english, wikidata]), '2018/19', {
        clock: () => now,
        englishOrigin: english.origin,
        origin: dutch.origin,
        pause: 0,
        wikidata: wikidata.origin,
      })

    async function earlierHahn() {
      const [{ id }] = (await database.db.insert(persons).values({ wikipediaPage: 'Warner Hahn' }).$returningId()) as [
        { id: number },
      ]

      await database.db
        .insert(players)
        .values({ name: 'Warner Hahn', personId: id, searchTerm: 'Hahn', season: '2017/18' })

      return id
    }

    it('finds a person by name, by the Dutch article, and under the English title, and a second run asks nothing', async () => {
      const hahn = await earlierHahn()
      const three = await servers3()
      const report = await run(three)

      expect(report).toMatchObject({ kind: 'imported' })

      const rows = await storedPlayers('2018/19')
      const person = async (id: null | number) =>
        id === null ? null : (await database.db.select().from(persons).where(eq(persons.id, id)))[0]

      // By name: no request for Warner Hahn.
      expect(rows.find((row) => row.name === 'Warner Hahn')?.personId).toBe(hahn)
      expect(pageRequests(three.english)).not.toContain(infoUrl('', 'Warner Hahn'))
      // By the English link: the Dutch title of the item, and the row keeps no page.
      const daniel = rows.find((row) => row.name === 'Daniel Høegh')

      expect(await person(daniel?.personId ?? null)).toMatchObject({
        englishTitle: false,
        wikipediaPage: 'Daniel Høegh',
      })
      expect(daniel?.wikipediaPage).toBeNull()
      // Without a Dutch article: a person under the English title, marked as such.
      const yuki = rows.find((row) => row.name === 'Yuki Kobayashi')

      expect(await person(yuki?.personId ?? null)).toMatchObject({
        englishTitle: true,
        wikipediaPage: 'Yuki Kobayashi (footballer, born 1992)',
      })
      expect(yuki?.wikipediaPage).toBeNull()

      const before = await database.db.select().from(players)
      const askedBefore = three.english.paths().length + three.wikidata.paths().length + three.dutch.paths().length
      const again = await run(three)

      expect(again).toMatchObject({ kind: 'imported', players: { added: 0, improved: 0, unchanged: 3 } })
      // One request more for the English page itself, none for a title.
      expect(three.english.paths().length + three.wikidata.paths().length + three.dutch.paths().length).toBe(
        askedBefore + 2,
      )
      expect(await database.db.select().from(players)).toEqual(before)
    })

    it('never gives a player another person than he has', async () => {
      const [{ id: other }] = (await database.db
        .insert(persons)
        .values({ wikipediaPage: 'Een ander' })
        .$returningId()) as [{ id: number }]

      await database.db
        .insert(players)
        .values({ name: 'Daniel Høegh', personId: other, searchTerm: 'Høegh', season: '2018/19' })
      await run(await servers3())

      expect((await storedPlayers('2018/19')).find((row) => row.name === 'Daniel Høegh')?.personId).toBe(other)
    })

    it('leaves a player without a person when a request fails, warns, and fills him in the next run', async () => {
      const broken = await servers3({ [infoUrl('', 'Daniel Høegh')]: reply(500, 'Kapot') })
      const first = await run(broken)

      expect(first.kind === 'imported' && first.warnings.join('\n')).toMatch(/1 English title could not be asked/u)
      expect((await storedPlayers('2018/19')).find((row) => row.name === 'Daniel Høegh')?.personId).toBeNull()

      await run(await servers3())

      expect((await storedPlayers('2018/19')).find((row) => row.name === 'Daniel Høegh')?.personId).not.toBeNull()
    })

    it('stops asking after three failures in a row', async () => {
      const failing = reply(500, 'Kapot')
      const broken = await servers3(
        {
          [infoUrl('', 'Daniel Høegh')]: failing,
          [infoUrl('', 'Nicolai Næss')]: info('Q3'),
          [infoUrl('', 'Warner Hahn')]: failing,
          [infoUrl('', 'Yuki Kobayashi (footballer, born 1992)')]: failing,
        },
        page.replace('{{Fs end}}', '{{Fs player|no=5|nat=NOR|pos=DF|name=[[Nicolai Næss]]}}\n{{Fs end}}'),
      )

      await run(broken)
      // The fourth title is not asked.
      expect(pageRequests(broken.english).filter((path) => path?.includes('action=info'))).toHaveLength(3)
    })
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
