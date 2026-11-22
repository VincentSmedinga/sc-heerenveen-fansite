import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { NewMatch } from './schema.ts'
import type { TestDatabase } from './test-database.ts'

import { closeAccount } from './close-account.ts'
import { withClubs } from './clubs.ts'
import {
  closeRatingWindows,
  closesAt,
  describeClosedWindows,
  findOwnCoachRating,
  findOwnRatings,
  findRatingWindow,
  ratingWindowDays,
  saveRatings,
} from './rating-window.ts'
import {
  coachRatings,
  matchAppearances,
  matchCoachRatings,
  matches,
  matchGoals,
  matchPlayerRatings,
  matchReports,
  matchSubstitutions,
  playerRatings,
  players,
  staff,
  supporters,
} from './schema.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM supporters')
  await database.pool.query('DELETE FROM staff')
  await database.pool.query('DELETE FROM standings')
  await database.pool.query('DELETE FROM league_results')
})

const hour = 60 * 60 * 1000
const day = 24 * hour
const on = { FANS_ACCOUNTS: 'on', FANS_UITBLINKER: 'on' }

async function match(values: Partial<NewMatch>) {
  const [row] = await withClubs(database.db, [
    {
      competition: 'Eredivisie',
      goalsAgainst: 0,
      goalsFor: 1,
      home: true,
      matchDate: '2026-08-08',
      opponent: 'Testdorp FC',
      round: 'Speelronde 1',
      season: '2026/27',
      status: 'played',
      ...values,
    },
  ])
  const [inserted] = await database.db.insert(matches).values(row!).$returningId()

  return inserted!.id
}

const dateOf = (moment: Date) => moment.toISOString().slice(0, 10)

async function appearance(matchId: number, name: string, shirtNumber: number, starter = true, playerName = name) {
  const playerId = await ourPlayer(playerName, shirtNumber === 1 ? 'doelman' : 'middenvelder')
  const [inserted] = await database.db
    .insert(matchAppearances)
    .values({ matchId, name, ours: true, playerId, shirtNumber, starter })
    .$returningId()

  return inserted!.id
}

/**
 * A line-up for the match: a goalkeeper and a midfielder who play 90 minutes (the midfielder
 * scores), a forward who goes off after 20 minutes, and his substitute who plays 70 and gave
 * the goal.
 */
async function lineUp(matchId: number) {
  const keeper = await appearance(matchId, 'Zeno Keeper', 1)
  const mid = await appearance(matchId, 'Aart Mid', 2)
  const off = await appearance(matchId, 'Bram Aanvaller', 3)
  const on = await appearance(matchId, 'Cor Invaller', 4, false)

  await database.db
    .insert(matchSubstitutions)
    .values({ appearanceInId: on, appearanceOutId: off, matchId, minute: 20, ours: true })
  await database.db.insert(matchGoals).values({
    appearanceId: mid,
    assistAppearanceId: on,
    matchId,
    minute: 30,
    ours: true,
    ownGoal: false,
    penalty: false,
    player: 'Aart Mid',
  })

  return { keeper, mid, off, on }
}

async function ourPlayer(name: string, position: 'aanvaller' | 'doelman' | 'middenvelder' | 'verdediger') {
  const [inserted] = await database.db
    .insert(players)
    .values({ name, position, searchTerm: name, season: '2026/27', source: 'selectie' })
    .$returningId()

  return inserted!.id
}

/** A played match that began `ago` before `now`, with a match after it, and its report. */
async function playedAndNext({
  ago = day,
  nextIn = 6 * day,
  now = new Date(),
  status = 'klaar' as 'bezig' | 'klaar',
}: { ago?: number; nextIn?: null | number; now?: Date; status?: 'bezig' | 'klaar' } = {}) {
  const kickoffAt = new Date(now.getTime() - ago)
  const matchId = await match({ kickoffAt, matchDate: dateOf(kickoffAt) })

  if (nextIn !== null) {
    const nextKickoff = new Date(now.getTime() + nextIn)

    await match({
      goalsAgainst: null,
      goalsFor: null,
      kickoffAt: nextKickoff,
      matchDate: dateOf(nextKickoff),
      opponent: 'FC Twente',
      round: 'Speelronde 2',
      status: 'scheduled',
    })
  }

  await database.db.insert(matchReports).values({ matchId, opponentComplete: true, status })

  return { kickoffAt, matchId }
}

let counter = 0

