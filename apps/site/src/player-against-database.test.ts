import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { matchAppearances, matches, matchGoals, matchReports, persons } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { readAgainstMatches } from './player-against'

let database: TestDatabase
let personId: number

vi.mock('./database', () => ({ getDatabase: () => ({ db: database.db }) }))

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  for (const table of ['match_goals', 'match_appearances', 'match_reports', 'matches', 'persons']) {
    await database.pool.query(`DELETE FROM ${table}`)
  }

  const [person] = await database.db.insert(persons).values({ name: 'Jan de Vries' }).$returningId()

  personId = person?.id ?? 0
})

async function match(day: number, status: 'bezig' | 'klaar' = 'klaar') {
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
        season: '2026/27',
        status: 'played' as const,
      },
    ]),
  )

  await database.db.insert(matchReports).values({ matchId: insertId, status })

  return insertId
}

const appearance = async (matchId: number, values: Partial<typeof matchAppearances.$inferInsert> = {}) => {
  const [added] = await database.db
    .insert(matchAppearances)
    .values({ matchId, name: 'De Vries', ours: false, personId, shirtNumber: 9, starter: true, ...values })
    .$returningId()

  return added?.id ?? 0
}

describe('readAgainstMatches (#1545)', () => {
  it('has the minutes and the goals of the match, without own goals', async () => {
    const id = await match(1)
    const row = await appearance(id)

    await database.db.insert(matchGoals).values([
      { appearanceId: row, matchId: id, minute: 10, ours: false, player: 'De Vries' },
      { appearanceId: row, matchId: id, minute: 20, ours: false, player: 'De Vries' },
      { appearanceId: row, matchId: id, minute: 30, ours: true, ownGoal: true, player: 'De Vries' },
    ])

    expect(await readAgainstMatches(personId)).toMatchObject([
      { club: 'Oefenstad AZ', day: '2026-09-01', goals: 2, goalsAgainst: 1, goalsFor: 2, home: true, minutes: 90 },
    ])
  })

  it('leaves out a report that is not finished, and a row of ours', async () => {
    await appearance(await match(1, 'bezig'))
    await appearance(await match(3), { ours: true })

    expect(await readAgainstMatches(personId)).toEqual([])
  })

  it('leaves out a match in which he stayed on the bench, and has nothing for another person', async () => {
    const id = await match(1)

    await appearance(id, { starter: false })

    expect(await readAgainstMatches(personId)).toEqual([])

    await appearance(await match(2), { personId: null })

    expect(await readAgainstMatches(personId)).toEqual([])
  })
})
