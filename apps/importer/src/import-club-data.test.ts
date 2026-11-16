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
  ['Q21', 'GB-ENG'],
  ['Q25', 'GB-WLS'],
  ['Q55', 'NL'],
  ['Q145', 'GB'],
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
  await database.pool.query('DELETE FROM wikidata_places')
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

  it('says that a number from an article is from Wikipedia, and leaves the source of a number that has one', async () => {
    await addClub('bayern', 'Bayern München')
    await addClub('ajax', 'Ajax')
    await database.pool.query("UPDATE clubs SET wikidata_id = 'Q1', wikidata_source = 'manual' WHERE slug = 'ajax'")

    const served = await serve(
      { ...infoRoute('Bayern München', 11, 'Q15789') },
      { ...itemRoute('Q15789', {}), ...itemRoute('Q1', {}) },
    )

    await read(served)

    expect(await rows('SELECT slug, wikidata_id, wikidata_source FROM clubs ORDER BY slug')).toEqual([
      { slug: 'ajax', wikidata_id: 'Q1', wikidata_source: 'manual' },
      { slug: 'bayern', wikidata_id: 'Q15789', wikidata_source: 'wikipedia' },
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

  describe('the four countries of the United Kingdom (#1278)', () => {
    // Made-up Q-numbers for the places, in the shape Wikidata has: a club has a headquarters
    // (`P159`) or lies in a place (`P131`), and a place lies in a larger one, up to a country.
    const clubs = {
      newcastle: infoRoute('Newcastle United', 21, 'Q9001'),
      ton: infoRoute('Ton Pentre FC', 22, 'Q9002'),
    }
    const items = {
      ...itemRoute('Q9001', { countries: ['Q145'], headquarters: ['Q9101'] }),
      ...itemRoute('Q9002', { countries: ['Q145'], placesIn: ['Q9201'] }),
      // Newcastle: city, county, England.
      ...itemRoute('Q9101', { placesIn: ['Q9102'] }),
      ...itemRoute('Q9102', { placesIn: ['Q21'] }),
      // Ton Pentre: village, county borough, Wales.
      ...itemRoute('Q9201', { placesIn: ['Q9202'] }),
      ...itemRoute('Q9202', { placesIn: ['Q25'] }),
      ...labelRoute('Q145', 'Verenigd Koninkrijk', 'United Kingdom'),
    }

    it('gives a club of the United Kingdom the country of the place it lies in', async () => {
      await addClub('newcastle', 'Newcastle United')
      await addClub('ton', 'Ton Pentre FC')

      const served = await serve({ ...clubs.newcastle, ...clubs.ton }, items)
      const report = await read(served)

      expect(await countries()).toEqual([
        { country: 'GB-ENG', country_source: 'wikidata', slug: 'newcastle', wikidata_id: 'Q9001' },
        { country: 'GB-WLS', country_source: 'wikidata', slug: 'ton', wikidata_id: 'Q9002' },
      ])
      expect(report).toMatchObject({ countriesBritish: 2, countriesFilled: 2, warnings: [] })
      // A club that is read now has its places stored with it: its item is asked for once.
      expect(asked(served.data).filter((path) => path?.includes('Q9001') === true)).toHaveLength(1)
      expect(describeClubData(report)[0]).toContain(
        '2 clubs got a country (2 in England, Wales, Scotland or Northern Ireland)',
      )
    })

    it('asks nothing on a second run: the places are in the database', async () => {
      await addClub('ton', 'Ton Pentre FC')

      const served = await serve(clubs.ton, items)

      await read(served)

      const before = asked(served.data).length
      const second = await read(served)

      expect(asked(served.data)).toHaveLength(before)
      expect(second).toMatchObject({ countriesBritish: 0, countriesFilled: 0, itemsAsked: 0 })
      expect(describeClubData(second)).toEqual([])
      expect(await rows('SELECT id, parent_ids FROM wikidata_places ORDER BY id')).toEqual([
        { id: 'Q9002', parent_ids: 'Q9201' },
        { id: 'Q9201', parent_ids: 'Q9202' },
        { id: 'Q9202', parent_ids: 'Q25' },
      ])
    })

    it('refines a club that was read before and has the United Kingdom, without reading it again', async () => {
      await addClub('ton', 'Ton Pentre FC')
      await database.pool.query("INSERT INTO wikidata_items (id, label) VALUES ('Q145', 'Verenigd Koninkrijk')")
      await database.pool.query(
        "UPDATE clubs SET wikidata_id = 'Q9002', country_item_id = 'Q145', country = 'GB', country_source = 'wikidata', wikidata_read_at = NOW()",
      )

      const served = await serve({}, items)

      await read(served)

      expect(await countries()).toEqual([
        { country: 'GB-WLS', country_source: 'wikidata', slug: 'ton', wikidata_id: 'Q9002' },
      ])
      expect(asked(served.nl)).toEqual([])
      // The item of the club is asked for once more, for its places, and then the chain.
      expect(asked(served.data)).toEqual([
        '/wiki/Special:EntityData/Q9002.json',
        '/wiki/Special:EntityData/Q9201.json',
        '/wiki/Special:EntityData/Q9202.json',
      ])
    })

    it('never changes a club the editors set, also with GB', async () => {
      await addClub('ton', 'Ton Pentre FC')
      await database.pool.query("UPDATE clubs SET country = 'GB', country_source = 'manual'")

      const served = await serve(clubs.ton, items)

      await read(served)

      expect(await countries()).toEqual([
        { country: 'GB', country_source: 'manual', slug: 'ton', wikidata_id: 'Q9002' },
      ])
      expect(asked(served.data)).not.toContain('/wiki/Special:EntityData/Q9201.json')
    })

    it('leaves a club with the United Kingdom when its places end in two countries or in none', async () => {
      await addClub('twee', 'Twee FC')
      await addClub('geen', 'Geen FC')

      const served = await serve(
        { ...infoRoute('Twee FC', 31, 'Q9301'), ...infoRoute('Geen FC', 32, 'Q9302') },
        {
          ...itemRoute('Q9301', { countries: ['Q145'], placesIn: ['Q21', 'Q25'] }),
          ...itemRoute('Q9302', { countries: ['Q145'], placesIn: ['Q9303'] }),
          ...itemRoute('Q9303', {}),
          ...labelRoute('Q145', 'Verenigd Koninkrijk'),
        },
      )

      await read(served)

      expect(await countries()).toEqual([
        { country: 'GB', country_source: 'wikidata', slug: 'geen', wikidata_id: 'Q9302' },
        { country: 'GB', country_source: 'wikidata', slug: 'twee', wikidata_id: 'Q9301' },
      ])
    })

    it('gives a club that Wikidata gives one of the four itself that country, without asking about places', async () => {
      await addClub('wales', 'Wales FC')

      const served = await serve(infoRoute('Wales FC', 41, 'Q9401'), {
        ...itemRoute('Q9401', { countries: ['Q145', 'Q25'] }),
        ...labelRoute('Q25', 'Wales'),
      })

      await read(served)

      expect(await countries()).toEqual([
        { country: 'GB-WLS', country_source: 'wikidata', slug: 'wales', wikidata_id: 'Q9401' },
      ])
      expect(asked(served.data)).toEqual(['/wiki/Special:EntityData/Q9401.json', '/wiki/Special:EntityData/Q25.json'])
    })
  })
})
