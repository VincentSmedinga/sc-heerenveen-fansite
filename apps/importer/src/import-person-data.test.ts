import type { TestDatabase } from '@fansite/db/test-database'
import type { RowDataPacket } from 'mysql2/promise'

import { connect } from '@fansite/db/client'
import { setEditorsPersonFacts } from '@fansite/db/persons'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { runCountryFactsCommand } from './country-facts.ts'
import { runImport } from './import-feeds.ts'
import { describePersonData, readPersonData } from './import-person-data.ts'
import { lineMap } from './person-lines.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'
import { infoPath, infoRoute, itemPath, itemRoute, labelRoute } from './test-wikidata.ts'

const now = new Date('2026-11-08T12:00:00Z')

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
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM persons')
  await database.pool.query('DELETE FROM wikidata_place_countries')
  await database.pool.query('DELETE FROM wikidata_items')
  await database.pool.query('DELETE FROM player_list_titles')
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

async function addPersons(...titles: string[]) {
  for (const title of titles) {
    await database.pool.query('INSERT INTO persons (wikipedia_page) VALUES (?)', [title])
  }
}

async function rows(sql: string) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql)

  return result
}

/** Two web servers, one that answers as the Dutch Wikipedia and one as Wikidata. */
async function serve(
  wikipedia: Record<string, Handler>,
  wikidata: Record<string, Handler>,
  { robots = '' }: { robots?: string } = {},
) {
  const robotsRoute = { '/robots.txt': reply(200, robots, { 'Content-Type': 'text/plain' }) }
  const nl = await startServer({ ...robotsRoute, ...wikipedia })
  const data = await startServer({ ...robotsRoute, ...wikidata }, 'localhost')

  servers.push(nl, data)

  return { data, nl }
}

const asked = (server: TestServer) => server.paths().filter((path) => path !== '/robots.txt')

async function read(
  served: { data: TestServer; nl: TestServer },
  options: {
    limit?: number
    lines?: ReadonlyMap<string, 'aanvaller' | 'doelman' | 'middenvelder' | 'verdediger'>
  } = {},
) {
  return readPersonData(connection.db, fetcherFor([served.nl, served.data]), {
    clock: () => now,
    origin: served.nl.origin,
    pause: 0,
    wikidata: served.data.origin,
    ...options,
  })
}

/** The routes of a player with a complete item, and of the labels it asks for. */
const joost = {
  wikidata: {
    ...itemRoute('Q15943430', {
      birth: [{ precision: 11, time: '+1994-05-13T00:00:00Z' }],
      labels: { en: 'Joost van Aken', nl: 'Joost van Aken' },
      nationalities: ['Q29999', 'Q155'],
      place: 'Q9920',
      positions: ['Q9999999', 'Q336286'],
    }),
    ...labelRoute('Q9920', 'Haarlem'),
    ...labelRoute('Q29999', 'Nederland', 'Netherlands'),
    ...labelRoute('Q155', 'Brazilië'),
    ...labelRoute('Q9999999', 'rare positie'),
    ...labelRoute('Q336286', 'verdediger', 'defender'),
  },
  wikipedia: infoRoute('Joost van Aken', 3941527, 'Q15943430'),
}

