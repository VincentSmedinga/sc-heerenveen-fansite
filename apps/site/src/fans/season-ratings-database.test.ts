import type { TestDatabase } from '@fansite/db/test-database'

import { clubs, matches, matchPlayerRatings, oldSeasonRatings, players } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { rankSeason, readRatingFigures, yearWinners } from './season-ratings'

let database: TestDatabase
let clubId: number

beforeAll(async () => {
  database = await createTestDatabase()
  const [club] = await database.db.insert(clubs).values({ name: 'FC Twente', slug: 'fc-twente' })

  clubId = club.insertId
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.db.delete(oldSeasonRatings)
  await database.db.delete(matchPlayerRatings)
  await database.db.delete(matches)
  await database.db.delete(players)
})

let day = 1

async function addMatch(season: string, status: 'played' | 'scheduled' = 'played') {
  const matchDate = `${season.slice(0, 4)}-09-${String(day++).padStart(2, '0')}`
  const [result] = await database.db.insert(matches).values({
    clubId,
    competition: 'Eredivisie',
    dataSource: 'oude-fansite',
    goalsAgainst: status === 'played' ? 1 : null,
    goalsFor: status === 'played' ? 2 : null,
    home: true,
    matchDate,
    opponent: 'FC Twente',
    round: `Speelronde ${day}`,
    season,
    status,
  })

  return result.insertId
}

async function addPlayer(name: string) {
  const [result] = await database.db.insert(players).values({ searchTerm: name, season: '2003/04', sourceName: name })

  return result.insertId
}

const rate = (
  matchId: number,
  playerId: number,
  average: string,
  ratingCount: number,
  source: 'fans' | 'oude-fansite' = 'fans',
) => database.db.insert(matchPlayerRatings).values({ average, matchId, playerId, ratingCount, source, spread: '1.00' })

describe('the figures of the season ratings', () => {
  it('adds the averages of a player in a season up, weighted by the ratings, and counts the matches with five ratings', async () => {
    const player = await addPlayer('Speler A')

    // 100 ratings of 6,00, 100 of 8,00 and 4 of 10,00: four ratings do not count.
    await rate(await addMatch('2003/04'), player, '6.00', 100, 'oude-fansite')
    await rate(await addMatch('2003/04'), player, '8.00', 100, 'oude-fansite')
    await rate(await addMatch('2003/04'), player, '10.00', 4, 'oude-fansite')
    const found = await readRatingFigures(database.db, new Date('2026-11-22T12:00:00Z'))

    expect(found.figures).toHaveLength(1)
    expect(found.figures[0]).toMatchObject({
      counting: 2,
      name: 'Speler A',
      old: true,
      ratings: 204,
      season: '2003/04',
    })
    expect(found.figures[0]?.total).toBeCloseTo(6 * 100 + 8 * 100 + 40, 5)
  })

  it('ranks a season with the players that have three matches that count', async () => {
    const [one, two] = [await addPlayer('Speler A'), await addPlayer('Speler B')]

    for (let match = 0; match < 3; match++) {
      const id = await addMatch('2026/27')

      await rate(id, one, '7.00', 20)
      await rate(id, two, '7.50', match === 0 ? 4 : 20)
    }

    const rows = rankSeason(await readRatingFigures(database.db, new Date('2026-11-22T12:00:00Z')), '2026/27')

    expect(rows.map((row) => [row.name, row.matches])).toEqual([['Speler A', 3]])
  })

  it('reads the season ratings of the old fansite, and a past season of them has its winner', async () => {
    const player = await addPlayer('Speler A')

    await database.db
      .insert(oldSeasonRatings)
      .values({ average: '6.80', name: 'Speler A', playerId: player, season: '1999/00' })
    const found = await readRatingFigures(database.db, new Date('2026-11-22T12:00:00Z'))

    expect(found.oldRatings).toEqual([{ average: 6.8, name: 'Speler A', playerId: player, season: '1999/00' }])
    expect(
      yearWinners(found, new Date('2026-11-22T12:00:00Z')).map((row) => [
        row.season,
        row.players.map((player) => player.name),
        row.average,
      ]),
    ).toEqual([
      ['2026/27', [], undefined],
      ['1999/00', ['Speler A'], 6.8],
    ])
  })

  it('names the winner of a season that is over from the ratings of its matches', async () => {
    const [one, two] = [await addPlayer('Speler A'), await addPlayer('Speler B')]

    for (let match = 0; match < 3; match++) {
      const id = await addMatch('2004/05')

      await rate(id, one, '6.50', 20, 'oude-fansite')
      await rate(id, two, '7.25', 20, 'oude-fansite')
    }

    const now = new Date('2026-11-22T12:00:00Z')
    const found = await readRatingFigures(database.db, now)

    expect(yearWinners(found, now).map((row) => [row.season, row.players.map((player) => player.name)])).toEqual([
      ['2026/27', []],
      ['2004/05', ['Speler B']],
    ])
  })

  it('knows which seasons are over from the matches', async () => {
    await addMatch('2025/26')
    await addMatch('2026/27')
    await addMatch('2026/27', 'scheduled')
    const found = await readRatingFigures(database.db, new Date('2026-11-22T12:00:00Z'))

    expect([...found.overSeasons]).toEqual(['2025/26'])
  })
})
