import type { TestDatabase } from '@fansite/db/test-database'
import type { RowDataPacket } from 'mysql2/promise'

import { connect } from '@fansite/db/client'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { describeClubStadiums, homeGroundRows, readClubStadiums } from './import-club-stadiums.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'
import { itemPath, itemRoute, labelRoute } from './test-wikidata.ts'

const now = new Date('2026-11-16T12:00:00Z')
const day = (time: string) => ({ precision: 11, time: `+${time}T00:00:00Z` })
const month = (time: string) => ({ precision: 10, time: `+${time}-00T00:00:00Z` })
const year = (time: string) => ({ precision: 9, time: `+${time}-00-00T00:00:00Z` })

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

async function addClub(slug: string, wikidataId: null | string, extra = '') {
  await database.pool.query(
    `INSERT INTO clubs (slug, name, wikidata_id, wikidata_read_at${extra === '' ? '' : ', home_grounds_source'}) VALUES (?, ?, ?, ?${extra === '' ? '' : ', ?'})`,
    [slug, slug, wikidataId, wikidataId === null ? null : now, ...(extra === '' ? [] : [extra])],
  )
}

async function rows(sql: string) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql)

  return result
}

async function serve(wikidata: Record<string, Handler>) {
  const robots = { '/robots.txt': reply(200, '', { 'Content-Type': 'text/plain' }) }
  const data = await startServer({ ...robots, ...wikidata }, 'localhost')

  servers.push(data)

  return data
}

const asked = (server: TestServer) => server.paths().filter((path) => path !== '/robots.txt')

async function read(server: TestServer) {
  return readClubStadiums(connection.db, fetcherFor([server]), { clock: () => now, pause: 0, wikidata: server.origin })
}

const grounds = () =>
  rows(`SELECT c.slug, n.name, g.position, g.start_season, DATE_FORMAT(g.start_day, '%Y-%m-%d') AS start_day
    FROM club_home_grounds g JOIN clubs c ON c.id = g.club_id
    JOIN stadium_names n ON n.stadium_id = g.stadium_id AND n.position = 0
    ORDER BY c.slug, g.position`)

