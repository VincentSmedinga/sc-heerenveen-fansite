import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { NewMatch } from './schema.ts'
import type { TestDatabase } from './test-database.ts'

import { withClubs } from './clubs.ts'
import { matches, matchGoals, matchReports, players, squadCompleteness, standings } from './schema.ts'
import { readSeasonCoverage, seasonsBetween } from './season-coverage.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

const now = new Date('1992-10-01T12:00:00Z')

const base: Omit<NewMatch, 'clubId'> = {
  competition: 'Eredivisie',
  dataSource: 'oude-fansite',
  goalsAgainst: 1,
  goalsFor: 2,
  home: true,
  matchDate: '1990-09-01',
  opponent: 'Testdorp FC',
  round: '1',
  season: '1990/91',
  status: 'played',
}

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM standings')
  await database.pool.query('DELETE FROM squad_completeness')
})

describe('seasonsBetween', () => {
  it('counts the seasons across the turn of the century', () => {
    expect(seasonsBetween('1998/99', '2000/01')).toEqual(['1998/99', '1999/00', '2000/01'])
  })
})

describe('the coverage per season', () => {
  it('lists every season since 1990/91, also one without matches, with zeros', async () => {
    const [first, second] = await withClubs(database.db, [
      { ...base, attendance: 12_000, referee: 'Test Scheids' },
      { ...base, goalsAgainst: 0, goalsFor: 1, matchDate: '1990-09-08', round: '2' },
    ])
    const [{ insertId }] = await database.db.insert(matches).values(first!)
    const [{ insertId: secondId }] = await database.db.insert(matches).values(second!)

    await database.db.insert(matchGoals).values([
      { matchId: insertId, ours: true, player: 'Onbekend' },
      { matchId: insertId, ours: false, player: 'Tegen' },
    ])
    await database.db.insert(matchReports).values({ matchId: insertId, status: 'klaar' })
    await database.db.insert(players).values({ name: 'A Speler', searchTerm: 'Speler', season: '1990/91' })
    await database.db.insert(squadCompleteness).values({
      bestSource: 'verslag',
      calculatedAt: new Date('2026-01-01T00:00:00Z'),
      checks: [],
      level: 'deels',
      playerCount: 1,
      probability: 50,
      season: '1990/91',
    })
    await database.db.insert(standings).values({
      club: 'sc Heerenveen',
      drawn: 0,
      goalDifference: 0,
      goalsAgainst: 0,
      goalsFor: 0,
      lost: 0,
      played: 0,
      points: 0,
      position: 1,
      season: '1990/91',
      validOn: '1991-06-01',
      won: 0,
    })

    const coverage = await readSeasonCoverage(database.db, now)

    expect(coverage.map((row) => row.season)).toEqual(['1990/91', '1991/92', '1992/93'])
    expect(coverage[0]).toEqual({
      goalsWithoutPlayer: 1,
      hasStanding: true,
      matchesBySource: { 'oude-fansite': 2, wikipedia: 0 },
      matchesTotal: 2,
      played: 2,
      playedWithoutGoalList: 1,
      playerCount: 1,
      reports: 1,
      reportsDone: 1,
      season: '1990/91',
      squad: { bestSource: 'verslag', level: 'deels' },
      withAttendance: 1,
      withReferee: 1,
    })
    expect(secondId).toBeGreaterThan(insertId)
    expect(coverage[1]).toEqual({
      goalsWithoutPlayer: 0,
      hasStanding: false,
      matchesBySource: { 'oude-fansite': 0, wikipedia: 0 },
      matchesTotal: 0,
      played: 0,
      playedWithoutGoalList: 0,
      playerCount: 0,
      reports: 0,
      reportsDone: 0,
      season: '1991/92',
      squad: null,
      withAttendance: 0,
      withReferee: 0,
    })
  })
})