async function supporter(
  createdAt = new Date(Date.now() - 30 * day),
  values: Partial<typeof supporters.$inferInsert> = {},
) {
  counter++

  const [inserted] = await database.db
    .insert(supporters)
    .values({
      createdAt,
      email: `fan${counter}@example.test`,
      screenName: `Fan${counter}`,
      screenNameKey: `fan${counter}`,
      ...values,
    })
    .$returningId()

  return inserted!.id
}

describe('the window of the Uitblinker', () => {
  it('has no list while no match was played', async () => {
    expect(await findRatingWindow(database.db)).toEqual({ state: 'none' })
  })

  it('waits while the report is not finished, and says when the next match is', async () => {
    const { matchId } = await playedAndNext({ status: 'bezig' })
    const window = await findRatingWindow(database.db)

    expect(window.state).toBe('waiting')
    expect(window).toMatchObject({ match: { id: matchId }, next: { opponent: 'FC Twente' } })
  })

  it('lists the players who played 30 minutes or more, in alphabetical order, with what they did', async () => {
    const { matchId } = await playedAndNext()

    await lineUp(matchId)

    const window = await findRatingWindow(database.db)

    expect(window.state).toBe('open')
    // Bram Aanvaller played 20 minutes, so he is not in the list.
    expect(window.state === 'open' && window.players.map(({ minutes, name }) => [name, minutes])).toEqual([
      ['Aart Mid', 90],
      ['Cor Invaller', 70],
      ['Zeno Keeper', 90],
    ])
    expect(
      window.state === 'open' && window.players.map(({ assist, goal, position }) => [position, goal, assist]),
    ).toEqual([
      ['middenvelder', true, false],
      ['middenvelder', false, true],
      ['doelman', false, false],
    ])
  })

  it('counts a player of exactly 30 minutes and not one of 29', async () => {
    const { matchId } = await playedAndNext()
    const first = await appearance(matchId, 'Ed Eerste', 5)
    const thirty = await appearance(matchId, 'Fer Dertig', 6, false)
    const second = await appearance(matchId, 'Gijs Tweede', 7)
    const twentyNine = await appearance(matchId, 'Hans Negenentwintig', 8, false)

    await database.db.insert(matchSubstitutions).values([
      { appearanceInId: thirty, appearanceOutId: first, matchId, minute: 60, ours: true },
      { appearanceInId: twentyNine, appearanceOutId: second, matchId, minute: 61, ours: true },
    ])

    const window = await findRatingWindow(database.db)

    // Ed and Gijs played 60 and 61 minutes, Fer 30 (60 to 90) and Hans 29 (61 to 90).
    expect(window.state === 'open' && window.players.map(({ minutes, name }) => [name, minutes])).toEqual([
      ['Ed Eerste', 60],
      ['Fer Dertig', 30],
      ['Gijs Tweede', 61],
    ])
  })

  it('closes at the start of the next match, and after seven days at the latest', () => {
    const match = { kickoffAt: new Date('2026-11-21T19:45:00Z'), matchDate: '2026-11-21' }

    expect(closesAt(match, [new Date('2026-11-24T19:45:00Z')]).toISOString()).toBe('2026-11-24T19:45:00.000Z')
    expect(closesAt(match, [new Date('2026-12-05T19:45:00Z')]).toISOString()).toBe('2026-11-28T19:45:00.000Z')
    expect(closesAt(match, []).getTime() - match.kickoffAt.getTime()).toBe(ratingWindowDays * day)
    // A match that is not later does not count.
    expect(closesAt(match, [new Date('2026-11-01T19:45:00Z')]).toISOString()).toBe('2026-11-28T19:45:00.000Z')
  })

  it('is open before the next kick-off, and closed at it and after it', async () => {
    const now = new Date('2026-11-22T12:00:00Z')
    const { matchId } = await playedAndNext({ ago: day, nextIn: 2 * day, now })

    await lineUp(matchId)

    expect((await findRatingWindow(database.db, now)).state).toBe('open')
    expect((await findRatingWindow(database.db, new Date(now.getTime() + 2 * day - 1))).state).toBe('open')
    expect((await findRatingWindow(database.db, new Date(now.getTime() + 2 * day))).state).toBe('closed')
  })

  it('closes after seven days when the next match is further away or has no time', async () => {
    const now = new Date('2026-11-22T12:00:00Z')
    const { kickoffAt, matchId } = await playedAndNext({ ago: day, nextIn: 20 * day, now })

    await lineUp(matchId)

    const closing = new Date(kickoffAt.getTime() + 7 * day)

    expect((await findRatingWindow(database.db, new Date(closing.getTime() - 1))).state).toBe('open')
    expect((await findRatingWindow(database.db, closing)).state).toBe('closed')
  })
})

