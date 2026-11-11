import type { RowDataPacket } from 'mysql2/promise'

import { checkMatchReport } from '@fansite/shared/match-report'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { NewMatch, NewMatchAppearance } from './schema.ts'
import type { TestDatabase } from './test-database.ts'

import { withClubs } from './clubs.ts'
import {
  findReportedMatch,
  findReportGoalDifferences,
  listReportedMatches,
  listSeasonReports,
  matchForRules,
  mayHaveReport,
  phaseOf,
  readMatchReport,
  readPlayerReportStats,
  reportForRules,
} from './match-reports.ts'
import { listAllMatchGoals, listClubMatches, listSeasonMatches } from './queries.ts'
import {
  adminUsers,
  matchAppearances,
  matchCards,
  matches,
  matchGoals,
  matchIncidents,
  matchReports,
  matchShootoutKicks,
  matchSubstitutions,
  persons,
  players,
  playerSeasonStats,
} from './schema.ts'
import { seasonOf } from './season.ts'
import { madeUpCupReportMatch, madeUpReportMatch, seedMatches, seedSquad } from './seed.ts'
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
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM admin_users')
  // The seed of the matches puts nothing in a season that has a league table.
  await database.pool.query('DELETE FROM standings')
  await database.pool.query('DELETE FROM league_results')
})

const season = '2026/27'

/** A player in the report, and his id in the report. */
async function appearance(matchId: number, values: Partial<NewMatchAppearance> & { name: string }) {
  const [inserted] = await database.db
    .insert(matchAppearances)
    .values({ matchId, ours: true, shirtNumber: 1, starter: true, ...values })
    .$returningId()

  return inserted!.id
}

