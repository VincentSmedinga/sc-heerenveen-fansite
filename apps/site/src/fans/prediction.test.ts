import type { TestDatabase } from '@fansite/db/test-database'

import { clubs, matches, predictions, supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  closedCardHours,
  deadlineText,
  findPrediction,
  isOpen,
  kickoffText,
  parsePrediction,
  predictionMatches,
  savedMessage,
  savePrediction,
} from './prediction'
import { predictionData } from './prediction-results'

// Read with the morning of Friday 20 November 2026 (Dutch time) as now.
const now = new Date('2026-11-20T10:00:00Z')
const hour = 60 * 60 * 1000
const at = (hours: number) => new Date(now.getTime() + hours * hour)

// Writing checks the deadline with the clock of the database too, so the tests that write
// take the real time as now, and only the tests of the words keep the fixed day.
const live = new Date()
const atLive = (hours: number) => new Date(live.getTime() + hours * hour)

let database: TestDatabase
let clubId: number
let supporterId: number
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
  await database.db.delete(predictions)
  await database.db.delete(matches)
  await database.db.delete(supporters)
  rounds = 0
  await database.db
    .insert(supporters)
    .values({ email: 'tjalle@example.test', screenName: 'Tjalle99', screenNameKey: 'tjalle99' })
  supporterId = (await database.db.select().from(supporters))[0]?.id ?? 0
})

async function addMatch(kickoffAt: Date | null, extra: Partial<typeof matches.$inferInsert> = {}): Promise<number> {
  rounds += 1

  const [result] = await database.db.insert(matches).values({
    clubId,
    competition: 'Eredivisie',
    dateText: kickoffAt === null ? 'zaterdag 28 november' : null,
    home: true,
    kickoffAt,
    matchDate: (kickoffAt ?? new Date('2026-11-28T12:00:00Z')).toISOString().slice(0, 10),
    opponent: 'FC Twente',
    round: `Speelronde ${rounds}`,
    season: '2026/27',
    status: 'scheduled',
    ...extra,
  })

  return result.insertId
}

const goals = { fullTimeAway: 1, fullTimeHome: 2, halftimeAway: 0, halftimeHome: 1 }

describe('the match of the form', () => {
  it('is the first match that has not begun', async () => {
    const later = await addMatch(at(80))
    const first = await addMatch(at(30))

    expect((await predictionMatches(database.db, now)).next?.id).toBe(first)
    expect(later).not.toBe(first)
  })

  it('moves on to the next match at the kick-off of the one before it', async () => {
    const before = await addMatch(at(-1))
    const after = await addMatch(at(80))
    const matchesNow = await predictionMatches(database.db, now)

    expect(matchesNow.next?.id).toBe(after)
    expect(matchesNow.started?.id).toBe(before)
  })

  it('has the deadline on the kick-off itself', async () => {
    const id = await addMatch(now)

    expect((await predictionMatches(database.db, now)).next).toBeUndefined()
    expect((await predictionMatches(database.db, at(-0.001))).next?.id).toBe(id)
  })

  it('shows a match that began long ago no more', async () => {
    await addMatch(at(-closedCardHours - 1), { goalsAgainst: 1, goalsFor: 2, status: 'played' })
    const next = await addMatch(at(80))
    const found = await predictionMatches(database.db, now)

    expect(found.started).toBeUndefined()
    expect(found.next?.id).toBe(next)
  })

  it('shows a match that is played and began within the hours', async () => {
    const id = await addMatch(at(-3), { goalsAgainst: 1, goalsFor: 2, status: 'played' })

    expect((await predictionMatches(database.db, now)).started?.id).toBe(id)
  })

  it('takes a match of any competition: the cup, the play-offs and Europe', async () => {
    const cup = await addMatch(at(30), { competition: 'KNVB Beker' })

    expect((await predictionMatches(database.db, now)).next?.id).toBe(cup)

    await database.db.delete(matches)

    const playOffs = await addMatch(at(30), { competition: 'Play-offs Europa League' })

    expect((await predictionMatches(database.db, now)).next?.id).toBe(playOffs)
  })

  it('skips a cancelled match and a postponed one without a new date', async () => {
    await addMatch(at(30), { status: 'cancelled' })
    await addMatch(at(31), { dateText: 'uitgesteld', kickoffAt: null, matchDate: '2026-11-21', status: 'postponed' })
    const next = await addMatch(at(80))

    expect((await predictionMatches(database.db, now)).next?.id).toBe(next)
  })

  it('has no match when there is none to come', async () => {
    expect(await predictionMatches(database.db, now)).toEqual({})
  })

  it('keeps a match without a known time as the next one, with the form closed', async () => {
    const id = await addMatch(null)
    const { next } = await predictionMatches(database.db, now)

    expect(next?.id).toBe(id)
    expect(isOpen(next ?? { kickoffAt: null }, now)).toBe(false)
  })

  it('puts a match without a time after the matches of its day that have one', async () => {
    const unknown = await addMatch(null, { matchDate: '2026-11-21' })
    const known = await addMatch(new Date('2026-11-21T19:45:00Z'))

    expect((await predictionMatches(database.db, now)).next?.id).toBe(known)
    expect(unknown).not.toBe(known)
  })

  it('follows a kick-off that moves', async () => {
    const id = await addMatch(at(30))

    await database.db
      .update(matches)
      .set({ kickoffAt: at(-1) })
      .where(eq(matches.id, id))

    const found = await predictionMatches(database.db, now)

    expect(found.next).toBeUndefined()
    expect(found.started?.id).toBe(id)
  })
})

