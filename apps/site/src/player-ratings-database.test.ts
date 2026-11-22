import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { matches, matchPlayerRatings, oldSeasonRatings, persons, players } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { readPlayerRatings } from './player-ratings'

let database: TestDatabase

vi.mock('./database', () => ({ getDatabase: () => ({ db: database.db }) }))

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM old_season_ratings')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM persons')
})

async function match(season: string, day: number) {
  const [{ insertId }] = await database.db.insert(matches).values(
    await withClubs(database.db, [
      {
        competition: 'Eredivisie' as const,
        goalsAgainst: 1,
        goalsFor: 2,
        home: true,
        kickoffAt: new Date(`2026-09-${String(day).padStart(2, '0')}T12:30:00Z`),
        matchDate: `2026-09-${String(day).padStart(2, '0')}`,
        opponent: 'Oefenstad AZ',
        round: `Speelronde ${day}`,
        season,
        status: 'played' as const,
      },
    ]),
  )

  return insertId
}

async function person(name: string, seasons: string[]) {
  const [{ insertId: personId }] = await database.db.insert(persons).values({ name })
  const ids: Record<string, number> = {}

  for (const season of seasons) {
    const [{ insertId }] = await database.db
      .insert(players)
      .values({ name, personId, searchTerm: name.toLowerCase(), season, shirtNumber: 9 })

    ids[season] = insertId
  }

  return { ids, personId }
}

const rate = (matchId: number, playerId: number, average: string, ratingCount: number) =>
  database.db
    .insert(matchPlayerRatings)
    .values({ average, matchId, playerId, ratingCount, source: 'fans', spread: '1.00' })

describe('reading the ratings of a person', () => {
  it('works out seasons, last matches and the Uitblinker from the stored averages', async () => {
    const him = await person('Verzonnen Spits', ['2026/27'])
    const other = await person('Verzonnen Back', ['2026/27'])
    const first = await match('2026/27', 1)
    const second = await match('2026/27', 2)
    const third = await match('2026/27', 3)

    for (const [id, average] of [
      [first, '7.00'],
      [second, '8.00'],
      [third, '6.00'],
    ] as const) {
      await rate(id, him.ids['2026/27']!, average, 10)
    }
    // He is the Uitblinker where nobody has more, and not where another has a higher average.
    await rate(second, other.ids['2026/27']!, '8.50', 10)
    await rate(third, other.ids['2026/27']!, '9.50', 4)

    const ratings = await readPlayerRatings(him.personId)

    expect(ratings?.seasons).toEqual([{ average: '7,0', count: 30, matches: 3, season: '2026/27' }])
    expect(ratings?.last.map(({ average, winner }) => [average, winner])).toEqual([
      ['6,0', true],
      ['8,0', false],
      ['7,0', true],
    ])
  })

  it('gives the Uitblinker to the player with more ratings when the averages are equal', async () => {
    const him = await person('Verzonnen Linksbuiten', ['2026/27'])
    const other = await person('Verzonnen Rechtsback', ['2026/27'])
    const fewer = await match('2026/27', 11)
    const more = await match('2026/27', 12)
    // A season shows from three matches.
    const alone = await match('2026/27', 13)

    // Equal averages: he has fewer ratings in the first match and more in the second.
    await rate(fewer, him.ids['2026/27']!, '7.50', 10)
    await rate(fewer, other.ids['2026/27']!, '7.50', 20)
    await rate(more, him.ids['2026/27']!, '7.50', 20)
    await rate(more, other.ids['2026/27']!, '7.50', 10)
    await rate(alone, him.ids['2026/27']!, '7.00', 10)

    const ratings = await readPlayerRatings(him.personId)

    expect(ratings?.last.map(({ id, winner }) => [id, winner]).toSorted((a, b) => Number(a[0]) - Number(b[0]))).toEqual(
      [
        [fewer, false],
        [more, true],
        [alone, true],
      ],
    )
  })

  it('finds the season ratings of the old seasons and nothing for a player without any', async () => {
    const him = await person('Verzonnen Oud', ['2000/01'])
    const nobody = await person('Verzonnen Niemand', ['2026/27'])

    await database.db
      .insert(oldSeasonRatings)
      .values({ average: '6.80', name: 'Verzonnen Oud', playerId: him.ids['2000/01']!, season: '2000/01' })

    expect((await readPlayerRatings(him.personId))?.seasons).toEqual([
      { average: '6,8', count: undefined, matches: undefined, season: '2000/01' },
    ])
    expect(await readPlayerRatings(nobody.personId)).toBeUndefined()
  })
})
