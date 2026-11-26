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

import {
  matchResults,
  matchStanding,
  pointsOfFour,
  type ResultsReader,
  seasonPoints,
  supporterFours,
} from './fjouwer-points'

const day = 24 * 60 * 60 * 1000
const now = new Date()
const at = (days: number) => new Date(now.getTime() + days * day)

let database: TestDatabase
let clubId: number
let ids: Record<string, number> = {}
const appearances: Record<string, number> = {}
let rounds = 0

const id = (name: string) => ids[name] ?? 0
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

describe('the results of a match', () => {
  it('works out the points of every player of ours from the finished report', async () => {
    const matchId = await addMatch(-3, { goalsAgainst: 1, goalsFor: 2 })

    await addReport(matchId)

    const results = await matchResults(database.db, matchId)

    expect([...theFour, 'Trenskow'].map((name) => results?.get(ids[name] ?? 0)?.points.total)).toEqual([
      5, 0, 13, 22, 2,
    ])
    expect(results?.get(id('Vente'))?.summary).toBe('90 min, 2 goals, geel')
    expect(results?.get(id('Proper'))?.summary).toBe('72 min, assist')
    expect(results?.get(id('Hilgers'))?.summary).toBe('90 min, eigen goal, tegengoal')
  })

  it('gives nothing while the report is not finished, or when there is none', async () => {
    const busy = await addMatch(-3)
    const none = await addMatch(-2)

    await addReport(busy, 'bezig')

    expect(await matchResults(database.db, busy)).toBeUndefined()
    expect(await matchResults(database.db, none)).toBeUndefined()
  })

  it('gives new points for a corrected report, without a job', async () => {
    const matchId = await addMatch(-3, { goalsAgainst: 1, goalsFor: 2 })

    await addReport(matchId)
    await database.db.delete(matchGoals).where(eq(matchGoals.minute, 50))

    const results = await matchResults(database.db, matchId)

    expect(results?.get(id('Vente'))?.points.total).toBe(12)
  })
})

describe('the points of a four', () => {
  it('counts a player who has his ten as 0, with the reason', () => {
    const results = new Map([[1, { facts: {} as never, points: { lines: [], total: 13 }, summary: '72 min, assist' }]])
    const worked = pointsOfFour([1, 2], new Map([[1, 10]]), results)

    expect(worked?.total).toBe(0)
    expect(worked?.rows[0]).toMatchObject({ counted: false, summary: 'Telde niet mee: al 10 keer gekozen' })
    expect(worked?.rows[1]).toMatchObject({ counted: true, summary: 'Niet gespeeld' })
  })

  it('is empty while the results are not there', () => {
    expect(pointsOfFour([1], new Map(), undefined)).toBeUndefined()
  })
})

describe('the fours of a supporter', () => {
  it('gives the points of the four per match, the newest first, and leaves out a match to come', async () => {
    const tjalle = await addSupporter('Tjalle99')
    const first = await addMatch(-10, { goalsAgainst: 1, goalsFor: 2 })
    const second = await addMatch(-3, { goalsAgainst: 0, goalsFor: 0 })
    const coming = await addMatch(4)

    await addReport(first)
    await pick(tjalle, first, ...theFour)
    await pick(tjalle, coming, ...theFour)

    const fours = await supporterFours(database.db, tjalle, now, read)

    // The second match has no row of its own, so it inherits the four of the first one.
    expect(fours.map((item) => item.match.id)).toEqual([second, first])
    expect(fours[1]).toMatchObject({ names: ['Noppert', 'Hilgers', 'Proper', 'Vente'], ready: true, total: 40 })
    expect(fours[1]?.rows.map((row) => [row.surname, row.points.total, row.summary])).toEqual([
      ['Noppert', 5, '90 min, tegengoal'],
      ['Hilgers', 0, '90 min, eigen goal, tegengoal'],
      ['Proper', 13, '72 min, assist'],
      ['Vente', 22, '90 min, 2 goals, geel'],
    ])
    // The second has no report yet: only the names.
    expect(fours[0]).toMatchObject({ ready: false, rows: [], total: undefined })
    expect(fours[0]?.names).toEqual(['Noppert', 'Hilgers', 'Proper', 'Vente'])
  })

  it('has no row for a supporter who never chose', async () => {
    const nobody = await addSupporter('Nieuw')
    const matchId = await addMatch(-3)

    await addReport(matchId)

    expect(await supporterFours(database.db, nobody, now, read)).toEqual([])
  })
})

describe('the ranking of a match', () => {
  it('ranks everybody with a four, shares a place for equal points and skips blocked accounts', async () => {
    const matchId = await addMatch(-3, { goalsAgainst: 1, goalsFor: 2 })

    await addReport(matchId)

    const best = await addSupporter('Best')
    const tjalle = await addSupporter('Tjalle99')
    const same = await addSupporter('Gelijk')
    const blocked = await addSupporter('Geblokkeerd', { disabledAt: new Date() })
    const last = await addSupporter('Laatste')

    await pick(best, matchId, 'Noppert', 'Hilgers', 'Proper', 'Vente') // 40
    await pick(same, matchId, 'Noppert', 'Hilgers', 'Proper', 'Vente') // 40
    await pick(tjalle, matchId, 'Noppert', 'Hilgers', 'Proper', 'Trenskow') // 20
    await pick(blocked, matchId, 'Noppert', 'Hilgers', 'Proper', 'Vente')
    await pick(last, matchId, 'Noppert', 'Hilgers', 'Trenskow', 'Vente') // 29

    const standing = await matchStanding(database.db, matchId, read)

    expect(standing?.counted).toBe(4)
    expect(standing?.places.get(best)).toEqual({ place: 1, points: 40 })
    expect(standing?.places.get(same)).toEqual({ place: 1, points: 40 })
    expect(standing?.places.get(last)).toEqual({ place: 3, points: 29 })
    expect(standing?.places.get(tjalle)).toEqual({ place: 4, points: 20 })
    expect(standing?.places.has(blocked)).toBe(false)
  })

  it('is undefined while the report is not finished', async () => {
    const matchId = await addMatch(-3)

    await addReport(matchId, 'bezig')

    expect(await matchStanding(database.db, matchId, read)).toBeUndefined()
  })
})

describe('the points of a player this season', () => {
  it('adds up his points over the matches with a finished report', async () => {
    const first = await addMatch(-10, { goalsAgainst: 1, goalsFor: 2 })
    const busy = await addMatch(-3)

    await addReport(first)
    await database.db.delete(matchAppearances).where(eq(matchAppearances.matchId, busy))
    await database.db.insert(matchReports).values({ matchId: busy, status: 'bezig' })

    const totals = await seasonPoints(database.db, '2026/27', read)

    expect(totals.get(id('Vente'))).toBe(22)
    expect(totals.get(id('Noppert'))).toBe(5)
    expect(totals.get(id('Trenskow'))).toBe(2)
  })
})
