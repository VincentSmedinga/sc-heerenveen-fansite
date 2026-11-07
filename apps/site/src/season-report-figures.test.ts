import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { readPlayerReportStats } from '@fansite/db/match-reports'
import {
  matchAppearances,
  matchCards,
  matches,
  matchGoals,
  matchReports,
  matchSubstitutions,
  type NewMatch,
  players,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { figureRows, rankedPlaces } from './report-figures'
import { getSeasonReportFigures, seasonHasReports } from './season-report-figures'

vi.mock('./database', () => ({ getDatabase: () => database }))
// Nothing is kept between the tests: each one makes its own season.
vi.mock('./cache', () => ({
  cacheForKey:
    <T>(_milliseconds: number, load: (key: string) => PromiseLike<T>) =>
    (key: string) =>
      Promise.resolve(load(key)),
}))

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const season = '2026/27'
const otherSeason = '2025/26'

beforeEach(async () => {
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM standings')
  await database.pool.query('DELETE FROM league_results')
})

async function appearance(matchId: number, name: string, playerId: number, starter = true) {
  const [inserted] = await database.db
    .insert(matchAppearances)
    .values({ matchId, name, ours: true, playerId, shirtNumber: playerId + 20, starter })
    .$returningId()

  return inserted!.id
}

/**
 * A season of five played matches: two in the league and one in the cup with a report that
 * is klaar, one in the league that is bezig, and one in the league without a report. Oyen
 * scores in the first with an assist of Vos, who goes off at 60 for Bank, who is booked; in
 * the cup Oyen gets a yellow and a yellow-red card; in the third match Oyen scores again,
 * which does not count.
 */
async function aSeason() {
  const oyen = await player('Luca Oyen', 9)
  const vos = await player('Sander Vos', 10)
  const bank = await player('Jan Bank', 14)
  const reserve = await player('Kees Reserve', 15)
  const first = await match({ round: 'Speelronde 1' })
  const second = await match({ competition: 'KNVB Beker', matchDate: '2026-08-15', round: 'Eerste ronde' })
  const third = await match({ matchDate: '2026-08-22', round: 'Speelronde 3' })
  const fourth = await match({ matchDate: '2026-08-29', round: 'Speelronde 4' })

  await match({ matchDate: '2026-09-05', round: 'Speelronde 5' })

  for (const [matchId, status] of [
    [first, 'klaar'],
    [second, 'klaar'],
    [third, 'bezig'],
  ] as const) {
    await database.db.insert(matchReports).values({ matchId, status })
  }

  const o1 = await appearance(first, 'Luca Oyen', oyen)
  const v1 = await appearance(first, 'Sander Vos', vos)
  const b1 = await appearance(first, 'Jan Bank', bank, false)

  await appearance(first, 'Kees Reserve', reserve, false)
  await database.db
    .insert(matchSubstitutions)
    .values({ appearanceInId: b1, appearanceOutId: v1, matchId: first, minute: 60, ours: true })
  await database.db
    .insert(matchCards)
    .values({ appearanceId: b1, kind: 'geel', matchId: first, minute: 70, ours: true })
  await database.db
    .insert(matchGoals)
    .values({ appearanceId: o1, assistAppearanceId: v1, matchId: first, minute: 12, ours: true, player: 'Oyen' })

  const o2 = await appearance(second, 'Luca Oyen', oyen)

  await database.db.insert(matchCards).values([
    { appearanceId: o2, kind: 'geel', matchId: second, minute: 20, ours: true },
    { appearanceId: o2, kind: 'geel-rood', matchId: second, minute: 70, ours: true },
  ])

  const o3 = await appearance(third, 'Luca Oyen', oyen)

  await database.db
    .insert(matchGoals)
    .values({ appearanceId: o3, matchId: third, minute: 5, ours: true, player: 'Oyen' })

  return { bank, fourth, oyen, reserve, vos }
}

async function match(values: Partial<NewMatch>) {
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

async function player(name: string, shirtNumber: number) {
  const [inserted] = await database.db
    .insert(players)
    .values({ name, searchTerm: name, season, shirtNumber, source: 'selectie' })
    .$returningId()

  return inserted!.id
}

describe('getSeasonReportFigures', () => {
  it('gives the figures of the reports that are klaar, the same as the reading function of the database', async () => {
    const { bank, oyen, reserve, vos } = await aSeason()
    const figures = await getSeasonReportFigures(season, 'all')

    expect(figures.players).toEqual(await readPlayerReportStats(database.db, season))

    const byId = new Map(figures.players.map((stats) => [stats.playerId, stats]))

    // Oyen: a goal in the first match, in the second a yellow and a yellow-red card, and his
    // goal in the match that is bezig does not count. He played 90 + 70 minutes.
    expect(byId.get(oyen)).toMatchObject({
      goals: 1,
      matches: 2,
      minutes: 160,
      redCards: 0,
      starts: 2,
      yellowCards: 1,
      yellowRedCards: 1,
    })
    // Vos gave the assist and went off at 60; Bank came on, with 30 minutes and a yellow card.
    expect(byId.get(vos)).toMatchObject({ assists: 1, matches: 1, minutes: 60, starts: 1 })
    expect(byId.get(bank)).toMatchObject({ matches: 1, minutes: 30, substitutions: 1, yellowCards: 1 })
    // A player of the bench who did not come on is there, with zeros.
    expect(byId.get(reserve)).toMatchObject({ matches: 0, minutes: 0, starts: 0 })
  })

  it('says how many of the played matches it rests on', async () => {
    await aSeason()

    expect(await getSeasonReportFigures(season, 'all')).toMatchObject({ known: 2, played: 5, seasonHasReports: true })
  })

  it('counts the league alone for the choice of the Eredivisie, and all the competitions for the other', async () => {
    const { oyen } = await aSeason()
    const all = await getSeasonReportFigures(season, 'all')
    const league = await getSeasonReportFigures(season, 'league')

    expect(league).toMatchObject({ known: 1, played: 4, seasonHasReports: true })
    expect(league.players.find((stats) => stats.playerId === oyen)).toMatchObject({
      matches: 1,
      minutes: 90,
      yellowCards: 0,
      yellowRedCards: 0,
    })
    expect(all.players.find((stats) => stats.playerId === oyen)).toMatchObject({ matches: 2, minutes: 160 })
  })

  it('shows what the cards show: the places of the assists and the minutes and the rows of the table', async () => {
    const { vos } = await aSeason()
    const { players: found } = await getSeasonReportFigures(season, 'all')

    expect(rankedPlaces(found, 'assists', true).rows).toMatchObject([{ goals: 1, players: [{ id: vos }], position: 1 }])
    expect(rankedPlaces(found, 'minutes', true).rows.map((row) => row.goals)).toEqual([160, 60, 30])
    // A yellow-red card counts as a yellow and a red card in the table.
    expect(figureRows(found).find((row) => row.surname === 'Luca Oyen' || row.givenName === 'Luca Oyen')).toMatchObject(
      {
        red: 1,
        yellow: 2,
      },
    )
    expect(figureRows(found).map((row) => row.givenName)).toEqual([
      'Luca Oyen',
      'Sander Vos',
      'Jan Bank',
      'Kees Reserve',
    ])
  })

  it('does not count a report that is bezig, so a season with only such reports has none', async () => {
    const [matchId] = [await match({})]

    await database.db.insert(matchReports).values({ matchId, status: 'bezig' })

    expect(await getSeasonReportFigures(season, 'all')).toMatchObject({
      known: 0,
      played: 1,
      players: [],
      seasonHasReports: false,
    })
    expect(await seasonHasReports(season)).toBe(false)
  })

  it('has no report in an earlier season that has none, and does not mix seasons', async () => {
    await aSeason()
    await match({ matchDate: '2025-08-08', round: 'Speelronde 1', season: otherSeason })

    expect(await getSeasonReportFigures(otherSeason, 'all')).toMatchObject({
      known: 0,
      played: 1,
      players: [],
      seasonHasReports: false,
    })
    expect(await seasonHasReports(season)).toBe(true)
    expect(await seasonHasReports(otherSeason)).toBe(false)
  })
})