describe('the numbers of the form', () => {
  const clubsOfMatch = { away: 'FC Twente', home: 'sc Heerenveen' }

  it('accepts one digit in each field, spaces around it away', () => {
    expect(
      parsePrediction({ fullTimeAway: '1', fullTimeHome: ' 2 ', halftimeAway: '0', halftimeHome: '9' }, clubsOfMatch),
    ).toMatchObject({ goals: { fullTimeAway: 1, fullTimeHome: 2, halftimeAway: 0, halftimeHome: 9 } })
  })

  it('names the club and the score of a field that is empty', () => {
    expect(
      parsePrediction({ fullTimeAway: '', fullTimeHome: '2', halftimeAway: '0', halftimeHome: '1' }, clubsOfMatch),
    ).toMatchObject({ errors: { fullTimeAway: 'Vul de goals van FC Twente bij de eindstand in.' } })
    expect(parsePrediction({}, clubsOfMatch).errors).toMatchObject({
      halftimeHome: 'Vul de goals van sc Heerenveen bij de ruststand in.',
    })
  })

  it('refuses a number above 9, a negative one, a letter and a decimal', () => {
    for (const value of ['10', '-1', 'x', '1,5', '1.5']) {
      const result = parsePrediction(
        { fullTimeAway: '1', fullTimeHome: '2', halftimeAway: '0', halftimeHome: value },
        clubsOfMatch,
      )

      expect(result.errors?.halftimeHome, value).toBe(
        'Vul bij de ruststand van sc Heerenveen één cijfer van 0 tot 9 in.',
      )
    }
  })

  it('refuses a file or a missing entry', () => {
    expect(
      parsePrediction(
        { fullTimeAway: new File([], 'x'), fullTimeHome: 2, halftimeAway: undefined, halftimeHome: null },
        clubsOfMatch,
      ).errors,
    ).toHaveProperty('fullTimeAway')
  })
})

describe('storing a prediction', () => {
  it('stores it and gives it back', async () => {
    const matchId = await addMatch(atLive(30))

    expect(await savePrediction(database.db, { goals, matchId, supporterId }, live)).toEqual({
      answer: 'saved',
      changed: false,
    })
    expect(await findPrediction(database.db, supporterId, matchId)).toEqual({
      fullTimeAway: '1',
      fullTimeHome: '2',
      halftimeAway: '0',
      halftimeHome: '1',
    })
  })

  it('replaces an earlier prediction, also with the same numbers', async () => {
    const matchId = await addMatch(atLive(30))

    await savePrediction(database.db, { goals, matchId, supporterId }, live)

    expect(
      await savePrediction(database.db, { goals: { ...goals, fullTimeHome: 3 }, matchId, supporterId }, live),
    ).toEqual({ answer: 'saved', changed: true })
    expect(await savePrediction(database.db, { goals, matchId, supporterId }, live)).toEqual({
      answer: 'saved',
      changed: true,
    })
    expect(await database.db.select().from(predictions)).toHaveLength(1)
    expect((await findPrediction(database.db, supporterId, matchId))?.fullTimeHome).toBe('2')
  })

  it('stores 0 as 0 and 9 as 9', async () => {
    const matchId = await addMatch(atLive(30))

    await savePrediction(
      database.db,
      { goals: { fullTimeAway: 9, fullTimeHome: 0, halftimeAway: 0, halftimeHome: 0 }, matchId, supporterId },
      live,
    )

    expect(await findPrediction(database.db, supporterId, matchId)).toEqual({
      fullTimeAway: '9',
      fullTimeHome: '0',
      halftimeAway: '0',
      halftimeHome: '0',
    })
  })

  it('refuses after the kick-off, and on it', async () => {
    const matchId = await addMatch(atLive(30))

    expect(await savePrediction(database.db, { goals, matchId, supporterId }, atLive(30))).toEqual({ answer: 'closed' })
    expect(await savePrediction(database.db, { goals, matchId, supporterId }, atLive(31))).toEqual({ answer: 'closed' })
    expect(await database.db.select().from(predictions)).toEqual([])
  })

  it('refuses a match that is not the one to predict', async () => {
    await addMatch(atLive(30))

    const later = await addMatch(atLive(200))
    const begun = await addMatch(atLive(-1), { round: 'Speelronde 0' })

    expect(await savePrediction(database.db, { goals, matchId: later, supporterId }, live)).toEqual({
      answer: 'closed',
    })
    expect(await savePrediction(database.db, { goals, matchId: begun, supporterId }, live)).toEqual({
      answer: 'closed',
    })
  })

  it('refuses a match without a known time', async () => {
    const matchId = await addMatch(null)

    expect(await savePrediction(database.db, { goals, matchId, supporterId }, live)).toEqual({ answer: 'closed' })
  })

  it('refuses when the kick-off passed after the page was read, by the clock of the database', async () => {
    // The server thinks it is 10:00, but the match began a minute ago by the database's clock.
    const matchId = await addMatch(new Date(Date.now() - 60 * 1000))
    const early = new Date(Date.now() - 2 * 60 * 1000)

    expect(await savePrediction(database.db, { goals, matchId, supporterId }, early)).toEqual({ answer: 'closed' })
    expect(await database.db.select().from(predictions)).toEqual([])
  })

  it('keeps the prediction when the kick-off moves, and follows the new deadline', async () => {
    const matchId = await addMatch(atLive(30))

    await savePrediction(database.db, { goals, matchId, supporterId }, live)
    await database.db
      .update(matches)
      .set({ kickoffAt: atLive(100), matchDate: '2026-11-24' })
      .where(eq(matches.id, matchId))

    expect(await findPrediction(database.db, supporterId, matchId)).toBeDefined()
    expect(await savePrediction(database.db, { goals, matchId, supporterId }, atLive(50))).toEqual({
      answer: 'saved',
      changed: true,
    })
    expect(await savePrediction(database.db, { goals, matchId, supporterId }, atLive(101))).toEqual({
      answer: 'closed',
    })
  })

  it('keeps one supporter apart from another', async () => {
    const matchId = await addMatch(atLive(30))

    await database.db
      .insert(supporters)
      .values({ email: 'pompebled@example.test', screenName: 'Pompebled', screenNameKey: 'pompebled' })

    const other =
      (await database.db.select().from(supporters).where(eq(supporters.screenName, 'Pompebled')))[0]?.id ?? 0

    await savePrediction(database.db, { goals, matchId, supporterId }, live)

    expect(await findPrediction(database.db, other, matchId)).toBeUndefined()
  })
})

