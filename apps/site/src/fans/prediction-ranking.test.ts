import type { TestDatabase } from '@fansite/db/test-database'

import { clubs, matches, predictions, supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  loadMatchRanking,
  loadRankedMatches,
  loadRankedSeasons,
  loadSeasonRanking,
  placeFigure,
  seasonRanking,
} from './prediction-ranking'

const holder = vi.hoisted(() => ({ db: undefined as unknown }))

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: holder.db }) }))

let database: TestDatabase
let clubId: number
let rounds = 0

beforeAll(async () => {
  database = await createTestDatabase()
  holder.db = database.db
  await database.db.insert(clubs).values({ name: 'FC Twente', slug: 'fc-twente' })
  clubId = (await database.db.select().from(clubs).where(eq(clubs.slug, 'fc-twente')))[0]?.id ?? 0
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.db.delete(predictions)
  await database.db.delete(matches)
  await database.db.delete(supporters)
  rounds = 0
})

afterEach(() => {
  vi.useRealTimers()
})

// A match that sc Heerenveen won 2-1 at home, 1-0 at half-time, unless a test says otherwise.
async function addMatch(extra: Partial<typeof matches.$inferInsert> = {}) {
  rounds += 1

  const [result] = await database.db.insert(matches).values({
    clubId,
    competition: 'Eredivisie',
    goalsAgainst: 1,
    goalsFor: 2,
    halfTimeAgainst: 0,
    halfTimeFor: 1,
    halfTimeSource: 'redactie',
    home: true,
    kickoffAt: new Date('2026-11-21T15:00:00Z'),
    matchDate: `2026-11-${String(10 + rounds).padStart(2, '0')}`,
    opponent: 'FC Twente',
    round: `Speelronde ${rounds}`,
    season: '2026/27',
    status: 'played',
    ...extra,
  })

  return result.insertId
}

async function addSupporter(name: string, extra: Partial<typeof supporters.$inferInsert> = {}) {
  const [result] = await database.db
    .insert(supporters)
    .values({ email: `${name}@example.test`, screenName: name, screenNameKey: name, ...extra })

  return result.insertId
}

/** Adds a supporter for each name, and gives their numbers in the same order. */
const addSupporters = <const Names extends readonly string[]>(...names: Names) =>
  Promise.all(names.map((name) => addSupporter(name))) as Promise<{ [Key in keyof Names]: number }>

const exact = { fullTimeAway: 1, fullTimeHome: 2, halftimeAway: 0, halftimeHome: 1 }
// The right outcome (a home win) but no exact score: 17 points (10 and 5 for the outcomes, 2).
const outcome = { fullTimeAway: 0, fullTimeHome: 3, halftimeAway: 0, halftimeHome: 2 }
const wrong = { fullTimeAway: 4, fullTimeHome: 0, halftimeAway: 3, halftimeHome: 0 }

const predict = (matchId: number, by: null | number, guess: Partial<typeof exact> = exact) =>
  database.db.insert(predictions).values({ ...exact, ...guess, matchId, supporterId: by })

