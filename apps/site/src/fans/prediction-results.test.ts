import type { TestDatabase } from '@fansite/db/test-database'

import { clubs, matches, predictions, supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  crowdFigures,
  crowdMinimum,
  loadCrowdFigures,
  resultOf,
  scoredPredictions,
  totalsOf,
} from './prediction-results'

const holder = vi.hoisted(() => ({ db: undefined as unknown }))

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: holder.db }) }))

// sc Heerenveen at home against FC Twente, half-time 1-0 and full-time 2-1 unless a test says
// otherwise.
const now = new Date('2026-11-21T20:00:00Z')
const hour = 60 * 60 * 1000

let database: TestDatabase
let clubId: number
let supporterId: number
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
  supporterId = await addSupporter('tjalle99')
})

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
    kickoffAt: new Date(now.getTime() - 5 * hour),
    matchDate: '2026-11-21',
    opponent: 'FC Twente',
    round: `Speelronde ${rounds}`,
    season: '2026/27',
    status: 'played',
    ...extra,
  })

  return result.insertId
}

async function addSupporter(key: string, extra: Partial<typeof supporters.$inferInsert> = {}) {
  const [result] = await database.db
    .insert(supporters)
    .values({ email: `${key}@example.test`, screenName: key, screenNameKey: key, ...extra })

  return result.insertId
}

const guess = { fullTimeAway: 1, fullTimeHome: 2, halftimeAway: 0, halftimeHome: 1 }

const predict = (matchId: number, extra: Partial<typeof guess> = {}, by = supporterId) =>
  database.db.insert(predictions).values({ ...guess, ...extra, matchId, supporterId: by })

describe('what counts as played', () => {
  const base = {
    afterNinetyAgainst: null,
    afterNinetyFor: null,
    clubSlug: 'fc-twente',
    competition: 'Beker',
    dateText: null,
    fullTimeAway: 0,
    fullTimeHome: 0,
    goalsAgainst: 1,
    goalsFor: 2,
    halfTimeAgainst: 0,
    halftimeAway: 0,
    halfTimeFor: 1,
    halftimeHome: 0,
    home: true,
    kickoffAt: null,
    matchDate: '2026-11-21',
    opponent: 'FC Twente',
    round: '1/8 finale',
    season: '2026/27',
    status: 'played',
  } as const

  it('takes the score after 90 minutes, not the one after extra time', () => {
    expect(
      resultOf({ ...base, afterNinetyAgainst: 2, afterNinetyFor: 2, goalsAgainst: 3, goalsFor: 4 }).fullTime,
    ).toEqual({ away: 2, home: 2 })
  })

  it('puts the goals of sc Heerenveen on the side of the club that played away', () => {
    const away = resultOf({ ...base, home: false })

    expect(away.fullTime).toEqual({ away: 2, home: 1 })
    expect(away.halfTime).toEqual({ away: 1, home: 0 })
  })

  it('knows the half-time score of a match that has not ended, and no full-time score', () => {
    expect(resultOf({ ...base, goalsAgainst: null, goalsFor: null, status: 'scheduled' })).toEqual({
      fullTime: undefined,
      halfTime: { away: 0, home: 1 },
    })
  })

  it('has no result for a match that was called off', () => {
    expect(resultOf({ ...base, status: 'cancelled' })).toEqual({})
    expect(resultOf({ ...base, status: 'postponed' })).toEqual({})
  })

  it('leaves the half-time score out while it is not known', () => {
    expect(resultOf({ ...base, halfTimeAgainst: null, halfTimeFor: null }).halfTime).toBeUndefined()
  })
})

