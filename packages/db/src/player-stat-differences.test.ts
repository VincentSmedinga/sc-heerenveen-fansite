import { asc } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { withClubs } from './clubs.ts'
import {
  comparePlayerGoals,
  countWaitingStatDifferences,
  decidePlayerStatDifference,
  findMatchGoalDifferences,
  keepPlayerStatDifferences,
  listWaitingStatDifferences,
} from './player-stat-differences.ts'
import {
  adminUsers,
  auditLog,
  matches,
  matchGoals,
  players,
  playerSeasonStats,
  playerStatDifferences,
} from './schema.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase
let adminId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM admin_users')
  await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('redactie@example.org', 'beheerder')")
  adminId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
})

const season = '2026/27'
const first = new Date('2026-11-09T10:00:00Z')
const later = new Date('2026-11-10T10:00:00Z')

async function player(name: string, shirtNumber: number) {
  const [inserted] = await database.db
    .insert(players)
    .values({ name, searchTerm: name, season, shirtNumber, source: 'selectie' })
    .$returningId()

  return inserted!.id
}

/** The row of a player in the squad table, with this many goals in the league. */
const table = (playerId: number, goals: number) =>
  database.db
    .insert(playerSeasonStats)
    .values({ appearances: 5, assists: 0, competition: 'Eredivisie', goals, playerId, season })

/** A played league match with this many goals of the player. */
async function match(playerId: number, goals: number) {
  const [row] = await withClubs(database.db, [
    {
      competition: 'Eredivisie' as const,
      dateText: 'x',
      goalsAgainst: 0,
      goalsFor: goals,
      home: true,
      matchDate: '2026-08-08',
      opponent: 'Testdorp FC',
      round: 'Speelronde 1',
      season,
      status: 'played' as const,
    },
  ])
  const [inserted] = await database.db.insert(matches).values(row!).$returningId()

  for (let minute = 1; minute <= goals; minute++) {
    await database.db
      .insert(matchGoals)
      .values({ matchId: inserted!.id, minute, ours: true, player: 'Speler', playerId })
  }
}

const rows = () => database.db.select().from(playerStatDifferences).orderBy(asc(playerStatDifferences.id))

const goalsOf = async (playerId: number) =>
  (await database.db.select().from(playerSeasonStats)).find((row) => row.playerId === playerId)

const decide = (id: number, kind: 'keep' | 'take-over') =>
  decidePlayerStatDifference(database.db, id, { kind, reason: 'Nagekeken', userId: adminId }, later)

describe('the goals of the squad table against the matches', () => {
  it('finds the player whose numbers differ, with both numbers', async () => {
    const vente = await player('Dylan Vente', 9)
    const oyen = await player('Luca Oyen', 10)

    await table(vente, 1)
    await table(oyen, 0)
    await match(vente, 2)

    expect(await findMatchGoalDifferences(database.db, season)).toEqual([
      { competition: 'Eredivisie', otherGoals: 2, playerId: vente, tableGoals: 1 },
    ])
  })

  it('compares nothing in a season without a played match', async () => {
    await table(await player('Dylan Vente', 9), 1)

    expect(await findMatchGoalDifferences(database.db, season)).toEqual([])
  })
})

