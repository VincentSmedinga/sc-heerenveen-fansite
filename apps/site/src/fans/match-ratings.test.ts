import type { TestDatabase } from '@fansite/db/test-database'

import { clubs, matchAppearances, matches, matchPlayerRatings, matchReports, players } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { loadOldMatchRatings, type RatedPlayer, uitblinkerOf } from './match-ratings'

let database: TestDatabase
let matchId: number

beforeAll(async () => {
  database = await createTestDatabase()
  await database.db.insert(clubs).values({ name: 'FC Twente', slug: 'fc-twente' })
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.db.delete(matchPlayerRatings)
  await database.db.delete(matchAppearances)
  await database.db.delete(matchReports)
  await database.db.delete(matches)
  await database.db.delete(players)

  const [club] = await database.db.select().from(clubs).where(eq(clubs.slug, 'fc-twente'))
  const [result] = await database.db.insert(matches).values({
    clubId: club?.id ?? 0,
    competition: 'Eredivisie',
    dataSource: 'oude-fansite',
    goalsAgainst: 1,
    goalsFor: 2,
    home: true,
    kickoffAt: new Date('2003-11-22T19:00:00Z'),
    matchDate: '2003-11-22',
    opponent: 'FC Twente',
    round: 'Speelronde 1',
    season: '2003/04',
    status: 'played',
  })

  matchId = result.insertId
})

async function addPlayer(name: string, options: { inLineUp: boolean; inSquad?: boolean }) {
  const [result] = await database.db
    .insert(players)
    .values({ inSquad: options.inSquad ?? true, name, searchTerm: name, season: '2003/04' })

  if (options.inLineUp) {
    await database.db
      .insert(matchReports)
      .values({ matchId, status: 'klaar' })
      .onDuplicateKeyUpdate({ set: { matchId } })
    await database.db
      .insert(matchAppearances)
      .values({ matchId, name, ours: true, playerId: result.insertId, shirtNumber: result.insertId, starter: true })
  }

  return result.insertId
}

const rate = (
  playerId: number,
  average: string,
  ratingCount: number,
  source: 'fans' | 'oude-fansite' = 'oude-fansite',
) => database.db.insert(matchPlayerRatings).values({ average, matchId, playerId, ratingCount, source, spread: '1.00' })

const rated = (name: string, average: number, count: number): RatedPlayer => ({
  appearanceId: null,
  average,
  count,
  name,
  playerId: count,
})

describe('the Uitblinker of a match', () => {
  it('is the player with the highest average and at least five ratings', () => {
    expect(uitblinkerOf([rated('A', 7.1, 20), rated('B', 8.4, 12), rated('C', 9.5, 4)])?.name).toBe('B')
  })

  it('goes to the player with fewer ratings when the average is equal', () => {
    expect(uitblinkerOf([rated('A', 7.5, 30), rated('B', 7.5, 12), rated('C', 7.5, 18)])?.name).toBe('B')
  })

  it('is nobody when no player has five ratings', () => {
    expect(uitblinkerOf([rated('A', 9, 4), rated('B', 8, 1)])).toBeUndefined()
  })

  it('counts a player on exactly five ratings', () => {
    expect(uitblinkerOf([rated('A', 6, 5)])?.name).toBe('A')
  })
})

describe('the ratings of an old match', () => {
  it('has none for a match without ratings', async () => {
    expect(await loadOldMatchRatings(database.db, matchId)).toBeUndefined()
  })

  it('lists the players in the order of the line-up, with the Uitblinker', async () => {
    const first = await addPlayer('Ruben Zwart', { inLineUp: true })
    const second = await addPlayer('Anton Beets', { inLineUp: true })

    await rate(second, '8.20', 31)
    await rate(first, '6.50', 40)

    const result = await loadOldMatchRatings(database.db, matchId)

    expect(result?.players.map((player) => [player.name, player.average, player.count])).toEqual([
      ['Ruben Zwart', 6.5, 40],
      ['Anton Beets', 8.2, 31],
    ])
    expect(result?.winner?.name).toBe('Anton Beets')
  })

  it('keeps a player who is no longer in the squad, after those in the line-up', async () => {
    const away = await addPlayer('Vera Oud', { inLineUp: false, inSquad: false })
    const here = await addPlayer('Ruben Zwart', { inLineUp: true })

    await rate(away, '7.00', 9)
    await rate(here, '6.00', 9)

    const result = await loadOldMatchRatings(database.db, matchId)

    expect(result?.players.map((player) => player.name)).toEqual(['Ruben Zwart', 'Vera Oud'])
  })

  it('has no winner, and keeps the players, when nobody has five ratings', async () => {
    await rate(await addPlayer('Ruben Zwart', { inLineUp: true }), '9.00', 3)

    const result = await loadOldMatchRatings(database.db, matchId)

    expect(result?.players).toHaveLength(1)
    expect(result?.winner).toBeUndefined()
  })

  it('leaves the ratings of the new game out', async () => {
    await rate(await addPlayer('Ruben Zwart', { inLineUp: true }), '9.00', 12, 'fans')

    expect(await loadOldMatchRatings(database.db, matchId)).toBeUndefined()
  })
})
