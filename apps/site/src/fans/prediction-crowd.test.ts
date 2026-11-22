import type { TestDatabase } from '@fansite/db/test-database'

import { clubs, matches, matchPredictionCounts, predictions, supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { loadMatchCrowd, loadOldMatchCrowd, shareText } from './prediction-crowd'

let database: TestDatabase
let clubId: number
let rounds = 0

beforeAll(async () => {
  database = await createTestDatabase()
  await database.db.insert(clubs).values({ name: 'FC Twente', slug: 'fc-twente' })
  clubId = (await database.db.select().from(clubs).where(eq(clubs.slug, 'fc-twente')))[0]?.id ?? 0
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.db.delete(matchPredictionCounts)
  await database.db.delete(predictions)
  await database.db.delete(matches)
  await database.db.delete(supporters)
})

// sc Heerenveen at home against FC Twente, played, 2–1, unless a test says otherwise.
async function addMatch(extra: Partial<typeof matches.$inferInsert> = {}) {
  rounds += 1

  const [result] = await database.db.insert(matches).values({
    clubId,
    competition: 'Eredivisie',
    goalsAgainst: 1,
    goalsFor: 2,
    home: true,
    kickoffAt: new Date('2026-11-21T19:00:00Z'),
    matchDate: '2026-11-21',
    opponent: 'FC Twente',
    round: `Speelronde ${rounds}`,
    season: '2026/27',
    status: 'played',
    ...extra,
  })

  return result.insertId
}

let supporters_ = 0

/** Predictions of the full-time score, each by a supporter of its own. */
async function predict(matchId: number, scores: readonly (readonly [number, number])[], extra = {}) {
  for (const [home, away] of scores) {
    supporters_ += 1

    const [supporter] = await database.db.insert(supporters).values({
      email: `s${supporters_}@example.test`,
      screenName: `s${supporters_}`,
      screenNameKey: `s${supporters_}`,
      ...extra,
    })

    await database.db.insert(predictions).values({
      fullTimeAway: away,
      fullTimeHome: home,
      halftimeAway: 0,
      halftimeHome: 0,
      matchId,
      supporterId: supporter.insertId,
    })
  }
}

const many = (score: readonly [number, number], times: number) => Array.from({ length: times }, () => score)

describe('the figures of a match', () => {
  it('has none for a match nobody predicted', async () => {
    expect(await loadMatchCrowd(database.db, await addMatch(), true)).toBeUndefined()
  })

  it('has only the count before the kick-off, whatever was predicted', async () => {
    const id = await addMatch()

    await predict(id, [...many([2, 1], 6), ...many([0, 0], 4)])

    expect(await loadMatchCrowd(database.db, id, false)).toEqual({ count: 10 })
  })

  it('has only the count under five predictions, also after the match', async () => {
    const id = await addMatch()

    await predict(id, [...many([2, 1], 4)])

    expect(await loadMatchCrowd(database.db, id, true)).toEqual({ count: 4 })
  })

  it('counts win, draw and loss for sc Heerenveen and groups the rare scores under anders', async () => {
    const id = await addMatch({ goalsAgainst: null, goalsFor: null, status: 'scheduled' })

    await predict(id, [...many([2, 1], 4), ...many([1, 1], 3), [0, 1], [0, 3], [4, 0]])

    const crowd = await loadMatchCrowd(database.db, id, true)

    expect(crowd?.after).toBeUndefined()
    expect(crowd?.spread).toEqual({
      draws: 3,
      losses: 2,
      other: 3,
      scores: [
        { count: 4, label: '2–1' },
        { count: 3, label: '1–1' },
      ],
      wins: 5,
    })
  })

  it('writes the scores home first and counts a win for sc Heerenveen in an away match', async () => {
    const id = await addMatch({ goalsAgainst: 0, goalsFor: 3, home: false })

    await predict(id, [...many([1, 2], 4), [0, 0], [2, 1]])

    const crowd = await loadMatchCrowd(database.db, id, true)

    expect(crowd?.spread).toMatchObject({ draws: 1, losses: 1, scores: [{ count: 4, label: '1–2' }], wins: 4 })
    // The match ended 3–0 for sc Heerenveen, away: 0–3 as it is written, and that is a win.
    expect(crowd?.spread?.actual).toEqual({ outcome: 'win', score: '0–3' })
  })

  it('has the figures after the match: the average, the exact scores and the right outcomes', async () => {
    const id = await addMatch()

    await predict(id, [...many([2, 1], 2), [1, 0], [3, 1], [0, 0], [1, 2]])

    const crowd = await loadMatchCrowd(database.db, id, true)

    // Goals 9 home and 5 away over 6: 1,5–0,8. Exact: 2. Outcome: 2–1 ×2, 1–0, 3–1.
    expect(crowd?.after).toEqual({ average: '1,5–0,8', exact: 2, outcome: 4 })
    expect(crowd?.spread?.actual).toEqual({ outcome: 'win', score: '2–1' })
  })

  it('takes the score after 90 minutes as the result', async () => {
    const id = await addMatch({
      afterNinetyAgainst: 2,
      afterNinetyFor: 2,
      competition: 'KNVB Beker',
      extraTime: true,
      goalsAgainst: 3,
      goalsFor: 4,
    })

    await predict(id, many([2, 2], 5))

    expect((await loadMatchCrowd(database.db, id, true))?.spread?.actual).toEqual({ outcome: 'draw', score: '2–2' })
  })

  it('leaves a blocked account out and counts a closed account as an anonymous number', async () => {
    const id = await addMatch()

    await predict(id, many([2, 1], 5))
    await predict(id, many([0, 0], 3), { disabledAt: new Date('2026-11-01T10:00:00Z') })
    await database.db.insert(predictions).values({
      fullTimeAway: 1,
      fullTimeHome: 2,
      halftimeAway: 0,
      halftimeHome: 0,
      matchId: id,
      supporterId: null,
    })

    const crowd = await loadMatchCrowd(database.db, id, true)

    expect(crowd?.count).toBe(6)
    expect(crowd?.spread?.draws).toBe(0)
  })

  it('names no one', async () => {
    const id = await addMatch()

    await predict(id, many([2, 1], 6))

    expect(JSON.stringify(await loadMatchCrowd(database.db, id, true))).not.toMatch(/screen|s1|example/)
  })
})

describe('the share text', () => {
  it('rounds to whole percents', () => {
    expect(shareText(14, 54)).toBe('26 procent')
  })
})

describe('loadOldMatchCrowd (issue 1457)', () => {
  const count = (
    matchId: number,
    home: number,
    away: number,
    predictionCount: number,
    kind: 'full_time' | 'half_time' = 'full_time',
  ) => ({ away, home, kind, matchId, predictionCount, source: 'oude-fansite' as const })

  it('adds the counts up and tells win, draw and loss for sc Heerenveen at home', async () => {
    const matchId = await addMatch({ home: true })

    await database.db.insert(matchPredictionCounts).values([
      count(matchId, 2, 1, 14),
      count(matchId, 1, 0, 19),
      count(matchId, 1, 1, 13),
      count(matchId, 0, 1, 8),
      count(matchId, 0, 3, 2),
      // The half-time scores are not part of the card.
      count(matchId, 0, 0, 40, 'half_time'),
    ])

    expect(await loadOldMatchCrowd(database.db, matchId)).toEqual({
      count: 56,
      spread: {
        draws: 13,
        losses: 10,
        other: 2,
        scores: [
          { count: 19, label: '1–0' },
          { count: 14, label: '2–1' },
          { count: 13, label: '1–1' },
          { count: 8, label: '0–1' },
        ],
        wins: 33,
      },
    })
  })

  it('reads win and loss from the side of sc Heerenveen when it plays away', async () => {
    const matchId = await addMatch({ home: false })

    await database.db.insert(matchPredictionCounts).values([count(matchId, 2, 1, 6), count(matchId, 0, 1, 4)])

    expect(await loadOldMatchCrowd(database.db, matchId)).toMatchObject({
      count: 10,
      spread: { losses: 6, wins: 4 },
    })
  })

  it('puts a score under "other" under three predictions, and shows only the count under five', async () => {
    const matchId = await addMatch()
    const fewId = await addMatch()

    await database.db
      .insert(matchPredictionCounts)
      .values([count(matchId, 1, 0, 3), count(matchId, 2, 0, 2), count(fewId, 1, 0, 3), count(fewId, 0, 0, 1)])

    expect((await loadOldMatchCrowd(database.db, matchId))?.spread).toMatchObject({
      other: 2,
      scores: [{ count: 3, label: '1–0' }],
    })
    expect(await loadOldMatchCrowd(database.db, fewId)).toEqual({ count: 4 })
  })

  it('has no figures for a match without counts', async () => {
    expect(await loadOldMatchCrowd(database.db, await addMatch())).toBeUndefined()
  })
})