describe('saving the grades', () => {
  it('stores a grade for each player and replaces them when the supporter changes them', async () => {
    const { matchId } = await playedAndNext()
    const { keeper, mid, on } = await lineUp(matchId)
    const fan = await supporter()

    expect(
      await saveRatings(database.db, {
        grades: new Map([
          [keeper, 7],
          [mid, 8],
          [on, 6],
        ]),
        matchId,
        supporterId: fan,
      }),
    ).toEqual({
      answer: 'saved',
      changed: false,
    })
    expect(await findOwnRatings(database.db, fan, matchId)).toEqual(
      new Map([
        [keeper, 7],
        [mid, 8],
        [on, 6],
      ]),
    )
    expect(
      await saveRatings(database.db, {
        grades: new Map([
          [keeper, 1],
          [mid, 8],
          [on, 10],
        ]),
        matchId,
        supporterId: fan,
      }),
    ).toEqual({
      answer: 'saved',
      changed: true,
    })
    expect(await findOwnRatings(database.db, fan, matchId)).toEqual(
      new Map([
        [keeper, 1],
        [mid, 8],
        [on, 10],
      ]),
    )
    expect(await database.db.select().from(playerRatings)).toHaveLength(3)
  })

  it('refuses a player who is not in the list, and writes nothing then', async () => {
    const { matchId } = await playedAndNext()
    const { keeper, mid, off, on } = await lineUp(matchId)
    const fan = await supporter()

    // Bram Aanvaller played 20 minutes.
    expect(
      await saveRatings(database.db, {
        grades: new Map([
          [keeper, 7],
          [mid, 8],
          [off, 5],
          [on, 6],
        ]),
        matchId,
        supporterId: fan,
      }),
    ).toEqual({
      answer: 'closed',
    })
    expect(await database.db.select().from(playerRatings)).toHaveLength(0)
  })

  it('refuses a match that is not the last one, and a window that is closed', async () => {
    const now = new Date('2026-11-22T12:00:00Z')
    const { matchId } = await playedAndNext({ ago: day, nextIn: 2 * day, now })
    const { keeper, mid, on } = await lineUp(matchId)
    const fan = await supporter(new Date('2026-10-01T00:00:00Z'))
    const grades = new Map([
      [keeper, 7],
      [mid, 8],
      [on, 6],
    ])

    expect((await saveRatings(database.db, { grades, matchId: matchId + 999, supporterId: fan }, now)).answer).toBe(
      'closed',
    )
    expect(
      (await saveRatings(database.db, { grades, matchId, supporterId: fan }, new Date(now.getTime() + 3 * day))).answer,
    ).toBe('closed')
  })

  it('checks the window again in the write, with the clock of the database', async () => {
    // The match began on 8 August; its window closed on 15 August. A request that began on 9
    // August thinks it is open, but the database knows it is not.
    const now = new Date('2026-08-09T12:00:00Z')
    const { matchId } = await playedAndNext({ ago: day, nextIn: 20 * day, now })
    const { keeper, mid, on } = await lineUp(matchId)
    const fan = await supporter(new Date('2026-07-01T00:00:00Z'))

    expect((await findRatingWindow(database.db, now)).state).toBe('open')
    expect(
      await saveRatings(
        database.db,
        {
          grades: new Map([
            [keeper, 7],
            [mid, 8],
            [on, 6],
          ]),
          matchId,
          supporterId: fan,
        },
        now,
      ),
    ).toEqual({
      answer: 'closed',
    })
    expect(await database.db.select().from(playerRatings)).toHaveLength(0)
  })

  it('refuses an account that was made after the start of the match, and a blocked one', async () => {
    const { matchId } = await playedAndNext({ ago: 2 * day })
    const { keeper, mid, on } = await lineUp(matchId)
    const grades = new Map([
      [keeper, 7],
      [mid, 8],
      [on, 6],
    ])
    const late = await supporter(new Date(Date.now() - day))
    const blocked = await supporter(undefined, { disabledAt: new Date() })

    expect(await saveRatings(database.db, { grades, matchId, supporterId: late })).toEqual({ answer: 'late' })
    expect(await saveRatings(database.db, { grades, matchId, supporterId: blocked })).toEqual({ answer: 'late' })
    expect(await saveRatings(database.db, { grades, matchId, supporterId: 99_999 })).toEqual({ answer: 'late' })
    expect(await database.db.select().from(playerRatings)).toHaveLength(0)
  })

  it('does not open for a match whose report is not finished', async () => {
    const { matchId } = await playedAndNext({ status: 'bezig' })
    const { keeper } = await lineUp(matchId)
    const fan = await supporter()

    expect((await saveRatings(database.db, { grades: new Map([[keeper, 7]]), matchId, supporterId: fan })).answer).toBe(
      'closed',
    )
  })

  it('keeps a grade without a link to a person when the account is closed', async () => {
    const { matchId } = await playedAndNext()
    const { keeper, mid, on } = await lineUp(matchId)
    const fan = await supporter()

    await saveRatings(database.db, {
      grades: new Map([
        [keeper, 7],
        [mid, 8],
        [on, 6],
      ]),
      matchId,
      supporterId: fan,
    })
    await closeAccount(database.db, fan)

    const rows = await database.db.select().from(playerRatings)

    expect(rows.map((row) => [row.supporterId, row.grade]).toSorted()).toEqual([
      [null, 6],
      [null, 7],
      [null, 8],
    ])
  })
})

