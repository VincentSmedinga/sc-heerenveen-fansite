import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import {
  matchAppearances,
  matchCards,
  matches,
  matchGoals,
  matchReports,
  matchSubstitutions,
  persons,
  players,
  playerSeasonStats,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { playerSeasonsOf, readPlayerSeasonFacts } from './player-seasons'

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
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM persons')
})

/** A made-up played match, with a report that is `klaar` unless `report` says otherwise. */
async function match(season: string, day: number, goalsAgainst: number, report: 'bezig' | 'geen' | 'klaar' = 'klaar') {
  const [{ insertId }] = await database.db.insert(matches).values(
    await withClubs(database.db, [
      {
        competition: 'Eredivisie' as const,
        goalsAgainst,
        goalsFor: 1,
        home: true,
        kickoffAt: new Date(`2003-09-${String(day).padStart(2, '0')}T12:30:00Z`),
        matchDate: `2003-09-${String(day).padStart(2, '0')}`,
        opponent: 'Oefenstad AZ',
        round: `Speelronde ${day}`,
        season,
        status: 'played' as const,
      },
    ]),
  )

  if (report !== 'geen') {
    await database.db.insert(matchReports).values({ matchId: insertId, status: report })
  }

  return insertId
}

const appear = async (matchId: number, playerId: number, shirtNumber: number, starter = true) => {
  const [{ insertId }] = await database.db
    .insert(matchAppearances)
    .values({ matchId, name: `Speler ${shirtNumber}`, ours: true, playerId, shirtNumber, starter })

  return insertId
}

describe('reading the seasons of a person', () => {
  it('counts every goal once, whichever way it belongs to him, and no own goal or goal against us', async () => {
    const [{ insertId: personId }] = await database.db.insert(persons).values({ name: 'Verzonnen Keeper' })
    const [{ insertId: playerId }] = await database.db
      .insert(players)
      .values({ name: 'Verzonnen Keeper', personId, searchTerm: 'keeper', season: '2003/04', shirtNumber: 9 })
    const first = await match('2003/04', 1, 0)
    const second = await match('2003/04', 2, 2)
    const third = await match('2003/04', 3, 1, 'bezig')
    const fourth = await match('2003/04', 4, 1, 'geen')
    const inFirst = await appear(first, playerId, 9)
    const inSecond = await appear(second, playerId, 9)

    await appear(third, playerId, 9)

    const ours = { ours: true, player: 'Keeper' }

    await database.db.insert(matchGoals).values([
      // The three ways to him, and a goal that has all three: each counts once.
      { ...ours, matchId: first, personId },
      { ...ours, matchId: first, playerId },
      { ...ours, appearanceId: inFirst, matchId: first },
      { ...ours, appearanceId: inSecond, matchId: second, personId, playerId },
      // An own goal, a goal against us and a goal of somebody else do not count.
      { ...ours, matchId: second, ownGoal: true, personId },
      { matchId: second, ours: false, personId, player: 'Tegenstander' },
      { ...ours, matchId: fourth, player: 'Ander' },
      // A goal of somebody else that he gave the assist for.
      { ...ours, assistAppearanceId: inSecond, matchId: second, player: 'Ander' },
    ])
    await database.db
      .insert(matchCards)
      .values({ appearanceId: inFirst, kind: 'geel-rood', matchId: first, minute: 80, ours: true })
    await database.db
      .insert(playerSeasonStats)
      .values({ appearances: 30, assists: 4, competition: 'Eredivisie', goals: 6, playerId, season: '2003/04' })

    const facts = await readPlayerSeasonFacts(personId)

    expect(facts.players).toEqual([{ season: '2003/04', shirtNumber: 9 }])
    expect(facts.matchCounts).toEqual([{ played: 4, reported: 2, season: '2003/04' }])
    // The appearance in the report that is bezig is left out.
    expect(facts.appearances).toEqual([
      { goalsAgainst: 0, red: true, season: '2003/04', starter: true, substituted: false, yellow: true },
      { goalsAgainst: 2, red: false, season: '2003/04', starter: true, substituted: false, yellow: false },
    ])
    expect(facts.goals).toHaveLength(4)
    expect(facts.assists).toHaveLength(1)
    expect(facts.tables).toEqual([{ appearances: 30, assists: 4, season: '2003/04' }])
    expect(playerSeasonsOf(facts)[0]).toMatchObject({ goals: 4, source: 'wikipedia' })
  })

  it('has a substitution as a match he did not play to the end, and nothing for a person without a row', async () => {
    const [{ insertId: personId }] = await database.db.insert(persons).values({ name: 'Verzonnen Veld' })
    const [{ insertId: playerId }] = await database.db
      .insert(players)
      .values({ name: 'Verzonnen Veld', personId, searchTerm: 'veld', season: '2003/04' })
    const first = await match('2003/04', 1, 0)
    const out = await appear(first, playerId, 4)
    const [{ insertId: other }] = await database.db
      .insert(matchAppearances)
      .values({ matchId: first, name: 'Invaller', ours: true, shirtNumber: 14, starter: false })

    await database.db
      .insert(matchSubstitutions)
      .values({ appearanceInId: other, appearanceOutId: out, matchId: first, minute: 60, ours: true })

    expect((await readPlayerSeasonFacts(personId)).appearances).toEqual([
      { goalsAgainst: 0, red: false, season: '2003/04', starter: true, substituted: true, yellow: false },
    ])
    expect(await readPlayerSeasonFacts(personId + 1000)).toEqual({
      appearances: [],
      assists: [],
      goals: [],
      matchCounts: [],
      players: [],
      tables: [],
    })
  })
})
