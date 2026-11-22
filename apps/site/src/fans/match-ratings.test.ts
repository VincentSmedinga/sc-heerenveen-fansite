import type { TestDatabase } from '@fansite/db/test-database'

import {
  clubs,
  coachRatings,
  matchAppearances,
  matchCoachRatings,
  matches,
  matchPlayerRatings,
  matchReports,
  playerRatings,
  players,
  staff,
  supporters,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  loadLatestResult,
  loadMatchRatings,
  loadOldMatchRatings,
  loadRunningCoachRating,
  loadRunningRatings,
  loadSeasonWinners,
  orderRatings,
  type RatedPlayer,
  resultLine,
  supportersIn,
  uitblinkerOf,
} from './match-ratings'

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
  await database.db.delete(playerRatings)
  await database.db.delete(coachRatings)
  await database.db.delete(matchCoachRatings)
  await database.db.delete(staff)
  await database.db.delete(supporters)
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

  it('goes to the player with more ratings when the average is equal', () => {
    expect(uitblinkerOf([rated('A', 7.5, 12), rated('B', 7.5, 30), rated('C', 7.5, 18)])?.name).toBe('B')
  })

  it('goes to the first of the line-up when the average and the count are equal', () => {
    expect(uitblinkerOf([rated('A', 7.5, 12), rated('B', 7.5, 12)])?.name).toBe('A')
  })

  it('is nobody when no player has five ratings', () => {
    expect(uitblinkerOf([rated('A', 9, 4), rated('B', 8, 1)])).toBeUndefined()
  })

  it('counts a player on exactly five ratings', () => {
    expect(uitblinkerOf([rated('A', 6, 5)])?.name).toBe('A')
  })
})

describe('the order of the table of a match', () => {
  const names = (list: readonly RatedPlayer[]) => orderRatings(list).map((player) => player.name)

  it('puts the highest average first, whatever the order of the line-up', () => {
    expect(names([rated('A', 6.4, 20), rated('B', 8.2, 20), rated('C', 7.1, 20)])).toEqual(['B', 'C', 'A'])
  })

  it('puts the player with more ratings first when the average is equal, and then keeps the line-up', () => {
    expect(names([rated('A', 7, 12), rated('B', 7, 30), rated('C', 7, 12), rated('D', 7, 30)])).toEqual([
      'B',
      'D',
      'A',
      'C',
    ])
  })

  it('compares the averages to two decimals', () => {
    expect(names([rated('A', 7.001, 12), rated('B', 7.004, 30)])).toEqual(['B', 'A'])
  })

  it('puts the players with fewer than five ratings under the others, in the order of the line-up', () => {
    expect(names([rated('A', 9.5, 4), rated('B', 6, 20), rated('C', 9, 1), rated('D', 7, 20)])).toEqual([
      'D',
      'B',
      'A',
      'C',
    ])
  })

  it('has the Uitblinker as its first player', () => {
    const list = [rated('A', 6, 40), rated('B', 8, 9), rated('C', 8, 25)]

    expect(orderRatings(list)[0]).toBe(uitblinkerOf(list))
  })
})