describe('closing the window', () => {
  /** Two supporters rate the match, in a window that is already over. */
  async function closedMatch() {
    const now = new Date('2026-11-30T12:00:00Z')
    const { matchId } = await playedAndNext({ ago: 9 * day, nextIn: null, now })
    const ids = await lineUp(matchId)

    return { ...ids, matchId, now }
  }

  const rate = (appearanceId: number, supporterId: null | number, grade: number) =>
    database.db.insert(playerRatings).values({ appearanceId, grade, supporterId })

  it('stores the average, the count and the spread of each player, with the source Fans', async () => {
    const { keeper, matchId, mid, now } = await closedMatch()
    const first = await supporter()
    const second = await supporter()

    await rate(keeper, first, 6)
    await rate(keeper, second, 8)
    await rate(mid, first, 7)
    // A grade without a link, from a closed account, counts.
    await rate(mid, null, 9)

    expect(await closeRatingWindows(database.db, now, on)).toEqual({ closed: 1 })

    const stored = await database.db.select().from(matchPlayerRatings)

    expect(stored.map((row) => [row.source, row.average, row.ratingCount, row.spread]).toSorted()).toEqual([
      ['fans', '7.00', 2, '1.00'],
      ['fans', '8.00', 2, '1.00'],
    ])
    expect(stored.every((row) => row.matchId === matchId)).toBe(true)
    expect(describeClosedWindows({ closed: 1 })).toEqual(['Uitblinker: 1 window closed, averages stored'])
  })

  it('does not count the grades of a blocked account', async () => {
    const { keeper, now } = await closedMatch()
    const fine = await supporter()
    const blocked = await supporter(undefined, { disabledAt: new Date() })

    await rate(keeper, fine, 6)
    await rate(keeper, blocked, 1)
    await closeRatingWindows(database.db, now, on)

    const [row] = await database.db.select().from(matchPlayerRatings)

    expect([row?.average, row?.ratingCount]).toEqual(['6.00', 1])
  })

  it('does nothing while the window is open, runs again without a change, and does nothing while the game is off', async () => {
    const { keeper, now } = await closedMatch()
    const fan = await supporter()

    await rate(keeper, fan, 6)

    expect(await closeRatingWindows(database.db, new Date(now.getTime() - 5 * day), on)).toEqual({ closed: 0 })
    expect(await closeRatingWindows(database.db, now, { ...on, FANS_UITBLINKER: 'off' })).toEqual({ closed: 0 })
    expect(await closeRatingWindows(database.db, now, { FANS_UITBLINKER: 'on' })).toEqual({ closed: 0 })
    expect(await database.db.select().from(matchPlayerRatings)).toHaveLength(0)
    expect(await closeRatingWindows(database.db, now, on)).toEqual({ closed: 1 })
    expect(await closeRatingWindows(database.db, now, on)).toEqual({ closed: 0 })
    expect(await database.db.select().from(matchPlayerRatings)).toHaveLength(1)
  })
})