describe('keeping a difference', () => {
  it('makes a row with the player, the season, the competition and both numbers', async () => {
    const vente = await player('Dylan Vente', 9)

    await table(vente, 1)
    await match(vente, 2)

    expect(await comparePlayerGoals(database.db, season, first)).toBe(1)
    expect(await rows()).toMatchObject([
      {
        comparedWith: 'matches',
        competition: 'Eredivisie',
        firstSeenAt: first,
        otherGoals: 2,
        playerId: vente,
        season,
        status: 'pending',
        tableGoals: 1,
      },
    ])
    expect(await listWaitingStatDifferences(database.db, season)).toMatchObject([{ name: 'Dylan Vente' }])
    expect(await countWaitingStatDifferences(database.db)).toEqual(new Map([[season, 1]]))
  })

  it('keeps the same difference once, and sees it again at a later run', async () => {
    const vente = await player('Dylan Vente', 9)

    await table(vente, 1)
    await match(vente, 2)
    await comparePlayerGoals(database.db, season, first)

    expect(await comparePlayerGoals(database.db, season, later)).toBe(0)
    expect(await rows()).toMatchObject([{ firstSeenAt: first, lastSeenAt: later, status: 'pending' }])
  })

  it('closes a difference that is gone, and replaces one whose numbers changed', async () => {
    const vente = await player('Dylan Vente', 9)
    const found = { competition: 'Eredivisie' as const, otherGoals: 2, playerId: vente, tableGoals: 1 }

    await keepPlayerStatDifferences(database.db, season, 'matches', [found], first)
    await keepPlayerStatDifferences(database.db, season, 'matches', [{ ...found, otherGoals: 3 }], later)

    expect(await rows()).toMatchObject([
      { decidedAt: later, otherGoals: 2, resolution: 'replaced', status: 'rejected' },
      { otherGoals: 3, status: 'pending' },
    ])

    // A comparison with the reports does not close a difference with the matches.
    await keepPlayerStatDifferences(database.db, season, 'reports', [], later)
    expect((await rows()).at(-1)).toMatchObject({ status: 'pending' })

    await keepPlayerStatDifferences(database.db, season, 'matches', [], later)
    expect((await rows()).at(-1)).toMatchObject({ resolution: 'reverted', status: 'rejected' })

    // A difference that lapsed by itself may come back.
    expect(await keepPlayerStatDifferences(database.db, season, 'matches', [found], later)).toBe(1)
  })
})

describe('deciding a difference', () => {
  it('keeps the table, and the difference does not come back while the numbers stay the same', async () => {
    const vente = await player('Dylan Vente', 9)

    await table(vente, 1)
    await match(vente, 2)
    await comparePlayerGoals(database.db, season, first)

    const [difference] = await rows()

    expect(await decide(difference!.id, 'keep')).toBe('done')
    expect(await decide(difference!.id, 'keep')).toBe('not-waiting')
    expect(await goalsOf(vente)).toMatchObject({ goals: 1, tableGoals: null })
    expect(await comparePlayerGoals(database.db, season, later)).toBe(0)
    expect(await rows()).toMatchObject([{ decidedAt: later, resolution: 'person', status: 'rejected' }])
    expect(await database.db.select().from(auditLog)).toMatchObject([
      {
        action: 'player.stats-keep',
        detail: 'Doelpunten Eredivisie 2026/27: selectietabel 1, wedstrijden 2',
        itemId: vente,
        reason: 'Nagekeken',
        userId: adminId,
      },
    ])
  })

  it('takes the other number over and remembers what the table said', async () => {
    const vente = await player('Dylan Vente', 9)

    await table(vente, 1)
    await match(vente, 2)
    await comparePlayerGoals(database.db, season, first)

    const [difference] = await rows()

    expect(await decide(difference!.id, 'take-over')).toBe('done')
    expect(await goalsOf(vente)).toMatchObject({ goals: 2, tableGoals: 1 })
    expect(await rows()).toMatchObject([{ resolution: 'person', status: 'accepted' }])
    expect(await database.db.select().from(auditLog)).toMatchObject([{ action: 'player.stats-take-over' }])
    // The numbers agree now.
    expect(await comparePlayerGoals(database.db, season, later)).toBe(0)
    expect(await rows()).toHaveLength(1)
  })

  it('says so when the squad table has no row for the player, and leaves the difference waiting', async () => {
    const vente = await player('Dylan Vente', 9)

    await keepPlayerStatDifferences(
      database.db,
      season,
      'reports',
      [{ competition: 'Eredivisie', otherGoals: 1, playerId: vente, tableGoals: 0 }],
      first,
    )

    const [difference] = await rows()

    expect(await decide(difference!.id, 'take-over')).toBe('no-row')
    expect(await rows()).toMatchObject([{ status: 'pending' }])
    expect(await decide(999_999, 'keep')).toBe('not-waiting')
  })
})
