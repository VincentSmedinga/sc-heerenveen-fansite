import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { NewMatch } from './schema.ts'
import type { TestDatabase } from './test-database.ts'

import { withClubs } from './clubs.ts'
import { matchChanges, matches, matchGoals } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

/** A match against Testdorp FC, with its club. */
async function clubbed(values: Omit<NewMatch, 'clubId'>): Promise<NewMatch> {
  return (await withClubs(database.db, [values]))[0]!
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
})

const cupMatch: Omit<NewMatch, 'clubId'> = {
  competition: 'KNVB Beker',
  goalsAgainst: 1,
  goalsFor: 1,
  home: true,
  kickoffAt: new Date('2026-10-28T18:45:00Z'),
  matchDate: '2026-10-28',
  opponent: 'Testdorp FC',
  round: 'Tweede ronde',
  season: '2026/27',
  status: 'played',
}

describe('the extra time and the shoot-out of a match', () => {
  it('has no extra time and no shoot-out unless it is said', async () => {
    await database.db.insert(matches).values(await clubbed(cupMatch))

    const [row] = await database.db.select().from(matches)

    expect(row).toMatchObject({ extraTime: false, penaltiesAgainst: null, penaltiesFor: null })
  })

  it('keeps a win after extra time, and a shoot-out after a level score, from our side', async () => {
    await database.db.insert(matches).values(await clubbed({ ...cupMatch, extraTime: true, goalsFor: 2 }))
    await database.db
      .insert(matches)
      .values(
        await clubbed({ ...cupMatch, extraTime: true, penaltiesAgainst: 3, penaltiesFor: 4, round: 'Derde ronde' }),
      )

    const rows = await database.db.select().from(matches)

    expect(rows.map((row) => [row.extraTime, row.penaltiesFor, row.penaltiesAgainst])).toEqual([
      [true, null, null],
      [true, 4, 3],
    ])
  })

  it('keeps extra time and a shoot-out in the play-offs for the Conference League, like in the cup', async () => {
    await database.db.insert(matches).values(
      await clubbed({
        ...cupMatch,
        competition: 'Play-offs Conference League',
        extraTime: true,
        penaltiesAgainst: 3,
        penaltiesFor: 4,
        round: 'Finale',
      }),
    )

    const [row] = await database.db.select().from(matches)

    expect(row).toMatchObject({
      competition: 'Play-offs Conference League',
      extraTime: true,
      penaltiesAgainst: 3,
      penaltiesFor: 4,
    })
  })

  it.each([
    [
      'extra time in the league',
      'matches_extra_time_only_in_played_knockout',
      { competition: 'Eredivisie', extraTime: true, round: 'Speelronde 1' },
    ],
    [
      'extra time before the match is played',
      'matches_extra_time_only_in_played_knockout',
      { extraTime: true, goalsAgainst: null, goalsFor: null, status: 'scheduled' },
    ],
    [
      'a shoot-out without extra time',
      'matches_penalties_after_level_extra_time',
      { penaltiesAgainst: 3, penaltiesFor: 4 },
    ],
    [
      'a shoot-out after a score that is not level',
      'matches_penalties_after_level_extra_time',
      { extraTime: true, goalsFor: 2, penaltiesAgainst: 3, penaltiesFor: 4 },
    ],
    ['half a shoot-out', 'matches_penalties_in_a_pair', { extraTime: true, penaltiesFor: 4 }],
  ] satisfies [string, string, Partial<NewMatch>][])('refuses %s', async (_name, constraint, change) => {
    const failure = await database.db
      .insert(matches)
      .values(await clubbed({ ...cupMatch, ...change }))
      .then(
        () => undefined,
        (error: unknown) => error,
      )

    // Drizzle wraps the error of the database, which names the constraint.
    expect(String((failure as Error | undefined)?.cause)).toContain(constraint)
  })
})