describe('the ranking of a season', () => {
  it('orders on the points and shares a place between equal results, skipping the next', async () => {
    const [one, two, three, four] = await addSupporters('anna', 'bram', 'carl', 'dirk')
    const matchId = await addMatch()

    await predict(matchId, one)
    await predict(matchId, two, outcome)
    await predict(matchId, three, outcome)
    await predict(matchId, four, wrong)

    const { rows } = await loadSeasonRanking(database.db, '2026/27')

    expect(rows.map((row) => [row.screenName, row.place, row.total])).toEqual([
      ['anna', 1, 30],
      ['bram', 2, 17],
      ['carl', 2, 17],
      ['dirk', 4, 0],
    ])
  })

  it('puts the one with more exact full-time scores first on equal points, then shares a place', async () => {
    const [many, few, same] = await addSupporters('veel', 'weinig', 'gelijk')
    const matchId = await addMatch()
    // veel: exact end, wrong break = 20 points. weinig and gelijk: right outcome of the end and
    // exact break = 20 points too, with one exact half-time score and no exact full-time score.
    await predict(matchId, many, { halftimeAway: 2, halftimeHome: 0 })
    await predict(matchId, few, { fullTimeAway: 0, fullTimeHome: 3 })
    await predict(matchId, same, { fullTimeAway: 0, fullTimeHome: 3 })

    const { rows } = await loadSeasonRanking(database.db, '2026/27')

    expect(rows.map((row) => [row.screenName, row.place])).toEqual([
      ['veel', 1],
      ['gelijk', 2],
      ['weinig', 2],
    ])
  })

  it('counts the predictions and gives the average per prediction', async () => {
    const one = await addSupporter('anna')

    await predict(await addMatch(), one)
    await predict(await addMatch(), one, wrong)

    const { rows } = await loadSeasonRanking(database.db, '2026/27')

    expect(rows[0]).toMatchObject({ average: 15, count: 2, total: 30 })
  })

  it('leaves out a supporter who chose to stay out of the standings, who still counts in the group', async () => {
    const shown = await addSupporter('anna')
    const hidden = await addSupporter('bram', { inRankings: false })
    const matchId = await addMatch()

    await predict(matchId, shown, outcome)
    await predict(matchId, hidden)

    const ranking = await loadSeasonRanking(database.db, '2026/27')

    expect(ranking.rows.map((row) => row.screenName)).toEqual(['anna'])
    // The hidden supporter took no place from anna, and is in the number of the group.
    expect(ranking.rows[0]?.place).toBe(1)
    expect(ranking.counted).toBe(2)
  })

  it('leaves out a blocked account everywhere, also from the group', async () => {
    const shown = await addSupporter('anna')
    const blocked = await addSupporter('bram', { disabledAt: new Date('2026-11-20T10:00:00Z') })
    const matchId = await addMatch()

    await predict(matchId, shown)
    await predict(matchId, blocked)

    const ranking = await loadMatchRanking(database.db, matchId)

    expect(ranking.rows.map((row) => row.screenName)).toEqual(['anna'])
    expect(ranking.counted).toBe(1)
  })

  it('counts the prediction of an account that was closed in the group, without a row', async () => {
    const shown = await addSupporter('anna')
    const matchId = await addMatch()

    await predict(matchId, shown)
    await predict(matchId, null)

    const ranking = await loadMatchRanking(database.db, matchId)

    expect(ranking.rows).toHaveLength(1)
    expect(ranking.counted).toBe(2)
  })

  it('has no rows for a season without predictions, and counts only matches that were played', async () => {
    const one = await addSupporter('anna')
    const matchId = await addMatch({
      goalsAgainst: null,
      goalsFor: null,
      halfTimeAgainst: null,
      halfTimeFor: null,
      halfTimeSource: null,
      status: 'scheduled',
    })

    await predict(matchId, one)

    expect(await loadSeasonRanking(database.db, '2026/27')).toEqual({ counted: 0, matchCount: 0, rows: [] })
    expect(await loadSeasonRanking(database.db, '2025/26')).toEqual({ counted: 0, matchCount: 0, rows: [] })
  })

  it('counts a season apart from another, and tells how many matches were scored', async () => {
    const one = await addSupporter('anna')

    await predict(await addMatch(), one)
    await predict(await addMatch(), one)
    await predict(await addMatch({ season: '2025/26' }), one, wrong)

    const ranking = await loadSeasonRanking(database.db, '2026/27')

    expect(ranking.matchCount).toBe(2)
    expect(ranking.rows[0]?.total).toBe(60)
    expect(await loadRankedSeasons(database.db)).toEqual(['2026/27', '2025/26'])
  })

  it('gives more than fifty rows in full, and puts a supporter lower than fifty in their real place', async () => {
    const matchId = await addMatch()
    const ids = await Promise.all(Array.from({ length: 52 }, (_, index) => addSupporter(`supporter${index}`)))

    await Promise.all(ids.map((id, index) => predict(matchId, id, index === 51 ? wrong : exact)))

    const { rows } = await loadSeasonRanking(database.db, '2026/27')

    expect(rows).toHaveLength(52)
    expect(rows.at(-1)).toMatchObject({ place: 52 - 0, supporterId: ids[51] })
  })
})

describe('the ranking of a match', () => {
  it('ranks on the points of that match alone', async () => {
    const one = await addSupporter('anna')
    const two = await addSupporter('bram')
    const first = await addMatch()
    const second = await addMatch()

    await predict(first, one)
    await predict(second, one, wrong)
    await predict(second, two, outcome)

    const ranking = await loadMatchRanking(database.db, second)

    expect(ranking.rows.map((row) => [row.screenName, row.place, row.total])).toEqual([
      ['bram', 1, 17],
      ['anna', 2, 0],
    ])
    expect((await loadRankedMatches(database.db)).map((match) => match.id)).toEqual([second, first])
  })

  it('writes the result of a match as home–away', async () => {
    const one = await addSupporter('anna')

    await predict(await addMatch({ goalsAgainst: 3, goalsFor: 1, home: false }), one)

    expect((await loadRankedMatches(database.db))[0]).toMatchObject({
      away: 'sc Heerenveen',
      awayGoals: 1,
      home: 'FC Twente',
      homeGoals: 3,
    })
  })
})

describe('the place of a supporter as a key figure', () => {
  it('says the place and the size of the group, and "niet in de stand" for a hidden name', async () => {
    const shown = await addSupporter('anna')
    const hidden = await addSupporter('bram', { inRankings: false })
    const matchId = await addMatch()

    await predict(matchId, shown, outcome)
    await predict(matchId, hidden)

    const ranking = await loadMatchRanking(database.db, matchId)

    expect(placeFigure(ranking, shown, 'bij deze wedstrijd')).toEqual({
      figure: '1e',
      label: 'plek',
      note: 'van 2 bij deze wedstrijd',
    })
    expect(placeFigure(ranking, hidden, 'bij deze wedstrijd')).toMatchObject({ figure: '–' })
    expect(placeFigure(ranking, hidden, 'bij deze wedstrijd').note).toContain('niet in de stand')
  })
})

describe('the cache of the ranking', () => {
  it('keeps the ranking for five minutes, and reads it again after that', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })

    const one = await addSupporter('anna')
    const matchId = await addMatch()

    await predict(matchId, one)
    expect((await seasonRanking('2026/27')).rows).toHaveLength(1)

    await predict(matchId, await addSupporter('bram'))
    expect((await seasonRanking('2026/27')).rows).toHaveLength(1)

    vi.setSystemTime(Date.now() + 5 * 60 * 1000 + 1)
    expect((await seasonRanking('2026/27')).rows).toHaveLength(2)
  })
})
