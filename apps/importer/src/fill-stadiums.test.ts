import type { TestDatabase } from '@fansite/db/test-database'
import type { RowDataPacket } from 'mysql2/promise'

import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { describeFill, runFillStadiumsCommand } from './fill-stadiums.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM club_home_grounds')
  await database.pool.query('DELETE FROM stadium_names')
  await database.pool.query('DELETE FROM stadiums')
  await database.pool.query('DELETE FROM clubs')
})

describe('describeFill', () => {
  it('says nothing when there was nothing to do, else how many it filled and left, by reason', () => {
    const none = { edited: 0, neutral: 0, noGround: 0, notYet: 0, text: 0 }

    expect(describeFill({ filled: 0, skipped: none })).toEqual([])
    expect(describeFill({ filled: 5, skipped: { ...none, neutral: 1, noGround: 2 } })).toEqual([
      'Stadiums of matches: 5 filled from the home grounds, 3 left without.',
      'Stadiums of matches: 1 left, a final or another match on neutral ground.',
      'Stadiums of matches: 2 left, the home club has no home ground.',
    ])
  })
})

describe('runFillStadiumsCommand', () => {
  it('fills a match of the old fansite from the home ground of its opponent, twice without a change', async () => {
    await database.pool.query("INSERT INTO clubs (slug, name) VALUES ('thuis-fc', 'Thuis FC')")
    await database.pool.query('INSERT INTO stadiums () VALUES ()')
    await database.pool.query(
      "INSERT INTO stadium_names (stadium_id, name, position) SELECT id, 'Thuisveld', 0 FROM stadiums",
    )
    await database.pool.query(
      'INSERT INTO club_home_grounds (club_id, stadium_id, position) SELECT c.id, s.id, 0 FROM clubs c, stadiums s',
    )
    await database.pool.query(
      `INSERT INTO matches (club_id, opponent, competition, season, round, home, status, goals_for, goals_against,
         match_date, data_source)
       SELECT id, name, 'Eredivisie', '1995/96', 'Speelronde 1', 0, 'played', 1, 0, '1995-09-01', 'oude-fansite' FROM clubs`,
    )

    const lines: string[] = []

    expect(await runFillStadiumsCommand(database.url, { write: (line) => lines.push(line) })).toBe(0)
    expect(lines).toEqual(['Stadiums of matches: 1 filled from the home grounds, 0 left without.'])

    const [filled] = await database.pool.query<RowDataPacket[]>('SELECT stadium_id FROM matches')

    expect(filled?.[0]?.['stadium_id']).not.toBeNull()

    lines.length = 0
    await runFillStadiumsCommand(database.url, { write: (line) => lines.push(line) })

    expect(lines).toEqual(['Stadiums of matches: nothing to fill.'])
  })
})