describe('the head coach in the Uitblinker', () => {
  const coach = (name: string, startDate: string, values: Partial<typeof staff.$inferInsert> = {}) =>
    database.db
      .insert(staff)
      .values({ name, role: 'coach', startDate, startPrecision: 'day', ...values })
      .$returningId()
      .then(([row]) => row!.id)

  async function openWindow() {
    const { matchId } = await playedAndNext()
    const ids = await lineUp(matchId)
    const staffId = await coach('Robin Veldman', '2020-01-01')

    return { ...ids, matchId, staffId }
  }

  it('is the head coach of the day of the match, and nobody for a day in a gap', async () => {
    const { staffId } = await openWindow()
    const window = await findRatingWindow(database.db)

    expect(window).toMatchObject({ coach: { name: 'Robin Veldman', staffId }, state: 'open' })

    await database.pool.query('DELETE FROM staff')
    await coach('Iemand Eerder', '2000-01-01', { endDate: '2010-01-01', endPrecision: 'day' })

    expect(await findRatingWindow(database.db)).toMatchObject({ coach: null, state: 'open' })
  })

  it('is nobody when two coaches surely hold the day, as with an interim, because the report does not name one', async () => {
    await openWindow()
    await coach('Interim Trainer', '2020-06-01', { interim: true })

    expect(await findRatingWindow(database.db)).toMatchObject({ coach: null, state: 'open' })
  })

  it('stores the grade of the coach with those of the players, replaces it, and needs it', async () => {
    const { keeper, matchId, mid, on, staffId } = await openWindow()
    const fan = await supporter()
    const grades = new Map([
      [keeper, 7],
      [mid, 8],
      [on, 6],
    ])

    expect(await saveRatings(database.db, { grades, matchId, supporterId: fan })).toEqual({ answer: 'closed' })
    expect(await findOwnRatings(database.db, fan, matchId)).toEqual(new Map())
    expect(await saveRatings(database.db, { coachGrade: 6, grades, matchId, supporterId: fan })).toEqual({
      answer: 'saved',
      changed: false,
    })
    expect(await findOwnCoachRating(database.db, fan, matchId)).toBe(6)
    expect(await database.db.select().from(coachRatings)).toMatchObject([{ grade: 6, matchId, staffId }])
    expect(await saveRatings(database.db, { coachGrade: 9, grades, matchId, supporterId: fan })).toEqual({
      answer: 'saved',
      changed: true,
    })
    expect(await findOwnCoachRating(database.db, fan, matchId)).toBe(9)
    expect(await database.db.select().from(coachRatings)).toHaveLength(1)
  })

  it('takes no grade for a coach when the match has none', async () => {
    const { matchId } = await playedAndNext()
    const { keeper } = await lineUp(matchId)
    const fan = await supporter()

    expect(
      await saveRatings(database.db, { coachGrade: 5, grades: new Map([[keeper, 7]]), matchId, supporterId: fan }),
    ).toEqual({ answer: 'closed' })
    expect(await saveRatings(database.db, { grades: new Map([[keeper, 7]]), matchId, supporterId: fan })).toMatchObject(
      {
        answer: 'saved',
      },
    )
    expect(await database.db.select().from(coachRatings)).toHaveLength(0)
  })

  it('writes nothing, not even the grades of the players, once the window is over', async () => {
    const now = new Date('2026-11-30T12:00:00Z')
    const { matchId } = await playedAndNext({ ago: 9 * day, nextIn: null, now })
    const { keeper } = await lineUp(matchId)
    const fan = await supporter(new Date('2026-01-01T00:00:00Z'))

    await coach('Robin Veldman', '2020-01-01')

    expect(
      await saveRatings(database.db, { coachGrade: 5, grades: new Map([[keeper, 7]]), matchId, supporterId: fan }, now),
    ).toEqual({ answer: 'closed' })
    expect(await database.db.select().from(playerRatings)).toHaveLength(0)
    expect(await database.db.select().from(coachRatings)).toHaveLength(0)
  })

  it('stores the average of the coach, and keeps him out of the averages of the players', async () => {
    const now = new Date('2026-11-30T12:00:00Z')
    const { matchId } = await playedAndNext({ ago: 9 * day, nextIn: null, now })
    const staffId = await coach('Robin Veldman', '2020-01-01')
    const first = await supporter()
    const blocked = await supporter(undefined, { disabledAt: new Date() })

    await database.db.insert(coachRatings).values([
      { grade: 6, matchId, staffId, supporterId: first },
      { grade: 8, matchId, staffId, supporterId: null },
      { grade: 1, matchId, staffId, supporterId: blocked },
    ])

    expect(await closeRatingWindows(database.db, now, on)).toEqual({ closed: 1 })
    expect(await database.db.select().from(matchCoachRatings)).toMatchObject([
      { average: '7.00', matchId, ratingCount: 2, source: 'fans', spread: '1.00', staffId },
    ])
    expect(await database.db.select().from(matchPlayerRatings)).toHaveLength(0)
    expect(await closeRatingWindows(database.db, now, on)).toEqual({ closed: 0 })
  })
})
