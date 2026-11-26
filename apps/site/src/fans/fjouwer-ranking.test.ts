import type { TestDatabase } from '@fansite/db/test-database'

import {
  clubs,
  fantasyPicks,
  matchAppearances,
  matchCards,
  matches,
  matchGoals,
  matchReports,
  matchSubstitutions,
  players,
  supporters,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { matchResults, type ResultsReader } from './fjouwer-points'
import { formerSupporter, loadRankedSeasons, loadSeasonRanking, rankingOf } from './fjouwer-ranking'

const day = 24 * 60 * 60 * 1000
const now = new Date()
const at = (days: number) => new Date(now.getTime() + days * day)

let database: TestDatabase
let clubId: number
let ids: Record<string, number> = {}
const appearances: Record<string, number> = {}
let rounds = 0

const app = (name: string) => appearances[name] ?? 0
const read: ResultsReader = (matchId) => matchResults(database.db, matchId)

const squad = [
  ['Noppert', 'doelman'],
  ['Hilgers', 'verdediger'],
  ['Proper', 'middenvelder'],
  ['Vente', 'aanvaller'],
  ['Trenskow', 'aanvaller'],
] as const

beforeAll(async () => {
  database = await createTestDatabase()
  await database.db.insert(clubs).values({ name: 'FC Twente', slug: 'fc-twente' })
  clubId = (await database.db.select().from(clubs).where(eq(clubs.slug, 'fc-twente')))[0]?.id ?? 0
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.db.delete(fantasyPicks)
  await database.db.delete(players)
  await database.db.delete(matches)
  await database.db.delete(supporters)
  await database.db.insert(players).values(
    squad.map(([name, position]) => ({
      position,
      searchTerm: name,
      season: '2026/27',
      source: 'selectie' as const,
      sourceName: name,
    })),
  )
  ids = Object.fromEntries((await database.db.select().from(players)).map((row) => [row.sourceName, row.id]))
})

async function addMatch(days: number, more: Partial<typeof matches.$inferInsert> = {}): Promise<number> {
  const kickoffAt = at(days)
  const [result] = await database.db.insert(matches).values({
    clubId,
    competition: 'Eredivisie',
    home: true,
    kickoffAt,
    matchDate: kickoffAt.toISOString().slice(0, 10),
    opponent: 'FC Twente',
    round: `Speelronde ${(rounds += 1)}`,
    season: '2026/27',
    status: days < 0 ? 'played' : 'scheduled',
    ...(days < 0 ? { goalsAgainst: 0, goalsFor: 0 } : {}),
    ...more,
  })

  return result.insertId
}

/**
 * A finished report like the example of the issue: the goalkeeper keeps the ball, but an own
 * goal of the defender is the only goal against, the midfielder gives an assist and goes off at
 * 72 minutes, and the attacker scores twice and gets a yellow card.
 */
async function addReport(matchId: number, status: 'bezig' | 'klaar' = 'klaar') {
  await database.db.insert(matchReports).values({ matchId, status })

  for (const [index, [name]] of squad.entries()) {
    const [added] = await database.db
      .insert(matchAppearances)
      .values({
        matchId,
        ours: true,
        playerId: ids[name] ?? 0,
        shirtNumber: index + 1,
        sourceName: name,
        starter: name !== 'Trenskow',
      })
      .$returningId()

    appearances[name] = added?.id ?? 0
  }

  const goal = (more: Partial<typeof matchGoals.$inferInsert>) => ({
    matchId,
    minute: 10,
    ours: true,
    sourceName: 'Speler',
    ...more,
  })

  await database.db
    .insert(matchGoals)
    .values([
      goal({ appearanceId: app('Vente'), assistAppearanceId: app('Proper'), minute: 20 }),
      goal({ appearanceId: app('Vente'), minute: 50 }),
      goal({ appearanceId: app('Hilgers'), minute: 80, ours: false, ownGoal: true }),
    ])
  await database.db.insert(matchSubstitutions).values({
    appearanceInId: app('Trenskow'),
    appearanceOutId: app('Proper'),
    matchId,
    minute: 72,
    ours: true,
  })
  await database.db
    .insert(matchCards)
    .values({ appearanceId: app('Vente'), kind: 'geel', matchId, minute: 30, ours: true })
}

async function addSupporter(name: string, more: Partial<typeof supporters.$inferInsert> = {}) {
  const [row] = await database.db
    .insert(supporters)
    .values({ email: `${name}@example.test`, screenName: name, screenNameKey: name.toLowerCase(), ...more })
    .$returningId()

  return row?.id ?? 0
}

const pick = (supporterId: number, matchId: number, ...names: string[]) => {
  const [a, b, c, d] = names.map((name) => ids[name] as number) as [number, number, number, number]

  return database.db
    .insert(fantasyPicks)
    .values({ matchId, player1Id: a, player2Id: b, player3Id: c, player4Id: d, supporterId })
}

const theFour = ['Noppert', 'Hilgers', 'Proper', 'Vente'] as const
describe('the ranking of a season', () => {
  it('ranks on points, shares a place for equal points and orders by name within a place', async () => {
    const matchId = await addMatch(-3)

    await addReport(matchId)

    const zed = await addSupporter('Zed')
    const abe = await addSupporter('Abe')
    const low = await addSupporter('Laag')

    await pick(zed, matchId, ...theFour)
    await pick(abe, matchId, ...theFour)
    await pick(low, matchId, 'Noppert', 'Hilgers', 'Proper', 'Trenskow')

    const ranking = await loadSeasonRanking(database.db, '2026/27', read)

    expect(ranking.matchCount).toBe(1)
    expect(ranking.rows.map((row) => [row.screenName, row.place, row.matches])).toEqual([
      ['Abe', 1, 1],
      ['Zed', 1, 1],
      ['Laag', 3, 1],
    ])
  })

  it('adds the matches and carries a four on to the next match', async () => {
    const first = await addMatch(-6)
    const second = await addMatch(-3)

    await addReport(first)
    await addReport(second)

    const fan = await addSupporter('Fan')
    const nobody = await addSupporter('ZonderVier')

    await pick(fan, first, ...theFour)

    const [row] = (await loadSeasonRanking(database.db, '2026/27', read)).rows

    expect(row).toMatchObject({ matches: 2, screenName: 'Fan' })
    expect(row?.total).toBe((2 * (row?.total ?? 0)) / 2)
    expect((await loadSeasonRanking(database.db, '2026/27', read)).rows.map((r) => r.supporterId)).not.toContain(nobody)
  })

  it('leaves out a blocked account and an account without a four, and shows a closed account', async () => {
    const matchId = await addMatch(-3)

    await addReport(matchId)

    const fan = await addSupporter('Fan')
    const blocked = await addSupporter('Geblokkeerd', { disabledAt: new Date() })
    const gone = await addSupporter('Weg')

    await pick(fan, matchId, 'Noppert', 'Hilgers', 'Proper', 'Trenskow')
    await pick(blocked, matchId, ...theFour)
    await pick(gone, matchId, ...theFour)
    await database.db.delete(supporters).where(eq(supporters.id, gone))

    const ranking = await loadSeasonRanking(database.db, '2026/27', read)

    expect(ranking.rows.map((row) => [row.screenName, row.place])).toEqual([
      [formerSupporter, 1],
      ['Fan', 2],
    ])
  })

  it('keeps a name that is left out of the rows, and tells its owner the place that fits', async () => {
    const matchId = await addMatch(-3)

    await addReport(matchId)

    const shy = await addSupporter('Schuw', { inRankings: false })
    const fan = await addSupporter('Fan')

    await pick(shy, matchId, 'Noppert', 'Hilgers', 'Proper', 'Trenskow')
    await pick(fan, matchId, ...theFour)

    const ranking = await loadSeasonRanking(database.db, '2026/27', read)

    expect(ranking.rows.map((row) => row.screenName)).toEqual(['Fan'])
    expect(ranking.hidden.get(shy)).toMatchObject({ place: 2 })
  })

  it('has no ranking for a season without a finished report', async () => {
    const matchId = await addMatch(-3)

    await addReport(matchId, 'bezig')

    const fan = await addSupporter('Fan')

    await pick(fan, matchId, ...theFour)

    expect(await loadRankedSeasons(database.db)).toEqual([])
    expect(await loadSeasonRanking(database.db, '2026/27', read)).toMatchObject({ matchCount: 0, rows: [] })
  })

  it('changes when a report is corrected', async () => {
    const matchId = await addMatch(-3)

    await addReport(matchId)

    const fan = await addSupporter('Fan')

    await pick(fan, matchId, ...theFour)

    const before = (await loadSeasonRanking(database.db, '2026/27', read)).rows[0]?.total

    await database.db.delete(matchCards).where(eq(matchCards.matchId, matchId))

    const after = (await loadSeasonRanking(database.db, '2026/27', read)).rows[0]?.total

    expect(after).not.toBe(before)
  })
})

describe('rankingOf', () => {
  it('shares places and skips the next one', () => {
    const entry = (name: string, total: number) => ({ matches: 1, name, supporterId: 1, total, visible: true })
    const ranking = rankingOf([entry('B', 10), entry('A', 10), entry('C', 5)], 1)

    expect(ranking.rows.map((row) => row.place)).toEqual([1, 1, 3])
  })
})