describe('readPersonData', () => {
  it('stores the Q-number, the birth date and place, the nationalities, the positions and the line', async () => {
    await addPersons('Joost van Aken')

    const served = await serve(joost.wikipedia, joost.wikidata)
    const report = await read(served)

    expect(
      await rows(
        "SELECT wikidata_id, wikipedia_page_id, DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth_date, birth_date_precision, birth_place_id, line, line_source, wikidata_read_at FROM persons",
      ),
    ).toEqual([
      {
        birth_date: '1994-05-13',
        birth_date_precision: 'day',
        birth_place_id: 'Q9920',
        line: 'verdediger',
        line_source: 'wikidata',
        wikidata_id: 'Q15943430',
        wikidata_read_at: now,
        wikipedia_page_id: 3941527,
      },
    ])
    expect(await rows('SELECT item_id, position FROM person_nationalities ORDER BY position')).toEqual([
      { item_id: 'Q29999', position: 0 },
      { item_id: 'Q155', position: 1 },
    ])
    expect(await rows('SELECT item_id, position FROM person_positions ORDER BY position')).toEqual([
      { item_id: 'Q9999999', position: 0 },
      { item_id: 'Q336286', position: 1 },
    ])
    expect(await rows('SELECT id, label FROM wikidata_items ORDER BY id')).toEqual([
      { id: 'Q155', label: 'Brazilië' },
      { id: 'Q29999', label: 'Nederland' },
      { id: 'Q336286', label: 'verdediger' },
      { id: 'Q9920', label: 'Haarlem' },
      { id: 'Q9999999', label: 'rare positie' },
    ])
    expect(report).toMatchObject({
      articlesAsked: 1,
      birthDate: 1,
      empty: 0,
      itemsAsked: 6,
      lines: { manual: 0, squad: 0, wikidata: 1 },
      nationality: 1,
      read: 1,
      warnings: [],
    })
    expect(describePersonData(report)).toEqual([
      'persons (Wikidata): 1 person read, 1 with a birth date, 1 with a nationality, 1 with a line (1 from Wikidata, 0 from the squad, 0 from the old fansite, 0 set by hand), 0 left empty; 1 articles and 6 items asked',
      'persons (line and country): 0 lines from the squad, 0 from Wikidata, 0 taken away; 1 country from Wikidata, 0 from the list of players, 0 from the squad',
    ])
  })

  it('asks with our User-Agent', async () => {
    await addPersons('Joost van Aken')

    const served = await serve(joost.wikipedia, joost.wikidata)

    await read(served)

    for (const request of [...served.nl.requests, ...served.data.requests]) {
      expect(request.headers['user-agent']).toMatch(/^scHeerenveenFansite\//u)
    }
  })

  it('asks nothing and writes nothing in a second run', async () => {
    await addPersons('Joost van Aken')

    const served = await serve(joost.wikipedia, joost.wikidata)

    await read(served)

    const before = await rows('SELECT * FROM persons')
    const nl = asked(served.nl).length
    const data = asked(served.data).length
    const second = await read(served)

    expect(await rows('SELECT * FROM persons')).toEqual(before)
    expect(asked(served.nl)).toHaveLength(nl)
    expect(asked(served.data)).toHaveLength(data)
    expect(describePersonData(second)).toEqual([])
  })

  it('asks about a country or a position once, for every person', async () => {
    await addPersons('Joost van Aken', 'Een Ander')

    const served = await serve(
      { ...joost.wikipedia, ...infoRoute('Een Ander', 20, 'Q20') },
      {
        ...joost.wikidata,
        ...itemRoute('Q20', { nationalities: ['Q29999'], place: 'Q9920', positions: ['Q336286'] }),
      },
    )

    await read(served)

    expect(asked(served.data).filter((path) => path === itemPath('Q29999'))).toHaveLength(1)
    expect(asked(served.data).filter((path) => path === itemPath('Q9920'))).toHaveLength(1)
  })

  it('does not ask again about a label the database has', async () => {
    await addPersons('Joost van Aken')
    await database.pool.query(
      "INSERT INTO wikidata_items (id, label) VALUES ('Q9920', 'Haarlem'), ('Q29999', 'Nederland'), ('Q155', 'Brazilië'), ('Q9999999', 'x'), ('Q336286', 'verdediger')",
    )

    await database.pool.query("INSERT INTO wikidata_place_countries (id, country_id) VALUES ('Q9920', NULL)")

    const served = await serve(joost.wikipedia, joost.wikidata)

    await read(served)

    expect(asked(served.data)).toEqual([itemPath('Q15943430')])
  })

  it('never replaces a birth date of the editors, and gives Wikidata back when they clear it', async () => {
    await addPersons('Joost van Aken')

    const [person] = await rows('SELECT id FROM persons')

    await setEditorsPersonFacts(connection.db, person?.['id'], { birthDate: { date: '1993-01-01', precision: 'year' } })

    const served = await serve(joost.wikipedia, joost.wikidata)

    expect((await read(served)).read).toBe(1)
    expect(
      await rows(
        "SELECT DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth_date, birth_date_precision, birth_date_source, wikidata_id FROM persons",
      ),
    ).toEqual([
      { birth_date: '1993-01-01', birth_date_precision: 'year', birth_date_source: 'manual', wikidata_id: 'Q15943430' },
    ])

    await setEditorsPersonFacts(connection.db, person?.['id'], { birthDate: null })
    await read(served)
    expect(
      await rows(
        "SELECT DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth_date, birth_date_precision, birth_date_source FROM persons",
      ),
    ).toEqual([{ birth_date: '1994-05-13', birth_date_precision: 'day', birth_date_source: 'wikidata' }])
  })

  it('stores a birth date with only a year as a first of January, with its precision', async () => {
    await addPersons('Oude Speler')

    const served = await serve(infoRoute('Oude Speler', 5, 'Q50'), {
      ...itemRoute('Q50', { birth: [{ precision: 9, time: '+1952-00-00T00:00:00Z' }] }),
    })

    await read(served)

    expect(
      await rows("SELECT DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth_date, birth_date_precision FROM persons"),
    ).toEqual([{ birth_date: '1952-01-01', birth_date_precision: 'year' }])
  })

  it('leaves the birth date empty for an item without one, and keeps the rest', async () => {
    await addPersons('Zonder Datum')

    const served = await serve(infoRoute('Zonder Datum', 6, 'Q60'), {
      ...itemRoute('Q60', { nationalities: ['Q29999'] }),
      ...labelRoute('Q29999', 'Nederland'),
    })

    await read(served)

    expect(await rows('SELECT birth_date, birth_date_precision, wikidata_id FROM persons')).toEqual([
      { birth_date: null, birth_date_precision: null, wikidata_id: 'Q60' },
    ])
    expect(await rows('SELECT item_id FROM person_nationalities')).toEqual([{ item_id: 'Q29999' }])
  })

  it('takes the English label when an item has no Dutch one, and skips an item with no label', async () => {
    await addPersons('Joost van Aken')

    const served = await serve(joost.wikipedia, {
      ...joost.wikidata,
      ...labelRoute('Q9920', '', 'Haarlem (en)'),
      ...itemRoute('Q155', {}),
    })
    const report = await read(served)

    expect((await rows("SELECT label FROM wikidata_items WHERE id = 'Q9920'"))[0]?.['label']).toBe('Haarlem (en)')
    expect(await rows('SELECT item_id FROM person_nationalities')).toEqual([{ item_id: 'Q29999' }])
    expect(report.warnings).toEqual(['Persons: Q155 has no label in Dutch or English, so it is skipped'])
  })

  it('keeps a person without an article or an item empty, marked read, without a guess', async () => {
    await addPersons('Rode Link', 'Zonder Item', 'Item Weg')

    const served = await serve(
      { ...infoRoute('Rode Link', 0, null), ...infoRoute('Zonder Item', 8, null), ...infoRoute('Item Weg', 9, 'Q90') },
      {},
    )
    const report = await read(served)

    expect(
      await rows(
        'SELECT wikipedia_page, wikidata_id, wikipedia_page_id, line, wikidata_read_at FROM persons ORDER BY id',
      ),
    ).toEqual([
      { line: null, wikidata_id: null, wikidata_read_at: now, wikipedia_page: 'Rode Link', wikipedia_page_id: null },
      { line: null, wikidata_id: null, wikidata_read_at: now, wikipedia_page: 'Zonder Item', wikipedia_page_id: 8 },
      { line: null, wikidata_id: null, wikidata_read_at: now, wikipedia_page: 'Item Weg', wikipedia_page_id: 9 },
    ])
    expect(report).toMatchObject({ empty: 3, read: 3, warnings: [] })
  })

  it('refuses when robots.txt of Wikidata does not allow the item, and reads nobody', async () => {
    await addPersons('Joost van Aken')

    const served = await serve(joost.wikipedia, joost.wikidata, { robots: 'User-agent: *\nDisallow: /wiki/Special:' })
    const report = await read(served)

    expect(report.read).toBe(0)
    expect(report.warnings[0]).toMatch(/^Persons: robots\.txt does not allow .*Special:EntityData\/Q15943430\.json/u)
    expect(await rows('SELECT wikidata_read_at FROM persons')).toEqual([{ wikidata_read_at: null }])
    expect(asked(served.data)).toEqual([])
  })

  it('leaves a person unread when a request fails, warns, and asks only for the item next time', async () => {
    await addPersons('Joost van Aken')

    const wikidata: Record<string, Handler> = { ...joost.wikidata, [itemPath('Q15943430')]: reply(500, 'Kapot') }
    const served = await serve(joost.wikipedia, wikidata)
    const first = await read(served)

    expect(first.read).toBe(0)
    expect(first.warnings[0]).toMatch(
      /^Persons: 1 request to read persons failed, so those persons are tried again next run/u,
    )
    expect(await rows('SELECT wikidata_id, wikipedia_page_id, wikidata_read_at FROM persons')).toEqual([
      { wikidata_id: 'Q15943430', wikidata_read_at: null, wikipedia_page_id: 3941527 },
    ])

    const again = await serve(joost.wikipedia, joost.wikidata)
    const second = await read(again)

    expect(second.read).toBe(1)
    expect(asked(again.nl)).toEqual([])
    expect(asked(again.data)[0]).toBe(itemPath('Q15943430'))
  })

  it('stops after three failed requests in a row', async () => {
    const titles = ['A1', 'A2', 'A3', 'A4', 'A5']

    await addPersons(...titles)

    const served = await serve(Object.fromEntries(titles.map((title) => [infoPath(title), reply(500, 'Kapot')])), {})
    const report = await read(served)

    expect(report.read).toBe(0)
    expect(asked(served.nl)).toHaveLength(3)
  })

  it('reads at most the limit of persons, and the rest in the next run', async () => {
    await addPersons('Joost van Aken', 'Een Ander')

    const served = await serve(
      { ...joost.wikipedia, ...infoRoute('Een Ander', 20, 'Q20') },
      { ...joost.wikidata, ...itemRoute('Q20', {}) },
    )

    expect((await read(served, { limit: 1 })).read).toBe(1)
    expect(await rows('SELECT wikipedia_page FROM persons WHERE wikidata_read_at IS NULL')).toEqual([
      { wikipedia_page: 'Een Ander' },
    ])
    expect((await read(served, { limit: 1 })).read).toBe(1)
  })

  it('takes the line from the squad lists when Wikidata names no position of the list, the most often and for a tie the latest season', async () => {
    await addPersons('Veel Middenvelder', 'Gelijk Spel')

    const served = await serve(
      { ...infoRoute('Veel Middenvelder', 30, 'Q30'), ...infoRoute('Gelijk Spel', 31, 'Q31') },
      { ...itemRoute('Q30', {}), ...itemRoute('Q31', {}) },
    )
    const [mid, tie] = await rows('SELECT id FROM persons ORDER BY id')
    const insert = (id: number, season: string, position: string, name: string) =>
      database.pool.query(
        'INSERT INTO players (season, name, search_term, position, person_id) VALUES (?, ?, ?, ?, ?)',
        [season, name, name, position, id],
      )

    await insert(mid?.['id'], '2019/20', 'middenvelder', 'a1')
    await insert(mid?.['id'], '2020/21', 'middenvelder', 'a2')
    await insert(mid?.['id'], '2021/22', 'aanvaller', 'a3')
    await insert(tie?.['id'], '2019/20', 'verdediger', 'b1')
    await insert(tie?.['id'], '2021/22', 'aanvaller', 'b2')

    const report = await read(served)

    expect(await rows('SELECT wikipedia_page, line, line_source FROM persons ORDER BY id')).toEqual([
      { line: 'middenvelder', line_source: 'squad', wikipedia_page: 'Veel Middenvelder' },
      { line: 'aanvaller', line_source: 'squad', wikipedia_page: 'Gelijk Spel' },
    ])
    expect(report.lines).toEqual({ manual: 0, 'old-site': 0, squad: 2, wikidata: 0 })
  })

  it('leaves the line empty without a position of Wikidata and without a squad row', async () => {
    await addPersons('Zonder Lijn')

    const served = await serve(infoRoute('Zonder Lijn', 40, 'Q40'), itemRoute('Q40', {}))

    await read(served)

    expect(await rows('SELECT line, line_source FROM persons')).toEqual([{ line: null, line_source: null }])
  })

  it('puts the line of our list before Wikidata and the squad, and never replaces it', async () => {
    await addPersons('Joost van Aken')

    const served = await serve(joost.wikipedia, joost.wikidata)
    const lines = lineMap([{ line: 'middenvelder', title: 'Joost van Aken' }])
    const report = await read(served, { lines })

    expect(await rows('SELECT line, line_source FROM persons')).toEqual([
      { line: 'middenvelder', line_source: 'manual' },
    ])
    expect(report.lines).toEqual({ manual: 1, 'old-site': 0, squad: 0, wikidata: 0 })

    // A person that was read earlier gets the line of the list at the next run, without a
    // request.
    await database.pool.query("UPDATE persons SET line = 'doelman', line_source = 'wikidata'")

    const before = asked(served.data).length

    await read(served, { lines })

    expect(await rows('SELECT line, line_source FROM persons')).toEqual([
      { line: 'middenvelder', line_source: 'manual' },
    ])
    expect(asked(served.data)).toHaveLength(before)
  })

  it('keeps the first person when two persons have the same item', async () => {
    await addPersons('Eerste', 'Tweede')

    const served = await serve(
      { ...infoRoute('Eerste', 1, 'Q70'), ...infoRoute('Tweede', 2, 'Q70') },
      itemRoute('Q70', {}),
    )
    const report = await read(served)

    expect(await rows('SELECT wikipedia_page, wikidata_id FROM persons ORDER BY id')).toEqual([
      { wikidata_id: 'Q70', wikipedia_page: 'Eerste' },
      { wikidata_id: null, wikipedia_page: 'Tweede' },
    ])
    expect(report.warnings).toEqual([
      "Persons: 'Tweede' and 'Eerste' have the same item Q70, so only the first keeps it",
    ])
  })

  it('is a step of the import: the log says what it read, and a second import says nothing', async () => {
    await addPersons('Joost van Aken')
    await database.pool.query('DELETE FROM sources')

    const served = await serve(joost.wikipedia, joost.wikidata)
    const run = async () => {
      const lines: string[] = []

      await runImport(database.url, {
        makeFetcher: () => fetcherFor([served.nl, served.data]),
        personDataPause: 0,
        wikidataOrigin: served.data.origin,
        wikipediaOrigin: served.nl.origin,
        write: (line) => lines.push(line),
      })

      return lines.filter((line) => line.startsWith('persons (Wikidata)'))
    }

    expect(await run()).toHaveLength(1)
    expect(await run()).toEqual([])
  })

  it('reads Wikidata only for the real Wikipedia, unless a test gives an address', async () => {
    await addPersons('Joost van Aken')
    await database.pool.query('DELETE FROM sources')

    const served = await serve(joost.wikipedia, joost.wikidata)

    await runImport(database.url, {
      makeFetcher: () => fetcherFor([served.nl, served.data]),
      wikipediaOrigin: served.nl.origin,
      write: () => undefined,
    })

    expect(asked(served.data)).toEqual([])
    expect(await rows('SELECT wikidata_read_at FROM persons')).toEqual([{ wikidata_read_at: null }])
  })
})

describe('reading persons again (#1147)', () => {
  const day = 86_400_000
  const readAt = (daysAgo: number) =>
    new Date(now.getTime() - daysAgo * day).toISOString().slice(0, 19).replace('T', ' ')

  async function addRead(title: string, daysAgo: number, extra = '') {
    await database.pool.query(
      `INSERT INTO persons (wikipedia_page, wikidata_id, wikidata_read_at ${extra === '' ? '' : ', ' + extra.split('=')[0]}) VALUES (?, ?, ? ${extra === '' ? '' : ', ' + extra.split('=')[1]})`,
      [title, `Q${title.length}${daysAgo}`, readAt(daysAgo)],
    )
  }

  const served = () =>
    serve(
      { ...infoRoute('Zevenentwintig', 1, 'Q1'), ...infoRoute('Eenendertig', 2, 'Q2') },
      {
        ...itemRoute('Q1', {}),
        ...itemRoute('Q2', { death: [{ precision: 9, time: '+2020-00-00T00:00:00Z' }] }),
        ...itemRoute('Q131', { death: [{ precision: 11, time: '+2019-05-06T00:00:00Z' }] }),
        ...itemRoute('Q1029', {}),
      },
    )

  it('reads a person of 31 days again and not one of 29 days', async () => {
    await addRead('Negenentwintig', 29)
    await addRead('Eenendertig', 31)
    await database.pool.query("UPDATE persons SET wikidata_id = 'Q2' WHERE wikipedia_page = 'Eenendertig'")

    const server = await served()
    const report = await read(server)

    expect(report.read).toBe(1)
    expect(report.reread).toBe(1)
    expect(asked(server.data)).toEqual(['/wiki/Special:EntityData/Q2.json'])
    expect(asked(server.nl)).toEqual([])
  })

  it('keeps a date of death that shows up later, with its precision and source', async () => {
    await addRead('Eenendertig', 31)
    await database.pool.query("UPDATE persons SET wikidata_id = 'Q2' WHERE wikipedia_page = 'Eenendertig'")
    await read(await served())

    expect(
      await rows(
        "SELECT DATE_FORMAT(death_date, '%Y-%m-%d') AS death_date, death_date_precision, death_date_source FROM persons",
      ),
    ).toEqual([{ death_date: '2020-01-01', death_date_precision: 'year', death_date_source: 'wikidata' }])
  })

  it('does not read a person with a date of death again', async () => {
    await addRead('Overleden', 90, "death_date='2020-01-01'")

    const server = await served()

    expect((await read(server)).read).toBe(0)
    expect(asked(server.data)).toEqual([])
  })

  it('reads a person without a Q-number again by his article', async () => {
    await database.pool.query('INSERT INTO persons (wikipedia_page, wikidata_read_at) VALUES (?, ?)', [
      'Zevenentwintig',
      readAt(40),
    ])

    const server = await served()

    expect((await read(server)).reread).toBe(1)
    expect(asked(server.nl)).toHaveLength(1)
    expect(await rows('SELECT wikidata_id FROM persons')).toEqual([{ wikidata_id: 'Q1' }])
  })

  it('reads the oldest reading first, within the limit', async () => {
    await addRead('Eenendertig', 31)
    await addRead('Oudste', 100)
    await database.pool.query("UPDATE persons SET wikidata_id = 'Q2' WHERE wikipedia_page = 'Eenendertig'")
    await database.pool.query("UPDATE persons SET wikidata_id = 'Q1' WHERE wikipedia_page = 'Oudste'")

    const server = await served()

    expect((await read(server, { limit: 1 })).read).toBe(1)
    expect(asked(server.data)).toEqual(['/wiki/Special:EntityData/Q1.json'])
  })

  it('never replaces the year of the editors, and a second run reads nobody', async () => {
    await addPersons('Eenendertig')
    await setEditorsPersonFacts(connection.db, (await rows('SELECT id FROM persons'))[0]?.['id'], { deathYear: 2018 })

    const server = await served()

    expect((await read(server)).read).toBe(1)
    expect((await read(server)).read).toBe(0)
    expect(await rows('SELECT YEAR(death_date) AS year, death_date_source FROM persons')).toEqual([
      { death_date_source: 'manual', year: 2018 },
    ])
  })

  it('gives Wikidata back when the editors clear their year', async () => {
    await addPersons('Eenendertig')
    await setEditorsPersonFacts(connection.db, (await rows('SELECT id FROM persons'))[0]?.['id'], { deathYear: 2018 })
    expect(await rows('SELECT death_date_source FROM persons')).toEqual([{ death_date_source: 'manual' }])

    const server = await served()

    await read(server)
    expect(await rows('SELECT YEAR(death_date) AS y FROM persons')).toEqual([{ y: 2018 }])
    await setEditorsPersonFacts(connection.db, (await rows('SELECT id FROM persons'))[0]?.['id'], { deathYear: null })
    await read(server)
    expect(await rows('SELECT YEAR(death_date) AS y, death_date_source FROM persons')).toEqual([
      { death_date_source: 'wikidata', y: 2020 },
    ])
  })

  it('names the number of persons read again in the log and nothing personal', async () => {
    await addRead('Eenendertig', 31)
    await database.pool.query("UPDATE persons SET wikidata_id = 'Q2' WHERE wikipedia_page = 'Eenendertig'")

    const report = await read(await served())

    expect(describePersonData(report)[0]).toMatch(/^persons \(Wikidata\): 1 person read \(1 read again\), /u)
    expect(describePersonData(report).join(' ')).not.toMatch(/Eenendertig|2020/u)
  })
})

describe('the line and the country of all persons, at every run (#1051)', () => {
  const nobody = { data: {}, nl: {} }
  const insertPlayer = (id: number, season: string, position: null | string, name: string) =>
    database.pool.query('INSERT INTO players (season, name, search_term, position, person_id) VALUES (?, ?, ?, ?, ?)', [
      season,
      name,
      name,
      position,
      id,
    ])

  /** A person that was read before, so the run asks nothing about him. */
  async function addReadPerson(title: string, columns: Record<string, null | string> = {}) {
    const names = ['wikipedia_page', 'wikidata_read_at', ...Object.keys(columns)]

    await database.pool.query(`INSERT INTO persons (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`, [
      title,
      new Date('2026-11-01T10:00:00Z'),
      ...Object.values(columns),
    ])

    const [row] = await rows('SELECT max(id) AS id FROM persons')

    return row?.['id'] as number
  }

  async function addNationalities(personId: number, ...items: [id: string, label: string][]) {
    for (const [position, [id, label]] of items.entries()) {
      await database.pool.query('INSERT IGNORE INTO wikidata_items (id, label) VALUES (?, ?)', [id, label])
      await database.pool.query('INSERT INTO person_nationalities (person_id, item_id, position) VALUES (?, ?, ?)', [
        personId,
        id,
        position,
      ])
    }
  }

  it('gives a person without a line the position of a season row that was set later, with the source squad', async () => {
    const id = await addReadPerson('Later Gezet')

    await insertPlayer(id, '2003/04', null, 'Later Gezet')

    const served = await serve(nobody.nl, nobody.data)

    await read(served)

    expect(await rows('SELECT line, line_source FROM persons')).toEqual([{ line: null, line_source: null }])

    // The editors set the position of the row of that season.
    await database.pool.query("UPDATE players SET position = 'verdediger', editors_fields = 'position'")

    const report = await read(served)

    expect(await rows('SELECT line, line_source FROM persons')).toEqual([{ line: 'verdediger', line_source: 'squad' }])
    expect(report.linesAgain).toEqual({ cleared: 0, squad: 1, wikidata: 0 })
    expect(describePersonData(report)).toEqual([
      'persons (line and country): 1 line from the squad, 0 from Wikidata, 0 taken away; 0 countries from Wikidata, 0 from the list of players, 0 from the squad',
    ])
    expect(asked(served.nl)).toEqual([])
    expect(asked(served.data)).toEqual([])

    // A second run changes nothing and says nothing.
    expect(describePersonData(await read(served))).toEqual([])
  })

  it('follows the rows of a person with the line of the squad, and takes it away when no row has a position', async () => {
    const id = await addReadPerson('Volgt De Rijen', { line: 'aanvaller', line_source: 'squad' })

    await insertPlayer(id, '2003/04', 'middenvelder', 'a1')
    await insertPlayer(id, '2004/05', 'middenvelder', 'a2')

    const served = await serve(nobody.nl, nobody.data)

    await read(served)

    expect(await rows('SELECT line, line_source FROM persons')).toEqual([
      { line: 'middenvelder', line_source: 'squad' },
    ])

    await database.pool.query('UPDATE players SET position = NULL')

    expect((await read(served)).linesAgain).toEqual({ cleared: 1, squad: 0, wikidata: 0 })
    expect(await rows('SELECT line, line_source FROM persons')).toEqual([{ line: null, line_source: null }])
  })

  it('leaves a line that was set by hand or came from Wikidata as it is', async () => {
    const manual = await addReadPerson('Met De Hand', { line: 'doelman', line_source: 'manual' })
    const wikidata = await addReadPerson('Van Wikidata', { line: 'verdediger', line_source: 'wikidata' })

    await insertPlayer(manual, '2003/04', 'aanvaller', 'a1')
    await insertPlayer(wikidata, '2003/04', 'aanvaller', 'a2')

    const report = await read(await serve(nobody.nl, nobody.data))

    expect(await rows('SELECT line, line_source FROM persons ORDER BY id')).toEqual([
      { line: 'doelman', line_source: 'manual' },
      { line: 'verdediger', line_source: 'wikidata' },
    ])
    expect(report.linesAgain).toEqual({ cleared: 0, squad: 0, wikidata: 0 })
  })

  it('fills a line that was taken away from the positions of Wikidata it kept, before the squad', async () => {
    const id = await addReadPerson('Leeg Gemaakt')

    await database.pool.query(
      "INSERT INTO wikidata_items (id, label) VALUES ('Q9999999', 'rare positie'), ('Q201330', 'doelman')",
    )
    await database.pool.query(
      "INSERT INTO person_positions (person_id, item_id, position) VALUES (?, 'Q9999999', 0), (?, 'Q201330', 1)",
      [id, id],
    )
    await insertPlayer(id, '2003/04', 'aanvaller', 'a1')

    const report = await read(await serve(nobody.nl, nobody.data))

    expect(await rows('SELECT line, line_source FROM persons')).toEqual([{ line: 'doelman', line_source: 'wikidata' }])
    expect(report.linesAgain).toEqual({ cleared: 0, squad: 0, wikidata: 1 })
  })

  it('keeps a line the editors set before the person was read', async () => {
    await addPersons('Joost van Aken')
    await database.pool.query("UPDATE persons SET line = 'aanvaller', line_source = 'manual'")

    const report = await read(await serve(joost.wikipedia, joost.wikidata))

    expect(await rows('SELECT line, line_source, wikidata_id FROM persons')).toEqual([
      { line: 'aanvaller', line_source: 'manual', wikidata_id: 'Q15943430' },
    ])
    expect(report.lines).toEqual({ manual: 1, 'old-site': 0, squad: 0, wikidata: 0 })
  })

  it('keeps the line and the country the editors chose on the work list, also in a second run', async () => {
    await addPersons('Joost van Aken')

    const id = Number((await rows('SELECT id FROM persons'))[0]?.['id'])

    // What the work list of the admin does for a choice (issue 1053).
    await setEditorsPersonFacts(database.db, id, { country: 'NO', line: 'aanvaller' })
    await insertPlayer(id, '2003/04', 'doelman', 'a1')

    const chosen = [{ country: 'NO', country_source: 'manual', line: 'aanvaller', line_source: 'manual' }]
    const facts = () => rows('SELECT line, line_source, country, country_source FROM persons')

    // Wikidata is a stronger source than the squad and the old fansite, and says a defender.
    await read(await serve(joost.wikipedia, joost.wikidata))
    expect(await facts()).toEqual(chosen)
    await read(await serve(nobody.nl, nobody.data))
    expect(await facts()).toEqual(chosen)
  })

  it('fills in the country from the first nationality, also for a person read before, and only once', async () => {
    const dutch = await addReadPerson('Een Nederlander')
    const dane = await addReadPerson('Een Deen')

    await addNationalities(dutch, ['Q29999', 'Koninkrijk der Nederlanden'], ['Q155', 'Brazilië'])
    await addNationalities(dane, ['Q756617', 'Koninkrijk Denemarken'])
    await addReadPerson('Zonder Nationaliteit')

    const served = await serve(nobody.nl, nobody.data)
    const report = await read(served)

    expect(await rows('SELECT wikipedia_page, country, country_source FROM persons ORDER BY id')).toEqual([
      { country: 'NL', country_source: 'wikidata', wikipedia_page: 'Een Nederlander' },
      { country: 'DK', country_source: 'wikidata', wikipedia_page: 'Een Deen' },
      { country: null, country_source: null, wikipedia_page: 'Zonder Nationaliteit' },
    ])
    expect(report.countriesFilled).toBe(2)
    expect(report.warnings).toEqual([])
    expect(describePersonData(report)).toEqual([
      'persons (line and country): 0 lines from the squad, 0 from Wikidata, 0 taken away; 2 countries from Wikidata, 0 from the list of players, 0 from the squad',
    ])
    expect(asked(served.data)).toEqual([])
    expect((await read(served)).countriesFilled).toBe(0)
  })

  it('fills in the country of a person in the run that reads him', async () => {
    await addPersons('Joost van Aken')

    const report = await read(await serve(joost.wikipedia, joost.wikidata))

    expect(await rows('SELECT country, country_source FROM persons')).toEqual([
      { country: 'NL', country_source: 'wikidata' },
    ])
    expect(report.countriesFilled).toBe(1)
  })

  it('leaves a first nationality that is not in the list as a gap, with a warning and no guess', async () => {
    const first = await addReadPerson('Uit Joegoslavië')
    const second = await addReadPerson('Ook Uit Joegoslavië')

    // The second nationality is in the list, and is no guess for the first.
    await addNationalities(first, ['Q36704', 'Joegoslavië'], ['Q403', 'Servië'])
    await addNationalities(second, ['Q36704', 'Joegoslavië'])

    const report = await read(await serve(nobody.nl, nobody.data))

    expect(await rows('SELECT country, country_source FROM persons ORDER BY id')).toEqual([
      { country: null, country_source: null },
      { country: null, country_source: null },
    ])
    expect(report.countriesFilled).toBe(0)
    expect(report.warnings).toEqual([
      'Persons: 2 persons have a first nationality that is not in the list of countries, so no country is filled in: Q36704 (Joegoslavië, 2)',
    ])
  })

  it('never changes a country the editors set, and follows Wikidata for one it filled in itself', async () => {
    const manual = await addReadPerson('Door De Redactie', { country: 'RS', country_source: 'manual' })
    const ours = await addReadPerson('Van Wikidata', { country: 'BE', country_source: 'wikidata' })

    for (const id of [manual, ours]) {
      await addNationalities(id, ['Q29999', 'Koninkrijk der Nederlanden'])
    }

    const report = await read(await serve(nobody.nl, nobody.data))

    expect(await rows('SELECT country, country_source FROM persons ORDER BY id')).toEqual([
      { country: 'RS', country_source: 'manual' },
      { country: 'NL', country_source: 'wikidata' },
    ])
    expect(report.countriesFilled).toBe(1)
  })
})

describe('the order of the sources of a line and a country (#1052)', () => {
  const nobody = { data: {}, nl: {} }
  const state = () =>
    rows('SELECT wikipedia_page AS title, line, line_source, country, country_source FROM persons ORDER BY id')
  const countries = async () =>
    (await rows('SELECT country, country_source FROM persons ORDER BY id')).map(
      (row) => `${row['country']} ${row['country_source']}`,
    )

  async function addPerson(title: string, columns: Record<string, null | string> = {}) {
    const names = ['wikipedia_page', 'wikidata_read_at', ...Object.keys(columns)]

    await database.pool.query(`INSERT INTO persons (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`, [
      title,
      new Date('2026-11-01T10:00:00Z'),
      ...Object.values(columns),
    ])

    const [row] = await rows('SELECT max(id) AS id FROM persons')

    return row?.['id'] as number
  }

  const addRow = (personId: number, season: string, columns: { country?: string; position?: string }) =>
    database.pool.query(
      'INSERT INTO players (season, name, search_term, position, country, person_id) VALUES (?, ?, ?, ?, ?, ?)',
      [season, `speler ${personId}`, 'speler', columns.position ?? null, columns.country ?? null, personId],
    )

  const addToList = (title: string, country: null | string) =>
    database.pool.query('INSERT INTO player_list_titles (title, country, read_at) VALUES (?, ?, ?)', [
      title,
      country,
      now,
    ])

  async function addDutchNationality(personId: number) {
    await database.pool.query("INSERT IGNORE INTO wikidata_items (id, label) VALUES ('Q29999', 'Nederland')")
    await database.pool.query(
      "INSERT INTO person_nationalities (person_id, item_id, position) VALUES (?, 'Q29999', 0)",
      [personId],
    )
  }

  /** One person for each source a country can have, all with the country `BE`. */
  async function onePersonPerSource() {
    const ids: number[] = []

    for (const source of [null, 'squad', 'old-site', 'list', 'wikidata', 'manual']) {
      ids.push(
        await addPerson(`Bron ${source ?? 'leeg'}`, source === null ? {} : { country: 'BE', country_source: source }),
      )
    }

    return ids
  }

  it('lets Wikidata replace every source but the editors, and changes nothing in a second run', async () => {
    for (const id of await onePersonPerSource()) {
      await addDutchNationality(id)
    }

    const served = await serve(nobody.nl, nobody.data)
    const report = await read(served)

    expect(await countries()).toEqual([
      'NL wikidata',
      'NL wikidata',
      'NL wikidata',
      'NL wikidata',
      'NL wikidata',
      'BE manual',
    ])
    expect(report.countriesFilled).toBe(5)

    const again = await read(served)

    expect([again.countriesFilled, again.countriesFromList, again.countriesFromSquad]).toEqual([0, 0, 0])
    expect(describePersonData(again)).toEqual([])
  })

  it('lets the list replace the old fansite and the squad, and never Wikidata or the editors', async () => {
    await onePersonPerSource()
    for (const source of ['leeg', 'squad', 'old-site', 'list', 'wikidata', 'manual']) {
      await addToList(`Bron ${source}`, 'DK')
    }

    const served = await serve(nobody.nl, nobody.data)
    const report = await read(served)

    expect(await countries()).toEqual(['DK list', 'DK list', 'DK list', 'DK list', 'BE wikidata', 'BE manual'])
    expect(report.countriesFromList).toBe(4)
    expect(describePersonData(report)).toEqual([
      'persons (line and country): 0 lines from the squad, 0 from Wikidata, 0 taken away; 0 countries from Wikidata, 4 from the list of players, 0 from the squad',
    ])
    expect((await read(served)).countriesFromList).toBe(0)
    expect(await countries()).toEqual(['DK list', 'DK list', 'DK list', 'DK list', 'BE wikidata', 'BE manual'])
  })

  it('lets the squad fill only a person without a country, and follow its own rows', async () => {
    for (const id of await onePersonPerSource()) {
      await addRow(id, '2003/04', { country: 'SE' })
    }

    const served = await serve(nobody.nl, nobody.data)
    const report = await read(served)

    expect(await countries()).toEqual(['SE squad', 'SE squad', 'BE old-site', 'BE list', 'BE wikidata', 'BE manual'])
    expect(report.countriesFromSquad).toBe(2)
    expect((await read(served)).countriesFromSquad).toBe(0)
  })

  it('takes from the squad the country that stands most often, for a tie the latest season, and no unknown code', async () => {
    const most = await addPerson('Het Vaakst')
    const tie = await addPerson('Gelijk')
    const unknown = await addPerson('Onbekende Code')

    await addRow(most, '2001/02', { country: 'DK' })
    await addRow(most, '2002/03', { country: 'DK' })
    await addRow(most, '2003/04', { country: 'NL' })
    await addRow(tie, '2001/02', { country: 'DK' })
    await addRow(tie, '2003/04', { country: 'NL' })
    await addRow(unknown, '2003/04', { country: 'YU' })

    await read(await serve(nobody.nl, nobody.data))

    expect(await countries()).toEqual(['DK squad', 'NL squad', 'null null'])
  })

  it('gives the country of the list to the person of that title only, never to a namesake', async () => {
    await addPerson('Jan Jansen (voetballer, 1990)')
    await addPerson('Jan Jansen')
    await database.pool.query("INSERT INTO persons (name) VALUES ('Jan Jansen (voetballer, 1990)')")
    await addToList('Jan Jansen (voetballer, 1990)', 'NL')
    await addToList('Zonder Vlag', null)
    await addPerson('Zonder Vlag')

    const report = await read(await serve(nobody.nl, nobody.data))

    expect(await countries()).toEqual(['NL list', 'null null', 'null null', 'null null'])
    expect(report.countriesFromList).toBe(1)
  })

  it('keeps a line of the old fansite against the squad, and gives way to Wikidata', async () => {
    const kept = await addPerson('Blijft', { line: 'doelman', line_source: 'old-site' })
    const replaced = await addPerson('Wijkt', { line: 'doelman', line_source: 'old-site' })

    await addRow(kept, '2003/04', { position: 'aanvaller' })
    await addRow(replaced, '2003/04', { position: 'aanvaller' })
    await database.pool.query("INSERT INTO wikidata_items (id, label) VALUES ('Q336286', 'verdediger')")
    await database.pool.query("INSERT INTO person_positions (person_id, item_id, position) VALUES (?, 'Q336286', 0)", [
      replaced,
    ])

    const served = await serve(nobody.nl, nobody.data)
    const report = await read(served)

    expect((await state()).map((row) => `${row['line']} ${row['line_source']}`)).toEqual([
      'doelman old-site',
      'verdediger wikidata',
    ])
    expect(report.linesAgain).toEqual({ cleared: 0, squad: 0, wikidata: 1 })
    expect((await read(served)).linesAgain).toEqual({ cleared: 0, squad: 0, wikidata: 0 })
  })

  it('keeps the line of the old fansite of a person it reads when Wikidata names no position', async () => {
    await addPersons('Zonder Artikel')
    await database.pool.query("UPDATE persons SET line = 'middenvelder', line_source = 'old-site'")

    const [person] = await rows('SELECT id FROM persons')

    await addRow(person?.['id'] as number, '2003/04', { position: 'aanvaller' })

    const report = await read(await serve({}, {}))

    expect(await rows('SELECT line, line_source FROM persons')).toEqual([
      { line: 'middenvelder', line_source: 'old-site' },
    ])
    expect(report.lines).toEqual({ manual: 0, 'old-site': 1, squad: 0, wikidata: 0 })
  })

  describe('the four countries of the United Kingdom (#1278)', () => {
    const country = async () =>
      rows('SELECT country, country_source FROM persons ORDER BY wikipedia_page').then((list) =>
        list.map((row) => [row['country'], row['country_source']]),
      )

    async function readBritish(sportCountries: string[] | undefined, nationalities = ['Q145']) {
      await addPersons('Testspeler Wales')

      const served = await serve(infoRoute('Testspeler Wales', 71, 'Q9701'), {
        ...itemRoute('Q9701', {
          labels: { nl: 'Testspeler Wales' },
          nationalities,
          ...(sportCountries === undefined ? {} : { sportCountries }),
        }),
        ...labelRoute('Q145', 'Verenigd Koninkrijk', 'United Kingdom'),
        ...labelRoute('Q25', 'Wales'),
        ...labelRoute('Q21', 'Engeland'),
      })

      return { report: await read(served), served }
    }

    it('gives a person with the United Kingdom and one of the four as his country for sport that country', async () => {
      const { report } = await readBritish(['Q25'])

      expect(await country()).toEqual([['GB-WLS', 'wikidata-sport']])
      expect(await rows('SELECT item_id FROM person_nationalities ORDER BY position')).toEqual([
        { item_id: 'Q25' },
        { item_id: 'Q145' },
      ])
      expect(describePersonData(report).join('\n')).toContain(
        '0 countries from Wikidata, 1 from the country he plays for (1 in England, Wales, Scotland or Northern Ireland)',
      )
    })

    it('leaves a person with the United Kingdom without a country for sport as he is', async () => {
      await readBritish(undefined)

      expect(await country()).toEqual([['GB', 'wikidata']])
    })

    it('leaves a person as he is when his countries for sport are more than one of the four', async () => {
      await readBritish(['Q25', 'Q21'])

      expect(await country()).toEqual([['GB', 'wikidata']])
    })

    it('does not touch a country the editors set', async () => {
      await addPersons('Testspeler Wales')
      await database.pool.query("UPDATE persons SET country = 'NL', country_source = 'manual'")

      const served = await serve(infoRoute('Testspeler Wales', 71, 'Q9701'), {
        ...itemRoute('Q9701', { labels: { nl: 'Testspeler Wales' }, nationalities: ['Q145'], sportCountries: ['Q25'] }),
        ...labelRoute('Q145', 'Verenigd Koninkrijk'),
        ...labelRoute('Q25', 'Wales'),
      })

      await read(served)

      expect(await country()).toEqual([['NL', 'manual']])
    })
  })
})

describe('the country he plays for and the country of birth (#1289)', () => {
  const state = () =>
    rows('SELECT wikipedia_page AS title, country, country_source, birth_country_id FROM persons ORDER BY id').then(
      (list) =>
        list.map((row) => `${row['title']}: ${row['country']} ${row['country_source']} ${row['birth_country_id']}`),
    )

  /** The routes of one person, whose birth place Q100 lies in the Netherlands. */
  function routes(title: string, id: string, item: Parameters<typeof itemRoute>[1], pageId = 10) {
    return {
      wikidata: {
        ...itemRoute(id, { labels: { nl: title }, place: 'Q100', ...item }),
        ...itemRoute('Q100', { countries: ['Q55'], labels: { nl: 'Plaats' } }),
        ...labelRoute('Q55', 'Nederland', 'Netherlands'),
        ...labelRoute('Q183', 'Duitsland', 'Germany'),
        ...labelRoute('Q1246', 'Kosovo'),
        ...labelRoute('Q1028', 'Marokko', 'Morocco'),
        ...labelRoute('Q25', 'Wales'),
        ...labelRoute('Q145', 'Verenigd Koninkrijk'),
        ...labelRoute('Q34', 'Zweden', 'Sweden'),
      },
      wikipedia: infoRoute(title, pageId, id),
    }
  }

  it('gives the one country he plays for, before the country of birth and the nationality, and keeps both facts', async () => {
    await addPersons('Een Kosovaar')

    const one = routes('Een Kosovaar', 'Q501', { nationalities: ['Q34'], sportCountries: ['Q1246'] })
    const report = await read(await serve(one.wikipedia, one.wikidata))

    expect(await state()).toEqual(['Een Kosovaar: XK wikidata-sport Q55'])
    expect(await rows('SELECT item_id, position FROM person_sport_countries')).toEqual([
      { item_id: 'Q1246', position: 0 },
    ])
    expect(await rows('SELECT id, country_id FROM wikidata_place_countries')).toEqual([
      { country_id: 'Q55', id: 'Q100' },
    ])
    expect(report).toMatchObject({ countriesFromBirth: 0, countriesFromSport: 1, warnings: [] })
    expect(describePersonData(report)[1]).toContain('1 from the country he plays for')
  })

  it('takes the country of the birth place when he plays for none, and the nationality when the place has no country', async () => {
    await addPersons('Zonder Elftal', 'Plaats Zonder Land')

    const first = routes('Zonder Elftal', 'Q502', { nationalities: ['Q34'] }, 11)
    const second = routes('Plaats Zonder Land', 'Q503', { nationalities: ['Q34'], place: 'Q101' }, 12)
    const served = await serve(
      { ...first.wikipedia, ...second.wikipedia },
      { ...first.wikidata, ...second.wikidata, ...itemRoute('Q101', { labels: { nl: 'Verdwenen plaats' } }) },
    )
    const report = await read(served)

    expect(await state()).toEqual(['Zonder Elftal: NL wikidata-birth Q55', 'Plaats Zonder Land: SE wikidata null'])
    expect(report).toMatchObject({ countriesFilled: 1, countriesFromBirth: 1, countriesFromSport: 0 })
    expect(await rows('SELECT id, country_id FROM wikidata_place_countries ORDER BY id')).toEqual([
      { country_id: 'Q55', id: 'Q100' },
      { country_id: null, id: 'Q101' },
    ])
  })

  it('asks about a birth place once, for every person and in a second run', async () => {
    await addPersons('Eerste Speler', 'Tweede Speler')

    const first = routes('Eerste Speler', 'Q504', {}, 13)
    const second = routes('Tweede Speler', 'Q505', {}, 14)
    const served = await serve({ ...first.wikipedia, ...second.wikipedia }, { ...first.wikidata, ...second.wikidata })

    await read(served)

    expect(asked(served.data).filter((path) => path === itemPath('Q100'))).toHaveLength(1)
    expect(asked(served.data).filter((path) => path === itemPath('Q55'))).toHaveLength(1)
  })

  it('lets the flag on his latest season row choose among more than one country he plays for, and never the first', async () => {
    await addPersons('Twee Elftallen', 'Twee Zonder Vlag')

    const first = routes('Twee Elftallen', 'Q506', { sportCountries: ['Q1246', 'Q1028'] }, 15)
    const second = routes('Twee Zonder Vlag', 'Q507', { sportCountries: ['Q1246', 'Q1028'] }, 16)
    const [{ id: firstId }] = (await rows("SELECT id FROM persons WHERE wikipedia_page = 'Twee Elftallen'")) as [
      { id: number },
    ]

    for (const [season, country] of [
      ['2003/04', 'XK'],
      ['2005/06', 'MA'],
    ] as const) {
      await database.pool.query(
        'INSERT INTO players (season, name, search_term, country, person_id) VALUES (?, ?, ?, ?, ?)',
        [season, 'Twee Elftallen', 'Twee', country, firstId],
      )
    }

    await read(await serve({ ...first.wikipedia, ...second.wikipedia }, { ...first.wikidata, ...second.wikidata }))

    // The flag of the latest season is one of his countries; without a flag the birth country
    // follows.
    expect(await state()).toEqual(['Twee Elftallen: MA wikidata-sport Q55', 'Twee Zonder Vlag: NL wikidata-birth Q55'])
  })

  it('gives a country we do not know a warning and no guess, and goes on to the next step', async () => {
    await addPersons('Onbekend Elftal')

    const one = routes('Onbekend Elftal', 'Q508', { nationalities: ['Q34'], sportCountries: ['Q36704'] })
    const report = await read(
      await serve(one.wikipedia, { ...one.wikidata, ...labelRoute('Q36704', 'Joegoslavië', 'Yugoslavia') }),
    )

    expect(await state()).toEqual(['Onbekend Elftal: NL wikidata-birth Q55'])
    expect(report.warnings).toEqual([
      'Persons: 1 person has a country they play for that is not in the list of countries, so it gives no country: Q36704 (Joegoslavië, 1)',
    ])
  })

  it('never changes a country the editors set, and keeps the facts', async () => {
    await addPersons('Door De Redactie')
    await database.pool.query("UPDATE persons SET country = 'RS', country_source = 'manual'")

    const one = routes('Door De Redactie', 'Q509', { sportCountries: ['Q1246'] })

    await read(await serve(one.wikipedia, one.wikidata))

    expect(await state()).toEqual(['Door De Redactie: RS manual Q55'])
    expect(await rows('SELECT item_id FROM person_sport_countries')).toEqual([{ item_id: 'Q1246' }])
  })

  it('keeps England, Wales, Scotland and Northern Ireland above the United Kingdom as a country of birth', async () => {
    await addPersons('Een Welshman')

    const one = routes('Een Welshman', 'Q510', { nationalities: ['Q25'] })
    const served = await serve(one.wikipedia, {
      ...one.wikidata,
      ...itemRoute('Q100', { countries: ['Q145'], labels: { nl: 'Plaats' } }),
      ...labelRoute('Q145', 'Verenigd Koninkrijk'),
    })

    await read(served)

    expect(await state()).toEqual(['Een Welshman: GB-WLS wikidata Q145'])
  })

  it('does not keep an answer for a birth place that is no item, and asks the place again next run', async () => {
    await addPersons('Zonder Plaats')

    const one = routes('Zonder Plaats', 'Q511', { nationalities: ['Q34'] }, 17)
    const served = await serve(one.wikipedia, { ...one.wikidata, [itemPath('Q100')]: reply(200, 'geen item') })
    const report = await read(served)

    expect(await rows('SELECT id FROM wikidata_place_countries')).toEqual([])
    expect(await rows('SELECT wikidata_read_at FROM persons')).toEqual([{ wikidata_read_at: null }])
    expect(report.warnings[0]).toContain('the answer is not an item')
  })

  it('is safe to run twice: a second run of a normal read asks and changes nothing', async () => {
    await addPersons('Een Kosovaar')

    const one = routes('Een Kosovaar', 'Q501', { sportCountries: ['Q1246'] })
    const served = await serve(one.wikipedia, one.wikidata)

    await read(served)

    const before = await state()
    const askedBefore = asked(served.data).length

    expect((await read(served)).countriesFromSport).toBe(0)
    expect(await state()).toEqual(before)
    expect(asked(served.data)).toHaveLength(askedBefore)
  })
})

describe('reading every person again for the countries (#1289)', () => {
  const stamped = new Date('2026-11-01T10:00:00Z')

  async function addReadPersonWithItem(title: string, itemId: string, columns = '') {
    await database.pool.query(
      `INSERT INTO persons (wikipedia_page, wikidata_id, wikipedia_page_id, wikidata_read_at${columns === '' ? '' : ', ' + columns.split('=')[0]}) VALUES (?, ?, 77, ?${columns === '' ? '' : ', ' + columns.split('=')[1]})`,
      [title, itemId, stamped],
    )
  }

  const itemWith = (id: string, sportCountries: string[]) => ({
    ...itemRoute(id, { labels: { nl: id }, nationalities: ['Q34'], sportCountries }),
    ...labelRoute('Q34', 'Zweden', 'Sweden'),
    ...labelRoute('Q1246', 'Kosovo'),
  })

  it('reads the persons who were read before once, and a second run asks nothing', async () => {
    await addReadPersonWithItem('Eerder Gelezen', 'Q601')
    await addReadPersonWithItem('Ook Eerder Gelezen', 'Q602')
    await addPersons('Nog Nooit Gelezen')

    const served = await serve({}, { ...itemWith('Q601', ['Q1246']), ...itemWith('Q602', []) })
    const run = () =>
      readPersonData(connection.db, fetcherFor([served.nl, served.data]), {
        clock: () => now,
        countryFacts: true,
        origin: served.nl.origin,
        pause: 0,
        wikidata: served.data.origin,
      })
    const report = await run()

    expect(report.read).toBe(2)
    expect(
      (await rows('SELECT wikipedia_page, country, country_source FROM persons ORDER BY id')).map(
        (row) => `${row['wikipedia_page']}: ${row['country']} ${row['country_source']}`,
      ),
    ).toEqual(['Eerder Gelezen: XK wikidata-sport', 'Ook Eerder Gelezen: SE wikidata', 'Nog Nooit Gelezen: null null'])
    expect(await rows('SELECT wikipedia_page FROM persons WHERE country_facts_read_at IS NULL')).toEqual([
      { wikipedia_page: 'Nog Nooit Gelezen' },
    ])

    const askedBefore = asked(served.data).length
    const again = await run()

    expect(again.read).toBe(0)
    expect(asked(served.data)).toHaveLength(askedBefore)
  })

  it('never changes a country the editors set', async () => {
    await addReadPersonWithItem('Door De Redactie', 'Q603', "country='RS'")
    await database.pool.query("UPDATE persons SET country_source = 'manual'")

    const served = await serve({}, itemWith('Q603', ['Q1246']))

    await readPersonData(connection.db, fetcherFor([served.nl, served.data]), {
      clock: () => now,
      countryFacts: true,
      origin: served.nl.origin,
      pause: 0,
      wikidata: served.data.origin,
    })

    expect(await rows('SELECT country, country_source FROM persons')).toEqual([
      { country: 'RS', country_source: 'manual' },
    ])
  })
  it('is the command import:country-facts: it says what it did, and the second time nobody is left', async () => {
    await addReadPersonWithItem('Eerder Gelezen', 'Q601')

    const served = await serve({}, itemWith('Q601', ['Q1246']))
    const lines: string[] = []
    const run = () =>
      runCountryFactsCommand(database.url, {
        clock: () => now,
        makeFetcher: () => fetcherFor([served.nl, served.data]),
        personDataPause: 0,
        wikidataOrigin: served.data.origin,
        wikipediaOrigin: served.nl.origin,
        write: (line) => lines.push(line),
      })

    expect(await run()).toBe(0)
    expect(lines.join('\n')).toContain('1 person read')
    expect(lines.join('\n')).toContain('1 from the country he plays for')

    lines.length = 0

    const askedBefore = asked(served.data).length

    expect(await run()).toBe(0)
    expect(lines).toEqual(['Country facts: nobody to read.'])
    expect(asked(served.data)).toHaveLength(askedBefore)
  })
})