describe('what is kept for the supporter', () => {
  it('has nothing without predictions', async () => {
    expect(await predictionData(database.db, supporterId)).toBeUndefined()
  })

  it('lists the predictions with the newest match first, in the order of the clubs on the line', async () => {
    const home = await addMatch(new Date('2026-11-28T15:45:00Z'))
    const away = await addMatch(new Date('2026-12-05T15:45:00Z'), { home: false })
    const played = await addMatch(new Date('2026-11-07T15:45:00Z'), {
      goalsAgainst: 1,
      goalsFor: 2,
      halfTimeAgainst: 0,
      halfTimeFor: 1,
      halfTimeSource: 'redactie',
      status: 'played',
    })

    await database.db.insert(predictions).values({ ...goals, matchId: home, supporterId })
    await database.db.insert(predictions).values({ ...goals, fullTimeAway: 1, matchId: away, supporterId })
    await database.db.insert(predictions).values({ ...goals, matchId: played, supporterId })

    expect(await predictionData(database.db, supporterId)).toEqual({
      columns: ['Wedstrijd', 'Rust', 'Eind', 'P'],
      rows: [
        { cells: ['1–0', '2–1', '–'], header: 'FC Twente – sc Heerenveen, 5 dec 2026' },
        { cells: ['1–0', '2–1', '–'], header: 'sc Heerenveen – FC Twente, 28 nov 2026' },
        { cells: ['1–0', '2–1', '30'], header: 'sc Heerenveen – FC Twente, 7 nov 2026' },
      ],
      summary: '3 voorspellingen, 30 punten',
    })
  })

  it('lets go of the supporter when the account is closed, and keeps what was predicted', async () => {
    const matchId = await addMatch(atLive(30))

    await savePrediction(database.db, { goals, matchId, supporterId }, live)
    await database.db.delete(supporters).where(eq(supporters.id, supporterId))

    expect(await database.db.select().from(predictions)).toMatchObject([{ matchId, supporterId: null }])
  })
})

describe('the words', () => {
  it('writes the deadline in Dutch time with a dot, with the weekday inside the week', () => {
    expect(kickoffText(new Date('2026-11-21T15:45:00Z'), now)).toBe('za 16.45')
    expect(deadlineText(new Date('2026-11-21T15:45:00Z'), now)).toBe('Open tot za 16.45')
  })

  it('adds the day for a match further away than a week', () => {
    expect(kickoffText(new Date('2026-12-05T15:45:00Z'), now)).toBe('za 5 dec 16.45')
  })

  it('says what was stored, in the order of the clubs on the line', () => {
    const values = { fullTimeAway: '1', fullTimeHome: '2', halftimeAway: '0', halftimeHome: '1' }

    expect(savedMessage(values, false)).toBe(
      'Je voorspelling staat. Rust 1–0, eind 2–1. Je kunt hem wijzigen tot de aftrap.',
    )
    expect(savedMessage(values, true)).toBe(
      'Je voorspelling is gewijzigd. Rust 1–0, eind 2–1. Je kunt hem wijzigen tot de aftrap.',
    )
  })
})