async function count(table: string) {
  const [rows] = await database.pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM ${table}`)

  return Number(rows[0]?.['n'])
}

/** A played match against Testdorp FC, and its id. */
async function playedMatch(values: Partial<NewMatch> = {}) {
  const [row] = await withClubs(database.db, [
    {
      competition: 'Eredivisie',
      goalsAgainst: 0,
      goalsFor: 1,
      home: true,
      kickoffAt: new Date('2026-08-08T16:45:00Z'),
      matchDate: '2026-08-08',
      opponent: 'Testdorp FC',
      round: 'Speelronde 1',
      season,
      status: 'played',
      ...values,
    },
  ])
  const [inserted] = await database.db.insert(matches).values(row!).$returningId()

  return inserted!.id
}

/** A player of ours in the squad of the season. */
async function player(name: string, shirtNumber: number) {
  const [inserted] = await database.db
    .insert(players)
    .values({ name, searchTerm: name, season, shirtNumber, source: 'selectie' })
    .$returningId()

  return inserted!.id
}

/** The report of a match, with the status it is given. */
async function report(matchId: number, status: 'bezig' | 'klaar' = 'klaar') {
  await database.db.insert(matchReports).values({ matchId, opponentComplete: true, status })
}

describe('the tables of a report', () => {
  it('keeps a player once in a report and one shirt number once in a team, and lets the other team have it', async () => {
    const matchId = await playedMatch()
    const oyen = await player('Luca Oyen', 9)

    await report(matchId)
    await appearance(matchId, { name: 'Luca Oyen', playerId: oyen, shirtNumber: 9 })

    await expect(appearance(matchId, { name: 'Luca Oyen', playerId: oyen, shirtNumber: 10 })).rejects.toThrow()
    await expect(appearance(matchId, { name: 'Sander Vos', shirtNumber: 9 })).rejects.toThrow()
    await expect(appearance(matchId, { name: 'Gijs Test', ours: false, shirtNumber: 9 })).resolves.toBeTypeOf('number')
  })

  it('lets a report have players without a shirt number, also several in a team, and gives them back empty', async () => {
    const matchId = await playedMatch()

    await report(matchId)
    await appearance(matchId, { name: 'Eerste', shirtNumber: null })
    await appearance(matchId, { name: 'Tweede', shirtNumber: null })
    await appearance(matchId, { name: 'Derde', ours: false, shirtNumber: null })
    await appearance(matchId, { name: 'Vierde', ours: false, shirtNumber: null })
    await appearance(matchId, { name: 'Met nummer', shirtNumber: 9 })

    await expect(appearance(matchId, { name: 'Dubbel', shirtNumber: 9 })).rejects.toThrow()

    const stored = await readMatchReport(database.db, matchId)

    expect(reportForRules(stored!).appearances.map((one) => one.shirtNumber)).toEqual([null, null, null, null, 9])
  })

  it('needs a name, a shirt number from 1 to 99, and a report to belong to', async () => {
    const matchId = await playedMatch()

    await expect(appearance(matchId, { name: 'Luca Oyen' })).rejects.toThrow()

    await report(matchId)
    await expect(appearance(matchId, { name: '' })).rejects.toThrow()
    await expect(appearance(matchId, { name: 'Luca Oyen', shirtNumber: 0 })).rejects.toThrow()
    await expect(appearance(matchId, { name: 'Luca Oyen', shirtNumber: 100 })).rejects.toThrow()
    await expect(appearance(matchId, { name: 'Luca Oyen', shirtNumber: 99 })).resolves.toBeTypeOf('number')
  })

  it('needs a status that is in the list, and a source that is not empty', async () => {
    const matchId = await playedMatch()

    await expect(
      database.pool.query(`INSERT INTO match_reports (match_id, status) VALUES (${matchId}, 'af')`),
    ).rejects.toThrow()
    await expect(
      database.pool.query(`INSERT INTO match_reports (match_id, status, source) VALUES (${matchId}, 'bezig', '')`),
    ).rejects.toThrow()
    await database.db.insert(matchReports).values({ matchId, source: 'Wedstrijdformulier', status: 'bezig' })
    expect(await database.db.select().from(matchReports)).toMatchObject([
      { matchId, opponentComplete: false, source: 'Wedstrijdformulier', status: 'bezig' },
    ])
  })

  it('keeps an event to the match and the team of its player', async () => {
    const one = await playedMatch()
    const two = await playedMatch({ round: 'Speelronde 2' })

    await report(one)
    await report(two)

    const ours = await appearance(one, { name: 'Luca Oyen', shirtNumber: 9 })
    const theirs = await appearance(one, { name: 'Gijs Test', ours: false, shirtNumber: 9 })
    const other = await appearance(two, { name: 'Sander Vos', shirtNumber: 4 })
    const card = { kind: 'geel' as const, minute: 30, stoppageMinutes: null }

    await expect(
      database.db.insert(matchCards).values({ ...card, appearanceId: ours, matchId: one, ours: true }),
    ).resolves.toBeDefined()
    // The player is of the other match, and of the other team.
    await expect(
      database.db.insert(matchCards).values({ ...card, appearanceId: other, matchId: one, ours: true }),
    ).rejects.toThrow()
    await expect(
      database.db.insert(matchCards).values({ ...card, appearanceId: theirs, matchId: one, ours: true }),
    ).rejects.toThrow()
    await expect(
      database.db
        .insert(matchSubstitutions)
        .values({ appearanceInId: theirs, appearanceOutId: ours, matchId: one, minute: 60, ours: true }),
    ).rejects.toThrow()
  })

  it('lets a player come on once and go off once, and not for himself', async () => {
    const matchId = await playedMatch()

    await report(matchId)

    const a = await appearance(matchId, { name: 'A', shirtNumber: 1 })
    const b = await appearance(matchId, { name: 'B', shirtNumber: 2, starter: false })
    const c = await appearance(matchId, { name: 'C', shirtNumber: 3, starter: false })
    const swap = (out: number, on: number) => ({
      appearanceInId: on,
      appearanceOutId: out,
      matchId,
      minute: 60,
      ours: true,
    })

    await database.db.insert(matchSubstitutions).values(swap(a, b))
    await expect(database.db.insert(matchSubstitutions).values(swap(a, c))).rejects.toThrow()
    await expect(database.db.insert(matchSubstitutions).values(swap(b, b))).rejects.toThrow()
    await expect(database.db.insert(matchSubstitutions).values(swap(c, b))).rejects.toThrow()
  })

  it('has a minute from 1 to 120, and added time of 1 to 15 minutes after the end of a half', async () => {
    const matchId = await playedMatch()

    await report(matchId)

    const a = await appearance(matchId, { name: 'A' })
    const incident = (minute: number, stoppageMinutes: null | number) =>
      database.db
        .insert(matchIncidents)
        .values({ appearanceId: a, kind: 'strafschop-gemist', matchId, minute, ours: true, stoppageMinutes })

    await expect(incident(0, null)).rejects.toThrow()
    await expect(incident(121, null)).rejects.toThrow()
    await expect(incident(30, 2)).rejects.toThrow()
    await expect(incident(45, 16)).rejects.toThrow()
    await expect(incident(45, 0)).rejects.toThrow()
    await expect(incident(120, 15)).resolves.toBeDefined()
    await expect(incident(1, null)).resolves.toBeDefined()
  })

  it('gives a player each kind of card once', async () => {
    const matchId = await playedMatch()

    await report(matchId)

    const a = await appearance(matchId, { name: 'A' })
    const card = (kind: 'geel' | 'geel-rood' | 'rood', minute: number) =>
      database.db.insert(matchCards).values({ appearanceId: a, kind, matchId, minute, ours: true })

    await card('geel', 20)
    await expect(card('geel', 40)).rejects.toThrow()
    await expect(card('geel-rood', 60)).resolves.toBeDefined()
    await expect(
      database.db
        .insert(matchCards)
        .values({ appearanceId: a, kind: 'dood' as 'rood', matchId, minute: 5, ours: true }),
    ).rejects.toThrow()
  })
})

describe('what goes with what', () => {
  /**
   * A match with a report in which a player of ours scored with an assist, was carded and
   * replaced.
   */
  async function fullReport() {
    const matchId = await playedMatch()
    const oyen = await player('Luca Oyen', 9)

    await report(matchId)

    const scorer = await appearance(matchId, { name: 'Luca Oyen', playerId: oyen, shirtNumber: 9 })
    const helper = await appearance(matchId, { name: 'Sander Vos', shirtNumber: 10 })
    const bench = await appearance(matchId, { name: 'Jan Bank', shirtNumber: 14, starter: false })
    const keeper = await appearance(matchId, { name: 'Gijs Test', ours: false, shirtNumber: 1 })

    await database.db
      .insert(matchGoals)
      .values({ appearanceId: scorer, assistAppearanceId: helper, matchId, minute: 12, ours: true, player: 'Oyen' })
    await database.db.insert(matchCards).values({ appearanceId: scorer, kind: 'geel', matchId, minute: 30, ours: true })
    await database.db
      .insert(matchSubstitutions)
      .values({ appearanceInId: bench, appearanceOutId: helper, matchId, minute: 60, ours: true })
    await database.db
      .insert(matchIncidents)
      .values({ appearanceId: keeper, kind: 'strafschop-gestopt', matchId, minute: 70, ours: false })

    return { bench, helper, matchId, oyen, scorer }
  }

  it('takes the report, its players and their events along with the match, and leaves nothing behind', async () => {
    const { matchId } = await fullReport()

    await database.db.delete(matches).where(eq(matches.id, matchId))

    for (const table of [
      'match_reports',
      'match_appearances',
      'match_substitutions',
      'match_cards',
      'match_incidents',
      'match_goals',
    ]) {
      expect(await count(table), table).toBe(0)
    }
  })

  it('takes the events of a player along with his row in the report, and keeps the goal without him', async () => {
    const { helper, scorer } = await fullReport()

    await database.db.delete(matchAppearances).where(eq(matchAppearances.id, scorer))

    expect(await count('match_cards')).toBe(0)
    expect(await database.db.select().from(matchGoals)).toMatchObject([
      { appearanceId: null, assistAppearanceId: helper, minute: 12, player: 'Oyen' },
    ])

    await database.db.delete(matchAppearances).where(eq(matchAppearances.id, helper))

    expect(await count('match_substitutions')).toBe(0)
    expect(await database.db.select().from(matchGoals)).toMatchObject([
      { appearanceId: null, assistAppearanceId: null },
    ])
  })

  it('takes the players of a report along with the report, and keeps the goals of the match', async () => {
    const { matchId } = await fullReport()

    await database.db.delete(matchReports).where(eq(matchReports.matchId, matchId))

    expect(await count('match_appearances')).toBe(0)
    expect(await count('match_substitutions')).toBe(0)
    expect(await count('match_incidents')).toBe(0)
    expect(await database.db.select().from(matchGoals)).toMatchObject([
      { appearanceId: null, assistAppearanceId: null, minute: 12 },
    ])
  })

  it('leaves a player in the report with his name when his row in players is deleted', async () => {
    const { oyen, scorer } = await fullReport()

    await database.db.delete(players).where(eq(players.id, oyen))

    expect(await database.db.select().from(matchAppearances).where(eq(matchAppearances.id, scorer))).toMatchObject([
      { name: 'Luca Oyen', playerId: null, shirtNumber: 9 },
    ])
    expect(await count('match_cards')).toBe(1)
  })

  it('leaves the report when the account that saved it is deleted', async () => {
    const matchId = await playedMatch()
    const [user] = await database.db
      .insert(adminUsers)
      .values({ email: 'beheer@example.test', role: 'beheerder' })
      .$returningId()

    await database.db.insert(matchReports).values({ matchId, savedBy: user!.id, status: 'bezig' })
    await database.db.delete(adminUsers)

    expect(await database.db.select().from(matchReports)).toMatchObject([{ matchId, savedBy: null, status: 'bezig' }])
  })
})

describe('reading a report', () => {
  it('gives nothing for a match without a report', async () => {
    expect(await readMatchReport(database.db, await playedMatch())).toBeUndefined()
  })

  it('gives the events in the order of the minute, the added time and then id', async () => {
    const matchId = await playedMatch({ goalsFor: 3 })

    await report(matchId)

    const a = await appearance(matchId, { name: 'A', shirtNumber: 1 })
    const b = await appearance(matchId, { name: 'B', shirtNumber: 2 })
    const card = (
      appearanceId: number,
      kind: 'geel' | 'rood',
      minute: number,
      stoppageMinutes: null | number = null,
    ) => ({
      appearanceId,
      kind,
      matchId,
      minute,
      ours: true,
      stoppageMinutes,
    })

    // Stored out of order, on purpose: the same minute keeps the order of id.
    const c = await appearance(matchId, { name: 'C', shirtNumber: 3 })

    await database.db
      .insert(matchCards)
      .values([
        card(a, 'rood', 80),
        card(b, 'geel', 10),
        card(a, 'geel', 45, 2),
        card(b, 'rood', 45),
        card(c, 'rood', 10),
      ])
    await database.db.insert(matchGoals).values([
      { matchId, minute: 70, ours: true, player: 'Late' },
      { matchId, minute: 12, ours: true, player: 'Eerste' },
      { matchId, minute: 12, ours: true, player: 'Tweede' },
    ])

    const stored = await readMatchReport(database.db, matchId)

    expect(stored?.report).toMatchObject({ matchId, opponentComplete: true, status: 'klaar' })
    expect(stored?.cards.map((row) => [row.minute, row.stoppageMinutes, row.kind])).toEqual([
      [10, null, 'geel'],
      [10, null, 'rood'],
      [45, null, 'rood'],
      [45, 2, 'geel'],
      [80, null, 'rood'],
    ])
    expect(stored?.goals.map((row) => row.player)).toEqual(['Eerste', 'Tweede', 'Late'])
    expect(stored?.appearances.map((row) => row.name)).toEqual(['A', 'B', 'C'])
  })

  it('gives a goal and a card without a minute last, and takes them along into the shape of the rules', async () => {
    const matchId = await playedMatch({ goalsFor: 3 })

    await report(matchId)

    const a = await appearance(matchId, { name: 'A', shirtNumber: 1 })
    const b = await appearance(matchId, { name: 'B', shirtNumber: 2 })

    // Stored before the ones with a minute, on purpose.
    await database.db.insert(matchCards).values([
      { appearanceId: a, kind: 'geel', matchId, minute: null, ours: true },
      { appearanceId: b, kind: 'geel', matchId, minute: 60, ours: true },
    ])
    await database.db.insert(matchGoals).values([
      { matchId, minute: null, ours: true, player: 'Onbekend' },
      { matchId, minute: 70, ours: true, player: 'Late' },
      { matchId, minute: 12, ours: true, player: 'Eerste' },
    ])

    const stored = (await readMatchReport(database.db, matchId))!

    expect(stored.goals.map((row) => [row.player, row.minute])).toEqual([
      ['Eerste', 12],
      ['Late', 70],
      ['Onbekend', null],
    ])
    expect(stored.cards.map((row) => row.minute)).toEqual([60, null])
    expect(reportForRules(stored).goals.map((goal) => goal.minute)).toEqual([12, 70, null])
    expect(reportForRules(stored).cards.map((card) => card.minute)).toEqual([60, null])
  })

  it('gives the report in the shape of the rules', async () => {
    const matchId = await playedMatch()

    await report(matchId, 'bezig')

    const a = await appearance(matchId, { captain: true, name: 'A', shirtNumber: 7 })

    await database.db
      .insert(matchGoals)
      .values({ appearanceId: a, matchId, minute: 5, ours: true, penalty: true, player: 'A' })

    const stored = await readMatchReport(database.db, matchId)

    expect(reportForRules(stored!)).toEqual({
      appearances: [{ captain: true, id: a, name: 'A', ours: true, shirtNumber: 7, starter: true }],
      cards: [],
      formations: { opponent: null, ours: null },
      goals: [
        {
          appearanceId: a,
          assistId: null,
          minute: 5,
          ours: true,
          ownGoal: false,
          penalty: true,
          stoppageMinutes: null,
        },
      ],
      incidents: [],
      opponentComplete: true,
      shootout: [],
      status: 'bezig',
      substitutions: [],
    })
    expect(
      matchForRules({
        extraTime: false,
        goalsAgainst: 0,
        goalsFor: 1,
        penaltiesAgainst: null,
        penaltiesFor: null,
        status: 'played',
      }),
    ).toEqual({
      extraTime: false,
      goalsAgainst: 0,
      goalsFor: 1,
      penaltiesAgainst: null,
      penaltiesFor: null,
      status: 'played',
    })
  })
})

describe('the matches of a season with the status of their report', () => {
  it('gives every match of the season in the order of the day, with bezig, klaar or nothing', async () => {
    const klaar = await playedMatch({ matchDate: '2026-08-08', round: 'Speelronde 1' })
    const bezig = await playedMatch({ matchDate: '2026-08-15', round: 'Speelronde 2' })
    const none = await playedMatch({ matchDate: '2026-08-22', round: 'Speelronde 3' })
    const other = await playedMatch({ matchDate: '2025-08-22', round: 'Speelronde 1', season: '2025/26' })

    await report(klaar, 'klaar')
    await report(bezig, 'bezig')
    await report(other, 'klaar')

    const list = await listSeasonReports(database.db, season)

    expect(list.map((row) => [row.id, row.reportStatus])).toEqual([
      [klaar, 'klaar'],
      [bezig, 'bezig'],
      [none, null],
    ])
    expect(list[0]).toMatchObject({ competition: 'Eredivisie', opponent: 'Testdorp FC', round: 'Speelronde 1' })
  })
})

describe('the numbers of the players from the reports', () => {
  /** Two matches with a report that is klaar, and one that is bezig, for two players. */
  async function season3() {
    const oyen = await player('Luca Oyen', 9)
    const vos = await player('Sander Vos', 10)
    const bank = await player('Jan Bank', 14)
    const first = await playedMatch({ goalsAgainst: 0, goalsFor: 1, round: 'Speelronde 1' })
    const second = await playedMatch({
      competition: 'KNVB Beker',
      goalsAgainst: 0,
      goalsFor: 1,
      matchDate: '2026-08-15',
      round: 'Eerste ronde',
    })
    const third = await playedMatch({ goalsAgainst: 0, goalsFor: 1, matchDate: '2026-08-22', round: 'Speelronde 3' })

    for (const matchId of [first, second]) {
      await report(matchId)
    }

    await report(third, 'bezig')

    // First match: Oyen scores, Vos gives the assist and goes off at 60, Bank comes on for him
    // and is booked, an opponent scores an own goal that does not count for Oyen.
    const o1 = await appearance(first, { name: 'Luca Oyen', playerId: oyen, shirtNumber: 9 })
    const v1 = await appearance(first, { name: 'Sander Vos', playerId: vos, shirtNumber: 10 })
    const b1 = await appearance(first, { name: 'Jan Bank', playerId: bank, shirtNumber: 14, starter: false })
    const x1 = await appearance(first, { name: 'Gijs Test', ours: false, shirtNumber: 4 })

    await database.db
      .insert(matchSubstitutions)
      .values({ appearanceInId: b1, appearanceOutId: v1, matchId: first, minute: 60, ours: true })
    await database.db.insert(matchCards).values([
      { appearanceId: b1, kind: 'geel', matchId: first, minute: 70, ours: true },
      { appearanceId: x1, kind: 'rood', matchId: first, minute: 80, ours: false },
    ])
    await database.db
      .insert(matchGoals)
      .values({ appearanceId: o1, assistAppearanceId: v1, matchId: first, minute: 12, ours: true, player: 'Oyen' })

    // Second match, in the cup: Oyen is sent off with a yellow-red card at 70.
    const o2 = await appearance(second, { name: 'Luca Oyen', playerId: oyen, shirtNumber: 9 })

    await database.db.insert(matchCards).values([
      { appearanceId: o2, kind: 'geel', matchId: second, minute: 20, ours: true },
      { appearanceId: o2, kind: 'geel-rood', matchId: second, minute: 70, ours: true },
    ])
    await database.db
      .insert(matchGoals)
      .values({ appearanceId: o2, matchId: second, minute: 30, ours: true, penalty: true, player: 'Oyen' })

    // Third match is bezig and counts for nobody.
    const o3 = await appearance(third, { name: 'Luca Oyen', playerId: oyen, shirtNumber: 9 })

    await database.db
      .insert(matchGoals)
      .values({ appearanceId: o3, matchId: third, minute: 5, ours: true, player: 'Oyen' })

    return { bank, first, oyen, second, vos }
  }

  const zero = {
    assists: 0,
    goals: 0,
    matches: 0,
    minutes: 0,
    personFamilyName: null,
    personFamilyNamePrefix: null,
    personGivenName: null,
    personSlug: null,
    redCards: 0,
    starts: 0,
    substitutions: 0,
    yellowCards: 0,
    yellowRedCards: 0,
  }

  it('adds up the matches, the line-ups, the substitutions, the minutes, the goals, the assists and the cards', async () => {
    const { bank, oyen, vos } = await season3()

    expect(await readPlayerReportStats(database.db, season)).toEqual([
      { ...zero, matches: 1, minutes: 30, name: 'Jan Bank', playerId: bank, substitutions: 1, yellowCards: 1 },
      {
        ...zero,
        goals: 2,
        matches: 2,
        minutes: 160,
        name: 'Luca Oyen',
        playerId: oyen,
        starts: 2,
        yellowCards: 1,
        yellowRedCards: 1,
      },
      { ...zero, assists: 1, matches: 1, minutes: 60, name: 'Sander Vos', playerId: vos, starts: 1 },
    ])
  })

  it('counts a competition on its own', async () => {
    const { oyen } = await season3()

    expect(await readPlayerReportStats(database.db, season, 'KNVB Beker')).toEqual([
      {
        ...zero,
        goals: 1,
        matches: 1,
        minutes: 70,
        name: 'Luca Oyen',
        playerId: oyen,
        starts: 1,
        yellowCards: 1,
        yellowRedCards: 1,
      },
    ])
    expect(await readPlayerReportStats(database.db, season, 'Play-offs Conference League')).toEqual([])
  })

  it('does not count a match that is bezig, and only the matches of the season', async () => {
    const { first } = await season3()

    await database.db.update(matchReports).set({ status: 'bezig' }).where(eq(matchReports.matchId, first))

    const names = (await readPlayerReportStats(database.db, season)).map((row) => row.name)

    expect(names).toEqual(['Luca Oyen'])
    expect(await readPlayerReportStats(database.db, '2025/26')).toEqual([])
  })

  it('does not count an own goal as a goal, and leaves out a player who is no longer in players', async () => {
    const { first, oyen } = await season3()
    const [theirs] = await database.db
      .select()
      .from(matchAppearances)
      .where(eq(matchAppearances.matchId, first))
      .then((rows) => rows.filter((row) => !row.ours))
    const [goal] = await database.db.select().from(matchGoals).where(eq(matchGoals.matchId, first))

    await database.db
      .update(matchGoals)
      .set({ appearanceId: theirs!.id, assistAppearanceId: null, ours: true, ownGoal: true })
      .where(eq(matchGoals.id, goal!.id))
    await database.db.delete(players).where(eq(players.id, oyen))

    const found = await readPlayerReportStats(database.db, season)

    expect(found.map((row) => [row.name, row.goals])).toEqual([
      ['Jan Bank', 0],
      ['Sander Vos', 0],
    ])
  })

  it('gives a player of the bench who did not come on an entry with zeros, and a player of the opponent none', async () => {
    const matchId = await playedMatch()
    const bench = await player('Jan Bank', 14)

    await report(matchId)
    await appearance(matchId, { name: 'Jan Bank', playerId: bench, shirtNumber: 14, starter: false })
    await appearance(matchId, { name: 'Gijs Test', ours: false, shirtNumber: 4, starter: false })

    expect(await readPlayerReportStats(database.db, season)).toEqual([{ ...zero, name: 'Jan Bank', playerId: bench }])
  })

  it('gives the name of the person behind a player in parts, for the player who has one', async () => {
    const matchId = await playedMatch()
    const [person] = await database.db
      .insert(persons)
      .values({
        familyName: 'Aken',
        familyNamePrefix: 'van',
        givenName: 'Joost',
        name: 'Joost van Aken',
        wikipediaPage: 'Joost van Aken',
      })
      .$returningId()
    const [inserted] = await database.db
      .insert(players)
      .values({ name: 'Joost van Aken', personId: person!.id, searchTerm: 'van Aken', season, shirtNumber: 4 })
      .$returningId()

    await report(matchId)
    await appearance(matchId, { name: 'Joost van Aken', playerId: inserted!.id, shirtNumber: 4 })

    expect(await readPlayerReportStats(database.db, season)).toMatchObject([
      {
        personFamilyName: 'Aken',
        personFamilyNamePrefix: 'van',
        personGivenName: 'Joost',
        personSlug: null,
        playerId: inserted!.id,
      },
    ])
  })

  it('gives nothing when no match has a report', async () => {
    await playedMatch()

    expect(await readPlayerReportStats(database.db, season)).toEqual([])
  })
})

describe('the made-up report of the seed', () => {
  async function seeded(order: ('matches' | 'squad')[]) {
    const now = new Date()

    for (const step of order) {
      await (step === 'matches' ? seedMatches(database.db, now) : seedSquad(database.db, now))
    }

    const [match] = await database.db
      .select()
      .from(matches)
      .where(eq(matches.round, madeUpReportMatch.round))
      .then((rows) => rows.filter((row) => row.season === seasonOf(now) && row.competition === 'Eredivisie'))

    return match!
  }

  it('gets through the rules without an error or a warning, for both teams', async () => {
    const match = await seeded(['matches', 'squad'])
    const stored = await readMatchReport(database.db, match.id)

    expect(stored).toBeDefined()
    expect(stored?.report).toMatchObject({
      formationOpponent: '4-4-2',
      formationOurs: '4-3-3',
      opponentComplete: true,
      status: 'klaar',
    })
    expect(reportForRules(stored!).formations).toEqual({ opponent: '4-4-2', ours: '4-3-3' })
    expect(checkMatchReport(reportForRules(stored!), matchForRules(match))).toEqual({ errors: [], warnings: [] })
  })

  it('has a line-up, a bench, substitutions, cards, an assist and a missed penalty', async () => {
    const match = await seeded(['matches', 'squad'])
    const stored = (await readMatchReport(database.db, match.id))!
    const startersOf = (ours: boolean) => stored.appearances.filter((row) => row.ours === ours && row.starter).length

    expect([startersOf(true), startersOf(false)]).toEqual([11, 11])
    expect(stored.appearances.filter((row) => row.ours && row.playerId !== null)).toHaveLength(18)
    expect(stored.appearances.filter((row) => !row.ours).every((row) => row.playerId === null)).toBe(true)
    expect(stored.substitutions.length).toBeGreaterThanOrEqual(2)
    expect(stored.substitutions.map((row) => row.ours)).toEqual(expect.arrayContaining([true, false]))
    expect(stored.cards.map((row) => row.kind)).toEqual(expect.arrayContaining(['geel', 'geel-rood', 'rood']))
    expect(stored.incidents.map((row) => row.kind).toSorted()).toEqual(['strafschop-gemist', 'strafschop-gestopt'])
    expect(stored.goals.every((row) => row.appearanceId !== null && row.assistAppearanceId !== null)).toBe(true)
  })

  it('is the same whichever of the matches and the squad is seeded first, and does not double when it runs again', async () => {
    const match = await seeded(['squad', 'matches'])

    expect(
      checkMatchReport(reportForRules((await readMatchReport(database.db, match.id))!), matchForRules(match)),
    ).toEqual({ errors: [], warnings: [] })

    await seedMatches(database.db)
    await seedSquad(database.db)

    expect(await count('match_reports')).toBe(2)
    expect(await count('match_appearances')).toBe(67)
    expect(await count('match_shootout_kicks')).toBe(10)
  })

  it('has numbers for the players from it, and counts only the report that is klaar', async () => {
    await seeded(['matches', 'squad'])

    const stats = await readPlayerReportStats(database.db, seasonOf(new Date()))
    const demo = stats.find((row) => row.name === 'Rick Demo')

    expect(demo).toMatchObject({ assists: 1, goals: 2, matches: 1, minutes: 90, starts: 1 })
    expect(stats.find((row) => row.name === 'Gerrit Nepper')).toMatchObject({
      assists: 1,
      goals: 1,
      minutes: 30,
      substitutions: 1,
    })
    expect(
      (await readPlayerReportStats(database.db, seasonOf(new Date()), 'Eredivisie')).find(
        (row) => row.name === 'Daan Boerema',
      ),
    ).toMatchObject({ minutes: 70, yellowCards: 1, yellowRedCards: 1 })
  })

  it('has a report of the cup tie with extra time, minutes up to 120 and a shoot-out that gets through the rules', async () => {
    const now = new Date()

    await seedMatches(database.db, now)
    await seedSquad(database.db, now)

    const [match] = await database.db
      .select()
      .from(matches)
      .where(eq(matches.round, madeUpCupReportMatch.round))
      .then((rows) => rows.filter((row) => row.season === seasonOf(now) && row.competition === 'KNVB Beker'))
    const stored = (await readMatchReport(database.db, match!.id))!
    const hits = (ours: boolean) =>
      stored.shootout.filter((kick) => kick.ours === ours && kick.outcome === 'raak').length

    expect(match).toMatchObject({ extraTime: true, penaltiesAgainst: 3, penaltiesFor: 4 })
    expect(stored.report).toMatchObject({ opponentComplete: true, status: 'klaar' })
    expect(checkMatchReport(reportForRules(stored), matchForRules(match!))).toEqual({ errors: [], warnings: [] })
    expect(
      Math.max(...stored.cards.map((card) => card.minute ?? 0), ...stored.substitutions.map((sub) => sub.minute)),
    ).toBe(120)
    expect([hits(true), hits(false)]).toEqual([4, 3])
    expect(stored.shootout.map((kick) => [kick.round, kick.ours, kick.outcome])).toEqual([
      [1, true, 'raak'],
      [1, false, 'raak'],
      [2, true, 'raak'],
      [2, false, 'gestopt'],
      [3, true, 'naast'],
      [3, false, 'raak'],
      [4, true, 'raak'],
      [4, false, 'naast'],
      [5, true, 'raak'],
      [5, false, 'raak'],
    ])
  })

  it('does not count a kick of the shoot-out as a goal, as minutes or as a match', async () => {
    const now = new Date()

    await seedMatches(database.db, now)
    await seedSquad(database.db, now)

    const cup = await readPlayerReportStats(database.db, seasonOf(now), 'KNVB Beker')

    // Altena kicks and scores, and came on in minute 62: 58 minutes, and no goal.
    expect(cup.find((row) => row.name === 'Sjoerd Altena')).toMatchObject({ goals: 0, matches: 1, minutes: 58 })
    expect(cup.find((row) => row.name === 'Mick van Wieren')).toMatchObject({ goals: 0, minutes: 10 })
    expect(cup.find((row) => row.name === 'Jan van der Voorbeeldstraat-Proefmans')).toMatchObject({
      assists: 0,
      goals: 1,
      minutes: 120,
    })
    expect(cup.reduce((sum, row) => sum + row.goals, 0)).toBe(1)
  })
})

describe('reading the shoot-out of a report', () => {
  /** A cup match decided on penalties, with a report and the kicks of both teams. */
  async function shootoutMatch(status: 'bezig' | 'klaar' = 'klaar') {
    const matchId = await playedMatch({
      competition: 'KNVB Beker',
      extraTime: true,
      goalsAgainst: 1,
      goalsFor: 1,
      penaltiesAgainst: 3,
      penaltiesFor: 4,
    })
    const oyen = await player('Luca Oyen', 9)

    await report(matchId, status)

    const ours = await appearance(matchId, { name: 'Luca Oyen', playerId: oyen, shirtNumber: 9 })
    const theirs = await appearance(matchId, { name: 'Gijs Test', ours: false, shirtNumber: 7 })

    // Written in a mixed order, to see that the reader sorts them.
    await database.db.insert(matchShootoutKicks).values([
      { appearanceId: null, matchId, ours: false, outcome: 'gestopt', round: 2 },
      { appearanceId: theirs, matchId, ours: false, outcome: 'naast', round: 1 },
      { appearanceId: ours, matchId, ours: true, outcome: 'raak', round: 2 },
      { appearanceId: ours, matchId, ours: true, outcome: 'raak', round: 1 },
    ])

    return { matchId, ours, theirs }
  }

  it('gives the kicks of the report in the order of the rounds, our kick before the opponent in a round', async () => {
    const { matchId, ours, theirs } = await shootoutMatch()
    const stored = await readMatchReport(database.db, matchId)

    expect(stored?.shootout.map((kick) => [kick.round, kick.ours, kick.appearanceId, kick.outcome])).toEqual([
      [1, true, ours, 'raak'],
      [1, false, theirs, 'naast'],
      [2, true, ours, 'raak'],
      [2, false, null, 'gestopt'],
    ])
  })

  it('gives the kicks to the page of the match too, with the name of the player as the rest of the report has it', async () => {
    const { matchId, ours } = await shootoutMatch()
    const [found] = await listReportedMatches(database.db, season)

    expect(found?.match.id).toBe(matchId)
    expect(found?.stored.shootout).toHaveLength(4)
    expect(found?.stored.appearances.find((player) => player.id === ours)?.name).toBe('Luca Oyen')
    expect(found?.names.get(ours)?.searchTerm).toBe('Luca Oyen')
    expect(
      (await findReportedMatch(database.db, { clubSlug: 'testdorp-fc', matchDate: '2026-08-08', season }))?.stored
        .shootout,
    ).toHaveLength(4)
  })

  it('gives the kicks in the shape of the rules, and has no kicks for a report without any', async () => {
    const { matchId } = await shootoutMatch()
    const empty = await playedMatch({ matchDate: '2026-08-15', opponent: 'Andere FC', round: 'Speelronde 2' })

    await report(empty)

    expect(reportForRules((await readMatchReport(database.db, matchId))!).shootout).toHaveLength(4)
    expect(reportForRules((await readMatchReport(database.db, matchId))!).shootout?.[3]).toEqual({
      appearanceId: null,
      ours: false,
      outcome: 'gestopt',
      round: 2,
    })
    expect((await readMatchReport(database.db, empty))?.shootout).toEqual([])
  })

  it('leaves the numbers of the players alone', async () => {
    const { matchId } = await shootoutMatch()
    const before = await readPlayerReportStats(database.db, season)

    await database.db.delete(matchShootoutKicks).where(eq(matchShootoutKicks.matchId, matchId))

    expect(await readPlayerReportStats(database.db, season)).toEqual(before)
    expect(before).toMatchObject([{ goals: 0, name: 'Luca Oyen' }])
  })
})

describe('the goals of the reports against the squad table of Wikipedia', () => {
  /** One match in the league with a report that is klaar: Oyen scores. */
  async function oneMatch(status: 'bezig' | 'klaar' = 'klaar') {
    const oyen = await player('Luca Oyen', 9)
    const vos = await player('Sander Vos', 10)
    const matchId = await playedMatch()

    await report(matchId, status)

    const o = await appearance(matchId, { name: 'Luca Oyen', playerId: oyen, shirtNumber: 9 })

    await database.db.insert(matchGoals).values({ appearanceId: o, matchId, minute: 12, ours: true, player: 'Oyen' })

    return { matchId, oyen, vos }
  }

  const table = (playerId: number, goals: number, competition: 'Eredivisie' | 'KNVB Beker' = 'Eredivisie') =>
    database.db.insert(playerSeasonStats).values({ appearances: 1, assists: 0, competition, goals, playerId, season })

  it('finds a player whose goals differ, and counts a player the table has not as 0 there', async () => {
    const { oyen, vos } = await oneMatch()

    await table(oyen, 2)
    await table(vos, 1)

    expect(await findReportGoalDifferences(database.db, season)).toEqual([
      { competition: 'Eredivisie', fromReports: 1, fromWikipedia: 2, name: 'Luca Oyen', playerId: oyen },
      { competition: 'Eredivisie', fromReports: 0, fromWikipedia: 1, name: 'Sander Vos', playerId: vos },
    ])
  })

  it('finds nothing when the numbers agree', async () => {
    const { oyen, vos } = await oneMatch()

    await table(oyen, 1)
    await table(vos, 0)

    expect(await findReportGoalDifferences(database.db, season)).toEqual([])
  })

  it('compares a competition only when every played match of it has a report that is klaar', async () => {
    const { oyen } = await oneMatch()

    await table(oyen, 5)
    // A second match of the league has no report: the reports are expected to have fewer goals.
    await playedMatch({ matchDate: '2026-08-15', round: 'Speelronde 2' })
    expect(await findReportGoalDifferences(database.db, season)).toEqual([])

    // A report that is bezig does not count either.
    await database.db.delete(matches).where(eq(matches.round, 'Speelronde 2'))
    await database.db.update(matchReports).set({ status: 'bezig' })
    expect(await findReportGoalDifferences(database.db, season)).toEqual([])
  })

  it('compares each competition on its own, and nothing when the table has no numbers for it', async () => {
    const { oyen } = await oneMatch()

    await playedMatch({ competition: 'KNVB Beker', matchDate: '2026-08-15', round: 'Eerste ronde' })
    // The league is compared and agrees; the cup has no report; there is no table for another.
    await table(oyen, 1)
    expect(await findReportGoalDifferences(database.db, season)).toEqual([])
    expect(await findReportGoalDifferences(database.db, '2025/26')).toEqual([])
  })
})

describe('a match that is still being played', () => {
  /** A match that is still `scheduled`, without a result, and its id. */
  const scheduledMatch = (values: Partial<NewMatch> = {}) =>
    playedMatch({ goalsAgainst: null, goalsFor: null, status: 'scheduled', ...values })

  it('has a page with its report, in the list and by its address, in the order of the day', async () => {
    const live = await scheduledMatch({ matchDate: '2026-08-15', round: 'Speelronde 2' })
    const played = await playedMatch()

    await report(live, 'bezig')
    await report(played)

    expect((await listReportedMatches(database.db, season)).map((row) => row.match.id)).toEqual([played, live])
    expect(
      (await findReportedMatch(database.db, { clubSlug: 'testdorp-fc', matchDate: '2026-08-15', season }))?.match
        .status,
    ).toBe('scheduled')
  })

  it('may have a report from its day on, in Dutch time, and only when it is played or scheduled', () => {
    const at = (text: string) => new Date(text)
    const match = { matchDate: '2026-08-08', status: 'scheduled' } as const

    // 8 August 00:30 in the Netherlands is 7 August 22:30 in UTC.
    expect(mayHaveReport(match, at('2026-08-07T22:30:00Z'))).toBe(true)
    expect(mayHaveReport(match, at('2026-08-07T21:30:00Z'))).toBe(false)
    expect(mayHaveReport(match, at('2026-08-20T12:00:00Z'))).toBe(true)
    expect(mayHaveReport({ ...match, status: 'played' }, at('2020-01-01T00:00:00Z'))).toBe(true)
    expect(mayHaveReport({ ...match, status: 'postponed' }, at('2026-08-08T12:00:00Z'))).toBe(false)
    expect(mayHaveReport({ ...match, status: 'cancelled' }, at('2026-08-08T12:00:00Z'))).toBe(false)
  })

  it('is upcoming before its kick-off, live from it, and has no phase when it was played', () => {
    const kickoffAt = new Date('2026-08-08T16:45:00Z')
    const match = { kickoffAt, matchDate: '2026-08-08', status: 'scheduled' } as const

    expect(phaseOf(match, new Date('2026-08-08T16:44:59Z'))).toBe('upcoming')
    expect(phaseOf(match, kickoffAt)).toBe('live')
    expect(phaseOf(match, new Date('2026-08-08T19:00:00Z'))).toBe('live')
    expect(phaseOf({ ...match, status: 'played' }, kickoffAt)).toBeUndefined()
  })

  it('is live on the day of a match without a known kick-off, in Dutch time', () => {
    const match = { kickoffAt: null, matchDate: '2026-08-08', status: 'scheduled' } as const

    expect(phaseOf(match, new Date('2026-08-07T21:59:00Z'))).toBe('upcoming')
    expect(phaseOf(match, new Date('2026-08-07T22:00:00Z'))).toBe('live')
  })

  it('keeps its goals out of the goals the pages count, while the report still has them', async () => {
    const live = await scheduledMatch({ round: 'Live' })
    const played = await playedMatch({ matchDate: '2026-08-15', round: 'Gespeeld' })

    for (const matchId of [live, played]) {
      await report(matchId, 'bezig')
      await database.db.insert(matchGoals).values({ matchId, minute: 10, ours: true, player: 'Luca Oyen' })
    }

    const shown = await listSeasonMatches(database.db, season)

    expect(shown.find((match) => match.round === 'Live')?.goals).toEqual([])
    expect(shown.find((match) => match.round === 'Gespeeld')?.goals).toHaveLength(1)
    expect((await readMatchReport(database.db, live))?.goals).toHaveLength(1)
  })

  it('is in no read of the goals: not the matches of a club, not all the goals, not the numbers of a player', async () => {
    const live = await scheduledMatch({ round: 'Live' })
    const oyen = await player('Luca Oyen', 9)

    // Even a report that is klaar (which the rules refuse) would not count for a match that
    // is not played.
    await report(live)
    await appearance(live, { name: 'Luca Oyen', playerId: oyen, shirtNumber: 9 })
    await database.db.insert(matchGoals).values({ matchId: live, minute: 10, ours: true, player: 'Luca Oyen' })

    const [{ clubId }] = (await database.db.select({ clubId: matches.clubId }).from(matches)) as [{ clubId: number }]

    expect((await listClubMatches(database.db, clubId)).flatMap((match) => match.goals)).toEqual([])
    expect((await listAllMatchGoals(database.db)).flatMap((match) => match.goals)).toEqual([])
    expect(await readPlayerReportStats(database.db, season)).toEqual([])
    expect(await findReportGoalDifferences(database.db, season)).toEqual([])
  })
})

describe('the matches with a report that is klaar', () => {
  it('gives the match with its report, the slug of the opponent and the names of our players', async () => {
    const matchId = await playedMatch()
    const oyen = await player('Luca Oyen', 9)

    await database.db.update(players).set({ searchTerm: 'Oyen' }).where(eq(players.id, oyen))
    await report(matchId)
    await appearance(matchId, { name: 'Luca Oyen', playerId: oyen, shirtNumber: 9 })
    await appearance(matchId, { name: 'Gijs Test', ours: false, shirtNumber: 1 })

    const found = await findReportedMatch(database.db, { clubSlug: 'testdorp-fc', matchDate: '2026-08-08', season })

    expect(found?.match).toMatchObject({ id: matchId, opponent: 'Testdorp FC', round: 'Speelronde 1' })
    expect(found?.clubSlug).toBe('testdorp-fc')
    expect(found?.stored.appearances.map((row) => row.name)).toEqual(['Luca Oyen', 'Gijs Test'])
    expect([...(found?.names.values() ?? [])]).toEqual([
      { familyName: null, familyNamePrefix: null, givenName: null, searchTerm: 'Oyen', slug: null },
    ])
  })

  it('finds a match by its season, its day and its opponent, and nothing else', async () => {
    const matchId = await playedMatch()

    await report(matchId)

    const find = (values: { clubSlug?: string; matchDate?: string; season?: string }) =>
      findReportedMatch(database.db, { clubSlug: 'testdorp-fc', matchDate: '2026-08-08', season, ...values })

    expect(await find({})).toBeDefined()
    expect(await find({ clubSlug: 'andere-club' })).toBeUndefined()
    expect(await find({ matchDate: '2026-08-09' })).toBeUndefined()
    expect(await find({ season: '2025/26' })).toBeUndefined()
  })

  it('leaves out a match without a report and one that is called off, and has one that is bezig with its status', async () => {
    const none = await playedMatch({ round: 'Speelronde 1' })
    const bezig = await playedMatch({ matchDate: '2026-08-15', round: 'Speelronde 2' })
    const klaar = await playedMatch({ matchDate: '2026-08-22', round: 'Speelronde 3' })
    const postponed = await playedMatch({
      goalsAgainst: null,
      goalsFor: null,
      matchDate: '2026-08-29',
      round: 'Speelronde 4',
      status: 'postponed',
    })

    await report(bezig, 'bezig')
    await report(klaar)
    await report(postponed)

    const list = await listReportedMatches(database.db, season)

    expect(list.map((row) => [row.match.id, row.stored.report.status])).toEqual([
      [bezig, 'bezig'],
      [klaar, 'klaar'],
    ])
    expect(none).toBeDefined()
    expect(
      (await findReportedMatch(database.db, { clubSlug: 'testdorp-fc', matchDate: '2026-08-15', season }))?.stored
        .report.status,
    ).toBe('bezig')
    expect(await findReportedMatch(database.db, { clubSlug: 'testdorp-fc', matchDate: '2026-08-01', season })).toBe(
      undefined,
    )
  })

  it('gives the matches of a season in the order they were played, and no other season', async () => {
    const second = await playedMatch({ matchDate: '2026-08-15', round: 'Speelronde 2' })
    const first = await playedMatch({ matchDate: '2026-08-08', round: 'Speelronde 1' })
    const other = await playedMatch({ matchDate: '2025-08-15', round: 'Speelronde 1', season: '2025/26' })

    for (const id of [second, first, other]) {
      await report(id)
    }

    expect((await listReportedMatches(database.db, season)).map((row) => row.match.id)).toEqual([first, second])
  })
})
