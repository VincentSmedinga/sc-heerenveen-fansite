import type { TestDatabase } from '@fansite/db/test-database'
import type { RowDataPacket } from 'mysql2/promise'

import { connect } from '@fansite/db/client'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

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
  await database.pool.query('DELETE FROM wikidata_items')
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
      'persons (Wikidata): 1 person read, 1 with a birth date, 1 with a nationality, 1 with a line (1 from Wikidata, 0 from the squad, 0 set by hand), 0 left empty; 1 articles and 6 items asked',
      'persons (line and country): 0 lines from the squad, 0 from Wikidata, 0 taken away; 1 country from Wikidata',
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

    const served = await serve(joost.wikipedia, joost.wikidata)

    await read(served)

    expect(asked(served.data)).toEqual([itemPath('Q15943430')])
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
    expect(report.lines).toEqual({ manual: 0, squad: 2, wikidata: 0 })
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
    expect(report.lines).toEqual({ manual: 1, squad: 0, wikidata: 0 })

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
      'persons (line and country): 1 line from the squad, 0 from Wikidata, 0 taken away; 0 countries from Wikidata',
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
    expect(report.lines).toEqual({ manual: 1, squad: 0, wikidata: 0 })
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
      'persons (line and country): 0 lines from the squad, 0 from Wikidata, 0 taken away; 2 countries from Wikidata',
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
    const old = await addReadPerson('Van De Oude Site', { country: 'BE', country_source: 'old-site' })
    const ours = await addReadPerson('Van Wikidata', { country: 'BE', country_source: 'wikidata' })

    for (const id of [manual, old, ours]) {
      await addNationalities(id, ['Q29999', 'Koninkrijk der Nederlanden'])
    }

    const report = await read(await serve(nobody.nl, nobody.data))

    expect(await rows('SELECT country, country_source FROM persons ORDER BY id')).toEqual([
      { country: 'RS', country_source: 'manual' },
      { country: 'BE', country_source: 'old-site' },
      { country: 'NL', country_source: 'wikidata' },
    ])
    expect(report.countriesFilled).toBe(1)
  })
})