describe('readClubStadiums', () => {
  it('makes the stadium of a club with one ground, with its place and coordinates', async () => {
    await addClub('twente', 'Q1')

    const server = await serve({
      ...itemRoute('Q1', { homeGrounds: [{ value: 'Q10' }] }),
      ...itemRoute('Q10', {
        coordinates: { latitude: 52.2367, longitude: 6.8375 },
        labels: { nl: 'De Grolsch Veste' },
        placesIn: ['Q20'],
      }),
      ...labelRoute('Q20', 'Enschede'),
    })
    const report = await read(server)

    expect(report).toMatchObject({ clubsRead: 1, groundsWritten: 1, stadiumsCreated: 1, stadiumsUpdated: 0 })
    expect(
      await rows('SELECT wikidata_id, place, latitude, longitude, place_source, street, postcode FROM stadiums'),
    ).toEqual([
      {
        latitude: '52.236700',
        longitude: '6.837500',
        place: 'Enschede',
        place_source: 'wikidata',
        postcode: null,
        street: null,
        wikidata_id: 'Q10',
      },
    ])
    expect(await grounds()).toEqual([
      { name: 'De Grolsch Veste', position: 0, slug: 'twente', start_day: null, start_season: null },
    ])
    expect(await rows('SELECT home_grounds_source, stadiums_read_at FROM clubs')).toEqual([
      { home_grounds_source: 'wikidata', stadiums_read_at: now },
    ])
  })

  it('puts a club with dated grounds (A, B, A) in order, with the season or the day of each start', async () => {
    await addClub('az', 'Q2')

    const server = await serve({
      ...itemRoute('Q2', {
        homeGrounds: [
          { start: day('1996-08-10'), value: 'Q12' },
          { end: year('1996'), value: 'Q11' },
          { start: month('2009-08'), value: 'Q13' },
        ],
      }),
      ...itemRoute('Q11', { labels: { nl: 'Alkmaarderhout' }, placesIn: ['Q20'] }),
      ...itemRoute('Q12', { labels: { nl: 'Alkmaarderhout II' } }),
      ...itemRoute('Q13', { labels: { en: 'AFAS Stadion' } }),
      ...labelRoute('Q20', 'Alkmaar'),
    })

    await read(server)

    expect(await grounds()).toEqual([
      { name: 'Alkmaarderhout', position: 0, slug: 'az', start_day: null, start_season: null },
      { name: 'Alkmaarderhout II', position: 1, slug: 'az', start_day: '1996-08-10', start_season: null },
      { name: 'AFAS Stadion', position: 2, slug: 'az', start_day: null, start_season: '2009/10' },
    ])
  })

  it('writes a ground without coordinates, and asks nothing about a club without a ground', async () => {
    await addClub('vitesse', 'Q3')
    await addClub('feyenoord', 'Q4')

    const server = await serve({
      ...itemRoute('Q3', { homeGrounds: [{ value: 'Q14' }] }),
      ...itemRoute('Q14', { labels: { nl: 'GelreDome' } }),
      ...itemRoute('Q4', { labels: { nl: 'Feyenoord' } }),
    })
    const report = await read(server)

    expect(report).toMatchObject({ clubsRead: 2, clubsWithoutGround: 1, groundsWritten: 1 })
    expect(await rows('SELECT place, latitude, longitude, place_source FROM stadiums')).toEqual([
      { latitude: null, longitude: null, place: null, place_source: null },
    ])
    expect(await rows('SELECT slug FROM clubs WHERE stadiums_read_at IS NOT NULL ORDER BY slug')).toHaveLength(2)
  })

  it('leaves the place of a stadium that the editors set, and the grounds of a club they set', async () => {
    await addClub('heracles', 'Q5')
    await addClub('nac', 'Q6', 'manual')
    await database.pool.query(
      "INSERT INTO stadiums (wikidata_id, place, latitude, longitude, place_source) VALUES ('Q15', 'Almelo', 52.3, 6.6, 'manual')",
    )

    const server = await serve({
      ...itemRoute('Q5', { homeGrounds: [{ value: 'Q15' }] }),
      ...itemRoute('Q15', {
        coordinates: { latitude: 1, longitude: 2 },
        labels: { nl: 'Erve Asito' },
        placesIn: ['Q21'],
      }),
      ...labelRoute('Q21', 'Elders'),
    })
    const report = await read(server)

    expect(report).toMatchObject({ clubsLeft: 1, clubsRead: 1, stadiumsCreated: 0, stadiumsUpdated: 0 })
    expect(await rows('SELECT place, latitude, longitude, place_source FROM stadiums')).toEqual([
      { latitude: '52.300000', longitude: '6.600000', place: 'Almelo', place_source: 'manual' },
    ])
    expect(asked(server).some((path) => path === itemPath('Q6'))).toBe(false)
    expect(await rows("SELECT slug FROM clubs WHERE slug = 'nac' AND stadiums_read_at IS NULL")).toHaveLength(1)
  })

  it('gives the item to a stadium of the same name at the same club, and updates one that has it', async () => {
    await addClub('twente', 'Q1')
    await database.pool.query('INSERT INTO stadiums () VALUES ()')
    await database.pool.query(
      "INSERT INTO stadium_names (stadium_id, position, name) SELECT id, 0, 'De Grolsch Veste' FROM stadiums",
    )
    await database.pool.query(
      "INSERT INTO club_home_grounds (club_id, stadium_id, position) SELECT c.id, s.id, 0 FROM clubs c, stadiums s WHERE c.slug = 'twente'",
    )

    const server = await serve({
      ...itemRoute('Q1', { homeGrounds: [{ value: 'Q10' }] }),
      ...itemRoute('Q10', { coordinates: { latitude: 52, longitude: 6 }, labels: { nl: 'De Grolsch  veste' } }),
    })
    const report = await read(server)

    expect(report).toMatchObject({ stadiumsCreated: 0, stadiumsUpdated: 1 })
    expect(await rows('SELECT wikidata_id, latitude FROM stadiums')).toEqual([
      { latitude: '52.000000', wikidata_id: 'Q10' },
    ])
  })

  it('links the matches that now fit a stadium, and asks nothing on a second run', async () => {
    await addClub('twente', 'Q1')
    await database.pool.query(
      "INSERT INTO matches (club_id, competition, goals_against, goals_for, home, kickoff_at, match_date, opponent, round, season, stadium, status) SELECT id, 'Eredivisie', 0, 1, 0, '2025-10-05 15:00:00', '2025-10-05', 'FC Twente', 'Speelronde 9', '2025/26', 'De Grolsch Veste', 'played' FROM clubs",
    )

    const server = await serve({
      ...itemRoute('Q1', { homeGrounds: [{ value: 'Q10' }] }),
      ...itemRoute('Q10', { labels: { nl: 'De Grolsch Veste' } }),
    })

    expect((await read(server)).matchesLinked).toBe(1)

    const before = asked(server).length
    const again = await read(server)

    expect(asked(server)).toHaveLength(before)
    expect(describeClubStadiums(again)).toEqual([])
    expect(await rows('SELECT COUNT(*) AS n FROM stadiums')).toEqual([{ n: 1 }])
  })

  it('leaves a club unread when a request fails, so the next run tries again', async () => {
    await addClub('twente', 'Q1')

    const server = await serve({
      ...itemRoute('Q1', { homeGrounds: [{ value: 'Q10' }] }),
      [itemPath('Q10')]: reply(500, 'kapot'),
    })
    const report = await read(server)

    expect(report.warnings[0]).toMatch(/^Stadiums: 1 request to read stadiums failed/u)
    expect(await rows('SELECT stadiums_read_at FROM clubs')).toEqual([{ stadiums_read_at: null }])
    expect(await rows('SELECT id FROM stadiums')).toEqual([])
  })
})

describe('homeGroundRows', () => {
  const at = (year: number, month: null | number = null, dayOfMonth: null | number = null) => ({
    day: dayOfMonth,
    month,
    year,
  })

  it('counts a month before July in the season that began the year before, and a year alone in its own', () => {
    expect(
      homeGroundRows([
        { end: null, stadiumId: 'Q1', start: at(2010, 3) },
        { end: null, stadiumId: 'Q2', start: at(2012) },
      ]),
    ).toEqual([
      { stadiumId: 'Q1', startDay: null, startSeason: '2009/10' },
      { stadiumId: 'Q2', startDay: null, startSeason: '2012/13' },
    ])
  })

  it('takes the start of a ground from the end of the one before, and gives up when it cannot', () => {
    expect(
      homeGroundRows([
        { end: at(1990, 6, 30), stadiumId: 'Q1', start: null },
        { end: null, stadiumId: 'Q2', start: null },
      ]),
    ).toEqual([
      { stadiumId: 'Q1', startDay: null, startSeason: null },
      { stadiumId: 'Q2', startDay: '1990-06-30', startSeason: null },
    ])
    expect(
      homeGroundRows([
        { end: null, stadiumId: 'Q1', start: null },
        { end: null, stadiumId: 'Q2', start: null },
      ]),
    ).toBeNull()
  })
})
