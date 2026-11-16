import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { clubHomeGrounds, clubs, matches, stadiumNames, stadiums } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { readStadiumGaps } from './stadium-quality'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const stadium = async (name: string, values: Partial<typeof stadiums.$inferInsert> = {}) => {
  const [{ insertId }] = await database.db.insert(stadiums).values(values)

  await database.db.insert(stadiumNames).values({ name, position: 0, stadiumId: insertId })

  return insertId
}

beforeEach(async () => {
  await database.pool.query('DELETE FROM club_home_grounds')
  await database.pool.query('DELETE FROM stadium_names')
  await database.pool.query('DELETE FROM stadiums')
  await database.pool.query('DELETE FROM matches')
})

describe('what the stadiums and the clubs still miss (#1307)', () => {
  it('lists a stadium by what it lacks, and leaves a complete one out', async () => {
    const complete = await stadium('Compleet Stadion', {
      latitude: '53.1',
      longitude: '5.8',
      place: 'Heerenveen',
      postcode: '8441 RR',
      street: 'Thialfweg 1',
      wikidataId: 'Q1',
    })
    const bare = await stadium('Kaal Veld')
    const halfAddress = await stadium('Half Adres', {
      latitude: '53.1',
      longitude: '5.8',
      street: 'Veldweg 2',
      wikidataId: 'Q2',
    })

    const gaps = await readStadiumGaps(database.db)

    expect(gaps.withoutWikidata.map((gap) => gap.name)).toEqual(['Kaal Veld'])
    expect(gaps.withoutCoordinates.map((gap) => gap.name)).toEqual(['Kaal Veld'])
    expect(gaps.withoutAddress.map((gap) => gap.name)).toEqual(['Half Adres', 'Kaal Veld'])
    expect(gaps.withoutAddress[0]?.href).toBe(`/beheer/stadions/stadion/${halfAddress}`)
    expect(gaps.withoutWikidata.map((gap) => gap.href)).not.toContain(`/beheer/stadions/stadion/${complete}`)
    expect(bare).toBeGreaterThan(0)
  })

  it('lists a club that was at home against us and has no home ground, or one that began later', async () => {
    const [none, later, covered, onlyAway] = await withClubs(database.db, [
      {
        competition: 'Eredivisie',
        goalsAgainst: 0,
        goalsFor: 1,
        home: false,
        kickoffAt: new Date('2005-08-13T12:00:00Z'),
        matchDate: '2005-08-13',
        opponent: 'Zonder Veld',
        round: '1',
        season: '2005/06',
        status: 'played',
      },
      {
        competition: 'Eredivisie',
        goalsAgainst: 0,
        goalsFor: 1,
        home: false,
        kickoffAt: new Date('2005-08-13T12:00:00Z'),
        matchDate: '2005-08-20',
        opponent: 'Later Veld',
        round: '2',
        season: '2005/06',
        status: 'played',
      },
      {
        competition: 'Eredivisie',
        goalsAgainst: 0,
        goalsFor: 1,
        home: false,
        kickoffAt: new Date('2005-08-13T12:00:00Z'),
        matchDate: '2005-08-27',
        opponent: 'Gedekt Veld',
        round: '3',
        season: '2005/06',
        status: 'played',
      },
      {
        competition: 'Eredivisie',
        goalsAgainst: 0,
        goalsFor: 1,
        home: true,
        kickoffAt: new Date('2005-08-13T12:00:00Z'),
        matchDate: '2005-09-03',
        opponent: 'Alleen Uit',
        round: '4',
        season: '2005/06',
        status: 'played',
      },
    ])

    await database.db.insert(matches).values([none!, later!, covered!, onlyAway!])

    const [clubRows] = await Promise.all([database.db.select({ id: clubs.id, name: clubs.name }).from(clubs)])
    const idOf = (name: string) => clubRows.find((club) => club.name === name)!.id
    const ground = await stadium('Een Veld')

    await database.db.insert(clubHomeGrounds).values([
      { clubId: idOf('Later Veld'), position: 0, stadiumId: ground, startSeason: '2010/11' },
      { clubId: idOf('Gedekt Veld'), position: 0, stadiumId: ground },
      // sc Heerenveen's own ground has no club and is never listed.
      { clubId: null, position: 0, stadiumId: ground },
    ])

    const gaps = await readStadiumGaps(database.db)

    expect(gaps.clubsWithoutGround.map((gap) => gap.name)).toEqual(['Later Veld', 'Zonder Veld'])
    expect(gaps.clubsWithoutGround[0]?.href).toBe('/beheer/stadions/later-veld')
  })

  it('adds the four lists up', async () => {
    const gaps = await readStadiumGaps(database.db)

    expect(gaps.total).toBe(
      gaps.withoutWikidata.length +
        gaps.withoutCoordinates.length +
        gaps.withoutAddress.length +
        gaps.clubsWithoutGround.length,
    )
  })
})