describe('the goals of a match', () => {
  async function insertMatch() {
    const [{ insertId }] = await database.db.insert(matches).values(await clubbed(cupMatch))

    return insertId
  }

  it('keeps a goal with its minute, its added time and its scorer, and a goal in regular time has no added time', async () => {
    const matchId = await insertMatch()

    await database.db.insert(matchGoals).values([
      { matchId, minute: 34, ours: true, player: 'Trenskow' },
      { matchId, minute: 45, ours: false, penalty: true, player: 'Vente', stoppageMinutes: 1 },
    ])

    const rows = await database.db.select().from(matchGoals).orderBy(matchGoals.id)

    expect(rows).toMatchObject([
      { matchId, minute: 34, ours: true, ownGoal: false, penalty: false, player: 'Trenskow', stoppageMinutes: null },
      { matchId, minute: 45, ours: false, ownGoal: false, penalty: true, player: 'Vente', stoppageMinutes: 1 },
    ])
  })

  it('goes with its match', async () => {
    const matchId = await insertMatch()

    await database.db.insert(matchGoals).values({ matchId, minute: 34, ours: true, player: 'Trenskow' })
    await database.db.delete(matches)

    expect(await database.db.select().from(matchGoals)).toEqual([])
  })

  it('has no goal without a match', async () => {
    const failure = await database.db
      .insert(matchGoals)
      .values({ matchId: 999_999, minute: 34, ours: true, player: 'Trenskow' })
      .then(
        () => undefined,
        (error: unknown) => error,
      )

    expect(String((failure as Error | undefined)?.cause)).toContain('match_goals_match_id_matches_id_fk')
  })

  it('refuses a goal that is both an own goal and a penalty', async () => {
    const matchId = await insertMatch()
    const failure = await database.db
      .insert(matchGoals)
      .values({ matchId, minute: 34, ours: true, ownGoal: true, penalty: true, player: 'Trenskow' })
      .then(
        () => undefined,
        (error: unknown) => error,
      )

    expect(String((failure as Error | undefined)?.cause)).toContain('match_goals_not_own_goal_and_penalty')
  })
})

describe('the changes of a match that wait', () => {
  const change = {
    changed: 'result',
    class: 'suspicious',
    competition: 'KNVB Beker',
    firstSeenAt: new Date('2026-10-28T20:00:00Z'),
    lastSeenAt: new Date('2026-10-28T20:00:00Z'),
    newValue: 'home Testdorp FC: 2-1',
    oldValue: 'home Testdorp FC: 1-1',
    reason: 'the result changed after 4 days',
    round: 'Tweede ronde',
    season: '2026/27',
    status: 'pending',
  } as const

  beforeEach(async () => {
    await database.pool.query('DELETE FROM match_changes')
  })

  it('starts as seen once, without a decision, and keeps what it proposes as text', async () => {
    await database.db.insert(matchChanges).values({ ...change, proposal: '{"goals":[]}' })

    const [row] = await database.db.select().from(matchChanges)

    expect(row).toMatchObject({ decidedAt: null, proposal: '{"goals":[]}', resolution: null, timesSeen: 1 })
  })

  it('stays when its match goes, and no longer points at it', async () => {
    const [{ insertId }] = await database.db.insert(matches).values(await clubbed(cupMatch))

    await database.db.insert(matchChanges).values({ ...change, matchId: insertId })
    await database.db.delete(matches).where(eq(matches.id, insertId))

    expect(await database.db.select().from(matchChanges)).toMatchObject([{ matchId: null, round: 'Tweede ronde' }])
  })

  it('refuses a change of a match that does not exist', async () => {
    const failure = await database.db
      .insert(matchChanges)
      .values({ ...change, matchId: 987654 })
      .then(
        () => undefined,
        (error: unknown) => error,
      )

    expect(String((failure as Error | undefined)?.cause)).toContain('match_changes_match_id_matches_id_fk')
  })
})
