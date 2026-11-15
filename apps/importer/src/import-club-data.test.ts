import type { TestDatabase } from '@fansite/db/test-database'
import type { RowDataPacket } from 'mysql2/promise'

import { connect } from '@fansite/db/client'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { describeClubData, readClubData } from './import-club-data.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'
import { infoRoute, itemRoute, labelRoute } from './test-wikidata.ts'

const now = new Date('2026-11-15T12:00:00Z')
const codes = new Map([
  ['Q55', 'NL'],
  ['Q183', 'DE'],
])

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
  await database.pool.query('DELETE FROM clubs')
  await database.pool.query('DELETE FROM wikidata_items')
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

async function addClub(slug: string, page: null | string) {
  await database.pool.query('INSERT INTO clubs (slug, name, wikipedia_page) VALUES (?, ?, ?)', [slug, slug, page])
}

async function rows(sql: string) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql)

  return result
}

async function serve(wikipedia: Record<string, Handler>, wikidata: Record<string, Handler>) {
  const robots = { '/robots.txt': reply(200, '', { 'Content-Type': 'text/plain' }) }
  const nl = await startServer({ ...robots, ...wikipedia })
  const data = await startServer({ ...robots, ...wikidata }, 'localhost')

  servers.push(nl, data)

  return { data, nl }
}

const asked = (server: TestServer) => server.paths().filter((path) => path !== '/robots.txt')

async function read(served: { data: TestServer; nl: TestServer }) {
  return readClubData(connection.db, fetcherFor([served.nl, served.data]), {
    clock: () => now,
    countryCodes: codes,
    origin: served.nl.origin,
    pause: 0,
    wikidata: served.data.origin,
  })
}

const countries = () => rows('SELECT slug, country, country_source, wikidata_id FROM clubs ORDER BY slug')

describe('readClubData', () => {
  it('gives a club the country of its item, with the source wikidata', async () => {
    await addClub('bayern', 'Bayern München')

    const served = await serve(infoRoute('Bayern München', 11, 'Q15789'), {
      ...itemRoute('Q15789', { countries: ['Q183'] }),
      ...labelRoute('Q183', 'Duitsland', 'Germany'),
    })
    const report = await read(served)

    expect(await countries()).toEqual([
      { country: 'DE', country_source: 'wikidata', slug: 'bayern', wikidata_id: 'Q15789' },
    ])
    expect(report).toMatchObject({ countriesFilled: 1, read: 1, warnings: [], withoutCountry: 0 })
    expect(describeClubData(report)).toEqual([
      'clubs (country): 1 club read from Wikidata, 1 club got a country, 0 clubs have none yet; 2 items asked',
    ])
  })

  it('never changes a club with the source manual, and asks nothing about its country', async () => {
    await addClub('bayern', 'Bayern München')
    await database.pool.query("UPDATE clubs SET country = 'NL', country_source = 'manual'")

    const served = await serve(infoRoute('Bayern München', 11, 'Q15789'), {
      ...itemRoute('Q15789', { countries: ['Q183'] }),
      ...labelRoute('Q183', 'Duitsland'),
    })

    await read(served)

    expect(await countries()).toEqual([
      { country: 'NL', country_source: 'manual', slug: 'bayern', wikidata_id: 'Q15789' },
    ])
  })

  it('warns about a country that is not in the list, and guesses nothing', async () => {
    await addClub('dynamo', 'Dynamo Dresden')

    const served = await serve(infoRoute('Dynamo Dresden', 12, 'Q1'), {
      ...itemRoute('Q1', { countries: ['Q16957'] }),
      ...labelRoute('Q16957', 'Oost-Duitsland', 'East Germany'),
    })
    const report = await read(served)

    expect(await countries()).toEqual([{ country: null, country_source: null, slug: 'dynamo', wikidata_id: 'Q1' }])
    expect(report.warnings).toEqual([
      'Clubs: Q16957 (Oost-Duitsland) is not in the list of countries, so no country is filled in for dynamo',
    ])
    expect(report.withoutCountry).toBe(1)
  })

  it('asks nothing for a club without a page, and nothing again on a second run', async () => {
    await addClub('bayern', 'Bayern München')
    await addClub('zonder', null)

    const served = await serve(infoRoute('Bayern München', 11, 'Q15789'), {
      ...itemRoute('Q15789', { countries: ['Q183'] }),
      ...labelRoute('Q183', 'Duitsland'),
    })

    await read(served)

    const before = [asked(served.nl).length, asked(served.data).length]
    const second = await read(served)

    expect(before).toEqual([1, 2])
    expect([asked(served.nl).length, asked(served.data).length]).toEqual(before)
    expect(second).toMatchObject({ countriesFilled: 0, read: 0 })
    expect(describeClubData(second)).toEqual([])
    expect(await countries()).toEqual([
      { country: 'DE', country_source: 'wikidata', slug: 'bayern', wikidata_id: 'Q15789' },
      { country: null, country_source: null, slug: 'zonder', wikidata_id: null },
    ])
  })

  it('leaves a club unread when a request fails, so the next run tries again', async () => {
    await addClub('bayern', 'Bayern München')

    const served = await serve(infoRoute('Bayern München', 11, 'Q15789'), {
      '/wiki/Special:EntityData/Q15789.json': reply(500, 'kapot'),
    })
    const report = await read(served)

    expect(report.warnings[0]).toMatch(/^Clubs: 1 request to read clubs failed/u)
    expect(await rows('SELECT wikidata_id, wikidata_read_at FROM clubs')).toEqual([
      { wikidata_id: 'Q15789', wikidata_read_at: null },
    ])
  })
})