describe('the predictions of a supporter', () => {
  it('scores a played match and lists the newest first', async () => {
    const older = await addMatch({ matchDate: '2026-11-07' })
    const newer = await addMatch()

    await predict(older, { fullTimeAway: 0, fullTimeHome: 0, halftimeAway: 0, halftimeHome: 0 })
    await predict(newer)

    const list = await scoredPredictions(database.db, supporterId, now)

    expect(list.map((item) => item.match.id)).toEqual([newer, older])
    expect(list[0]?.points.total).toBe(30)
    expect(list[1]?.points.total).toBe(2)
    expect(list[0]?.match.state).toBe('played')
  })

  it('leaves out the matches of another supporter', async () => {
    const other = await addSupporter('pompebled')

    await predict(await addMatch(), {}, other)

    expect(await scoredPredictions(database.db, supporterId, now)).toEqual([])
  })

  it('shows a match that has begun as being played, with no points yet', async () => {
    // The database holds a half-time score only for a match with a result (issue 1445).
    await predict(
      await addMatch({
        goalsAgainst: null,
        goalsFor: null,
        halfTimeAgainst: null,
        halfTimeFor: null,
        halfTimeSource: null,
        kickoffAt: new Date(now.getTime() - hour),
        status: 'scheduled',
      }),
    )

    const [item] = await scoredPredictions(database.db, supporterId, now)

    expect(item?.match.state).toBe('live')
    expect(item?.points).toEqual({ fullTime: undefined, halfTime: undefined, total: 0 })
  })

  it('gives no points yet for a match that has not begun', async () => {
    await predict(
      await addMatch({
        goalsAgainst: null,
        goalsFor: null,
        halfTimeAgainst: null,
        halfTimeFor: null,
        halfTimeSource: null,
        kickoffAt: new Date(now.getTime() + hour),
        status: 'scheduled',
      }),
    )

    const [item] = await scoredPredictions(database.db, supporterId, now)

    expect(item?.match.state).toBe('upcoming')
    expect(item?.points).toEqual({ fullTime: undefined, halfTime: undefined, total: 0 })
  })

  it('gives only full-time points for a match without a known half-time score', async () => {
    await predict(await addMatch({ halfTimeAgainst: null, halfTimeFor: null, halfTimeSource: null }))

    const [item] = await scoredPredictions(database.db, supporterId, now)

    expect(item?.points.halfTime).toBeUndefined()
    expect(item?.points.total).toBe(20)
  })

  it('gives no points for a match that was called off, and leaves it out of the totals', async () => {
    const played = await addMatch()
    const off = await addMatch({
      goalsAgainst: null,
      goalsFor: null,
      halfTimeAgainst: null,
      halfTimeFor: null,
      halfTimeSource: null,
      matchDate: '2026-11-28',
      status: 'cancelled',
    })

    await predict(played)
    await predict(off)

    const list = await scoredPredictions(database.db, supporterId, now)

    expect(list.find((item) => item.match.id === off)?.points.total).toBe(0)
    expect(list.find((item) => item.match.id === off)?.match.state).toBe('cancelled')
    expect(totalsOf(list)).toEqual({ count: 1, points: 30 })
  })

  it('works the points out again after a corrected score, because they are not stored', async () => {
    const matchId = await addMatch()

    await predict(matchId)
    expect((await scoredPredictions(database.db, supporterId, now))[0]?.points.total).toBe(30)

    await database.db.update(matches).set({ goalsAgainst: 2, goalsFor: 2 }).where(eq(matches.id, matchId))

    expect((await scoredPredictions(database.db, supporterId, now))[0]?.points.fullTime?.points).toBe(5)
  })

  it('stores no points: the table has no column for them', async () => {
    const [columns] = await database.db.execute('SHOW COLUMNS FROM predictions')

    expect(JSON.stringify(columns)).not.toMatch(/points/i)
  })
})

describe('the figures of everybody', () => {
  it('counts the exact scores, the right outcomes and the average, from five predictions', async () => {
    const matchId = await addMatch()
    const guesses = [
      guess,
      guess,
      { ...guess, fullTimeHome: 3 },
      { ...guess, fullTimeAway: 3, fullTimeHome: 0 },
      { ...guess, fullTimeAway: 0, fullTimeHome: 0 },
    ]

    for (const [index, each] of guesses.entries()) {
      await predict(matchId, each, await addSupporter(`supporter${index}`))
    }

    expect(guesses.length).toBeGreaterThanOrEqual(crowdMinimum)

    const figures = await loadCrowdFigures(database.db, matchId)

    expect(figures).toMatchObject({ count: 5, exact: 2, outcome: 3 })
    expect(figures?.average).toBeCloseTo((30 + 30 + 25 + 10 + 10) / 5)
  })

  it('gives only the number of predictions under five, and no average', async () => {
    const matchId = await addMatch()

    await predict(matchId)

    expect(await loadCrowdFigures(database.db, matchId)).toMatchObject({ average: undefined, count: 1 })
  })

  it('leaves a blocked account out, and keeps a prediction of a closed account', async () => {
    const matchId = await addMatch()
    const blocked = await addSupporter('geblokkeerd', { disabledAt: new Date() })
    const closed = await addSupporter('opgeheven')

    await predict(matchId, {}, blocked)
    await predict(matchId, {}, closed)
    await database.db.delete(supporters).where(eq(supporters.id, closed))

    expect((await loadCrowdFigures(database.db, matchId))?.count).toBe(1)
  })

  it('has nothing for a match without predictions', async () => {
    expect(await loadCrowdFigures(database.db, await addMatch())).toBeUndefined()
  })
})

describe('the cache of the figures', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps the figures for five minutes, and reads them again after that', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })

    const matchId = await addMatch()

    await predict(matchId)
    expect((await crowdFigures(matchId))?.count).toBe(1)

    await predict(matchId, {}, await addSupporter('tweede'))
    expect((await crowdFigures(matchId))?.count).toBe(1)

    vi.setSystemTime(Date.now() + 5 * 60 * 1000 + 1)
    expect((await crowdFigures(matchId))?.count).toBe(2)
  })
})