describe('the ratings of an old match', () => {
  it('has none for a match without ratings', async () => {
    expect(await loadOldMatchRatings(database.db, matchId)).toBeUndefined()
  })

  it('lists the players by average, the highest first, with the Uitblinker', async () => {
    const first = await addPlayer('Ruben Zwart', { inLineUp: true })
    const second = await addPlayer('Anton Beets', { inLineUp: true })

    await rate(second, '8.20', 31)
    await rate(first, '6.50', 40)

    const result = await loadOldMatchRatings(database.db, matchId)

    expect(result?.players.map((player) => [player.name, player.average, player.count])).toEqual([
      ['Anton Beets', 8.2, 31],
      ['Ruben Zwart', 6.5, 40],
    ])
    expect(result?.winner?.name).toBe('Anton Beets')
    expect(result?.players[0]).toBe(result?.winner)
  })

  it('puts equal averages in the order of the count and then of the line-up, and thin players last', async () => {
    const first = await addPlayer('Ruben Zwart', { inLineUp: true })
    const second = await addPlayer('Anton Beets', { inLineUp: true })
    const third = await addPlayer('Mark Visser', { inLineUp: true })
    const fourth = await addPlayer('Piet Dijk', { inLineUp: true })

    await rate(first, '7.00', 12)
    await rate(second, '7.00', 12)
    await rate(third, '7.00', 30)
    await rate(fourth, '9.50', 3)

    const result = await loadOldMatchRatings(database.db, matchId)

    expect(result?.players.map((player) => player.name)).toEqual([
      'Mark Visser',
      'Ruben Zwart',
      'Anton Beets',
      'Piet Dijk',
    ])
    expect(result?.winner?.name).toBe('Mark Visser')
  })

  it('keeps a player who is no longer in the squad after those in the line-up when they are equal', async () => {
    const away = await addPlayer('Vera Oud', { inLineUp: false, inSquad: false })
    const here = await addPlayer('Ruben Zwart', { inLineUp: true })

    await rate(away, '7.00', 9)
    await rate(here, '7.00', 9)

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

describe('the ratings of supporters', () => {
  it('has none for a match whose window did not close', async () => {
    expect(await loadMatchRatings(database.db, matchId, 'fans')).toBeUndefined()
  })

  it('lists the averages of the source fans by average, with the count of supporters', async () => {
    const first = await addPlayer('Ruben Zwart', { inLineUp: true })
    const second = await addPlayer('Anton Beets', { inLineUp: true })

    await rate(first, '6.50', 31, 'fans')
    await rate(second, '8.20', 29, 'fans')
    await rate(second, '9.90', 40)

    const result = await loadMatchRatings(database.db, matchId, 'fans')

    expect(result?.players.map((player) => [player.name, player.average, player.count])).toEqual([
      ['Anton Beets', 8.2, 29],
      ['Ruben Zwart', 6.5, 31],
    ])
    expect(result?.supporters).toBe(31)
    expect(result?.winner?.name).toBe('Anton Beets')
  })

  it('holds averages and counts only, and nothing about a person who rated', async () => {
    await rate(await addPlayer('Ruben Zwart', { inLineUp: true }), '6.50', 31, 'fans')

    const result = await loadMatchRatings(database.db, matchId, 'fans')

    expect(Object.keys(result?.players[0] ?? {}).toSorted()).toEqual([
      'appearanceId',
      'average',
      'count',
      'name',
      'playerId',
    ])
  })
})

describe('the ratings that come in while a window is open', () => {
  async function give(supporterId: number, appearanceId: number, grade: number) {
    await database.db.insert(playerRatings).values({ appearanceId, grade, supporterId })
  }

  let accounts = 0

  async function account(disabled = false) {
    accounts++

    const [row] = await database.db
      .insert(supporters)
      .values({
        createdAt: new Date('2003-01-01T00:00:00Z'),
        disabledAt: disabled ? new Date() : null,
        email: `fan${accounts}@example.test`,
        screenName: `Fan${accounts}`,
        screenNameKey: `fan${accounts}`,
      })
      .$returningId()

    return row!.id
  }

  it('works out an average and a count for each player, and counts the supporters', async () => {
    await addPlayer('Ruben Zwart', { inLineUp: true })

    const [appearance] = await database.db.select().from(matchAppearances).where(eq(matchAppearances.matchId, matchId))
    const one = await account()
    const two = await account()

    await give(one, appearance!.id, 6)
    await give(two, appearance!.id, 9)

    const running = await loadRunningRatings(database.db, matchId)

    expect(running).toEqual([
      { appearanceId: appearance!.id, average: 7.5, count: 2, name: 'Ruben Zwart', playerId: appearance!.playerId },
    ])
    expect(supportersIn(running)).toBe(2)
  })

  it('leaves out the grades of a blocked account, and counts those of a closed account', async () => {
    await addPlayer('Ruben Zwart', { inLineUp: true })

    const [appearance] = await database.db.select().from(matchAppearances).where(eq(matchAppearances.matchId, matchId))

    await give(await account(true), appearance!.id, 1)
    await database.db.insert(playerRatings).values({ appearanceId: appearance!.id, grade: 8, supporterId: null })

    const running = await loadRunningRatings(database.db, matchId)

    expect(running.map((player) => [player.average, player.count])).toEqual([[8, 1]])
  })

  it('has nothing for a match nobody rated', async () => {
    expect(await loadRunningRatings(database.db, matchId)).toEqual([])
    expect(supportersIn([])).toBe(0)
  })
})

describe('the Uitblinkers of a season', () => {
  async function newMatch(date: string, opponent: string, goals: [number, number], home = true) {
    const [club] = await database.db.select().from(clubs).where(eq(clubs.slug, 'fc-twente'))
    const [result] = await database.db.insert(matches).values({
      clubId: club?.id ?? 0,
      competition: 'Eredivisie',
      goalsAgainst: goals[1],
      goalsFor: goals[0],
      home,
      kickoffAt: new Date(`${date}T19:00:00Z`),
      matchDate: date,
      opponent,
      round: `Speelronde ${date}`,
      season: '2026/27',
      status: 'played',
    })

    return result.insertId
  }

  async function ratePlayer(forMatch: number, name: string, average: string, count: number) {
    const [player] = await database.db
      .insert(players)
      .values({ inSquad: true, name, searchTerm: name, season: '2026/27' })
      .$returningId()

    await database.db
      .insert(matchPlayerRatings)
      .values({ average, matchId: forMatch, playerId: player!.id, ratingCount: count, source: 'fans', spread: '1.00' })
  }

  it('has one for each match, the newest first, and none for a match without five ratings', async () => {
    const older = await newMatch('2026-11-01', 'NEC', [2, 0])
    const newer = await newMatch('2026-11-21', 'Sparta Rotterdam', [3, 1])
    const thin = await newMatch('2026-11-28', 'FC Twente', [0, 0])

    await ratePlayer(older, 'Dirk Proper', '7.10', 20)
    await ratePlayer(newer, 'Dylan Vente', '7.80', 31)
    await ratePlayer(newer, 'Andries Noppert', '7.80', 25)
    await ratePlayer(thin, 'Lars Jansen', '9.00', 3)

    const winners = await loadSeasonWinners(database.db, '2026/27')

    expect(winners.map((winner) => [winner.name, winner.average])).toEqual([
      ['Dylan Vente', 7.8],
      ['Dirk Proper', 7.1],
    ])
  })

  it('has none for a season without ratings of supporters', async () => {
    expect(await loadSeasonWinners(database.db, '2026/27')).toEqual([])
  })

  it('finds the newest match with a result, with its ratings', async () => {
    const older = await newMatch('2026-11-01', 'NEC', [2, 0])
    const newer = await newMatch('2026-11-21', 'Sparta Rotterdam', [3, 1])

    await ratePlayer(older, 'Dirk Proper', '7.10', 20)
    await ratePlayer(newer, 'Dylan Vente', '7.80', 31)

    const latest = await loadLatestResult(database.db)

    expect(latest?.match.id).toBe(newer)
    expect(latest?.ratings.winner?.name).toBe('Dylan Vente')
    expect(latest?.ratings.supporters).toBe(31)
  })

  it('has no latest result while no window closed', async () => {
    expect(await loadLatestResult(database.db)).toBeUndefined()
  })
})

describe('the line under a winner', () => {
  it('puts the home club first: at home the goals of sc Heerenveen first, away last', () => {
    expect(resultLine({ goalsAgainst: 1, goalsFor: 3, home: true, opponent: 'Sparta Rotterdam' })).toBe(
      'Thuis tegen Sparta Rotterdam, 3–1',
    )
    expect(resultLine({ goalsAgainst: 2, goalsFor: 2, home: false, opponent: 'Ajax' })).toBe('Uit tegen Ajax, 2–2')
    expect(resultLine({ goalsAgainst: 3, goalsFor: 1, home: false, opponent: 'Ajax' })).toBe('Uit tegen Ajax, 3–1')
  })

  it('leaves the score out when the match has none', () => {
    expect(resultLine({ goalsAgainst: null, goalsFor: null, home: true, opponent: 'NEC' })).toBe('Thuis tegen NEC')
  })
})

describe('the head coach in the ratings of a match (issue 1479)', () => {
  const addCoach = async () => {
    const [result] = await database.db
      .insert(staff)
      .values({ name: 'Robin Veldman', role: 'coach', startDate: '2020-01-01', startPrecision: 'day' })

    return result.insertId
  }

  it('comes with the averages of the same source, and is not the Uitblinker', async () => {
    const staffId = await addCoach()
    const keeper = await addPlayer('Zeno Keeper', { inLineUp: true })

    await rate(keeper, '6.00', 8)
    await database.db.insert(matchCoachRatings).values([
      { average: '9.50', matchId, ratingCount: 30, source: 'oude-fansite', spread: '0.50', staffId },
      { average: '4.00', matchId, ratingCount: 6, source: 'fans', spread: '1.00', staffId },
    ])

    expect((await loadOldMatchRatings(database.db, matchId))?.coach).toEqual({
      average: 9.5,
      count: 30,
      name: 'Robin Veldman',
    })
    expect((await loadOldMatchRatings(database.db, matchId))?.winner?.name).toBe('Zeno Keeper')
    expect(await loadMatchRatings(database.db, matchId, 'fans')).toBeUndefined()
  })

  it('is left out when the match has no ratings for the coach', async () => {
    await addCoach()
    await rate(await addPlayer('Zeno Keeper', { inLineUp: true }), '6.00', 8)

    expect((await loadOldMatchRatings(database.db, matchId))?.coach).toBeUndefined()
  })

  it('has a running average that leaves out blocked and marked grades', async () => {
    const staffId = await addCoach()
    const supporter = (name: string, disabledAt: Date | null) =>
      database.db
        .insert(supporters)
        .values({
          createdAt: new Date('2026-01-01T10:00:00Z'),
          disabledAt,
          email: `${name}@example.test`,
          screenName: name,
          screenNameKey: name.toLowerCase(),
        })
        .then(([result]) => result.insertId)
    const fine = await supporter('Netjes', null)
    const blocked = await supporter('Rotzak99', new Date())

    await database.db.insert(coachRatings).values([
      { grade: 8, matchId, staffId, supporterId: fine },
      { grade: 2, matchId, staffId, supporterId: blocked },
      { blocked: true, grade: 1, matchId, staffId, supporterId: null },
      { grade: 6, matchId, staffId, supporterId: null },
    ])

    expect(await loadRunningCoachRating(database.db, matchId)).toEqual({ average: 7, count: 2, name: 'Robin Veldman' })
    await database.db.delete(coachRatings)
    expect(await loadRunningCoachRating(database.db, matchId)).toBeUndefined()
  })
})
