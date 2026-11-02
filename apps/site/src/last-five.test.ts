import type { PublicLeagueResult, PublicMatch, PublicStandingsRow } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import { hasEnoughLeagueResults, lastFiveOf, lastFiveStandings, leagueResultsOfAllClubs } from './last-five'

const result = (
  homeClub: string,
  homeGoals: number,
  awayGoals: number,
  awayClub: string,
  playedOn: string,
  round: number,
): PublicLeagueResult => ({ awayClub, awayGoals, homeClub, homeGoals, playedOn, round })

const ours = (overrides: Partial<PublicMatch>): PublicMatch => ({
  afterNinetyAgainst: null,
  afterNinetyFor: null,
  attendance: null,
  competition: 'Eredivisie',
  dateText: null,
  extraTime: false,
  goals: [],
  goalsAgainst: 0,
  goalsFor: 1,
  home: true,
  kickoffAt: null,
  matchDate: '2026-09-20',
  note: null,
  opponent: 'Ajax',
  penaltiesAgainst: null,
  penaltiesFor: null,
  referee: null,
  round: 'Speelronde 7',
  stadium: null,
  status: 'played',
  ...overrides,
})

const row = (club: string, played: number): PublicStandingsRow => ({
  club,
  drawn: 0,
  goalDifference: 0,
  goalsAgainst: 0,
  goalsFor: 0,
  lost: 0,
  played,
  points: 0,
  position: 1,
  validOn: '2026-10-18',
  won: 0,
})

const days = (count: number) =>
  Array.from({ length: count }, (_, index) => `2026-09-${String(index + 1).padStart(2, '0')}`)

describe('lastFiveStandings', () => {
  it('counts three points for a win and one for a draw, and orders on points', () => {
    const rows = lastFiveStandings(
      ['Ajax', 'FC Twente', 'PSV'],
      [result('Ajax', 2, 0, 'FC Twente', '2026-09-01', 1), result('PSV', 1, 1, 'Ajax', '2026-09-08', 2)],
    )

    expect(rows.map((r) => [r.position, r.club, r.points, r.played])).toEqual([
      [1, 'Ajax', 4, 2],
      [2, 'PSV', 1, 1],
      [3, 'FC Twente', 0, 1],
    ])
  })

  it('counts only the five matches played last, by day', () => {
    const results = days(7).map((day, index) =>
      result('Ajax', index === 0 ? 5 : 0, index === 0 ? 0 : 1, 'PSV', day, index + 1),
    )
    const [first, second] = lastFiveStandings(['Ajax', 'PSV'], results)

    // The first match, a big win for Ajax, is the sixth from the end and does not count.
    expect(second).toMatchObject({ club: 'Ajax', goalDifference: -5, played: 5, points: 0 })
    expect(first).toMatchObject({ club: 'PSV', goalDifference: 5, played: 5, points: 15 })
  })

  it('orders the matches of one day on the round, so the later round counts', () => {
    const results = [
      ...days(5).map((day, index) => result('Ajax', 1, 0, 'PSV', day, index + 1)),
      result('Ajax', 0, 3, 'PSV', '2026-09-05', 6),
    ]
    const rows = lastFiveStandings(['Ajax', 'PSV'], results)

    // On 5 September rounds 5 and 6 are played; round 1 drops out, round 6 stays.
    expect(rows.find((r) => r.club === 'Ajax')).toMatchObject({ goalsFor: 4, played: 5, points: 12 })
  })

  it('counts what a club has when it played fewer than five matches', () => {
    const rows = lastFiveStandings(['Ajax', 'PSV'], [result('Ajax', 1, 0, 'PSV', '2026-09-01', 1)])

    expect(rows.map((r) => r.played)).toEqual([1, 1])
  })

  it('decides a level table on goal difference', () => {
    const rows = lastFiveStandings(
      ['A', 'B', 'C', 'D'],
      [result('A', 3, 0, 'C', '2026-09-01', 1), result('B', 1, 0, 'D', '2026-09-01', 1)],
    )

    expect(rows.map((r) => r.club)).toEqual(['A', 'B', 'D', 'C'])
    expect(rows.slice(0, 2).map((r) => [r.club, r.goalDifference])).toEqual([
      ['A', 3],
      ['B', 1],
    ])
  })

  it('decides a level table with the same goal difference on goals for', () => {
    const rows = lastFiveStandings(
      ['A', 'B', 'C', 'D'],
      [result('A', 3, 2, 'C', '2026-09-01', 1), result('B', 1, 0, 'D', '2026-09-01', 1)],
    )

    expect(rows.slice(0, 2).map((r) => [r.club, r.goalsFor])).toEqual([
      ['A', 3],
      ['B', 1],
    ])
  })

  it('decides a table that is level in everything on the name from A to Z, with no shared places', () => {
    const rows = lastFiveStandings(
      ['Willem II', 'AZ', 'Ajax', 'FC Twente'],
      [result('Willem II', 1, 1, 'AZ', '2026-09-01', 1), result('Ajax', 1, 1, 'FC Twente', '2026-09-01', 1)],
    )

    expect(rows.map((r) => [r.position, r.club])).toEqual([
      [1, 'Ajax'],
      [2, 'AZ'],
      [3, 'FC Twente'],
      [4, 'Willem II'],
    ])
  })

  it('gives a club with no match no points and a place after the clubs with points', () => {
    const rows = lastFiveStandings(['Ajax', 'Idle', 'PSV'], [result('Ajax', 0, 1, 'PSV', '2026-09-01', 1)])

    expect(rows.map((r) => r.club)).toEqual(['PSV', 'Idle', 'Ajax'])
    expect(rows[1]).toMatchObject({ goalDifference: 0, played: 0, points: 0, position: 2 })
  })
})

describe('leagueResultsOfAllClubs', () => {
  it('takes the matches of sc Heerenveen from the matches and the others from the results', () => {
    const results = [
      result('sc Heerenveen', 2, 0, 'Ajax', '2026-09-20', 7),
      result('PSV', 1, 0, 'FC Twente', '2026-09-20', 7),
    ]
    const all = leagueResultsOfAllClubs([ours({ goalsAgainst: 1, goalsFor: 3 })], results)

    expect(all).toContainEqual(result('PSV', 1, 0, 'FC Twente', '2026-09-20', 7))
    expect(all).toContainEqual(result('sc Heerenveen', 3, 1, 'Ajax', '2026-09-20', 7))
    expect(all).toHaveLength(2)
  })

  it('writes an away match from the side of the home club', () => {
    const all = leagueResultsOfAllClubs([ours({ goalsAgainst: 2, goalsFor: 0, home: false })], [])

    expect(all).toEqual([result('Ajax', 2, 0, 'sc Heerenveen', '2026-09-20', 7)])
  })

  it('names the opponent as the results do, found through the round', () => {
    const all = leagueResultsOfAllClubs(
      [ours({ opponent: 'Excelsior' })],
      [result('sc Heerenveen', 1, 0, 'Excelsior Rotterdam', '2026-09-20', 7)],
    )

    expect(all.map((r) => r.awayClub)).toEqual(['Excelsior Rotterdam'])
  })

  it('leaves out a cup tie, a match that is not played and a match with no score', () => {
    const all = leagueResultsOfAllClubs(
      [
        ours({ competition: 'KNVB Beker' }),
        ours({ round: 'Speelronde 8', status: 'scheduled' }),
        ours({ goalsFor: null, round: 'Speelronde 9' }),
      ],
      [],
    )

    expect(all).toEqual([])
  })
})

describe('hasEnoughLeagueResults', () => {
  const table = [row('Ajax', 2), row('PSV', 1), row('FC Twente', 1)]
  const results = [result('Ajax', 2, 0, 'FC Twente', '2026-09-01', 1), result('PSV', 1, 1, 'Ajax', '2026-09-08', 2)]

  it('is true when every club has as many results as the table says it played', () => {
    expect(hasEnoughLeagueResults(table, results)).toBe(true)
  })

  it('is true when a club has one result fewer than the table says, because the pages are edited apart', () => {
    expect(hasEnoughLeagueResults(table, results.slice(0, 1))).toBe(true)
    expect(hasEnoughLeagueResults([row('Ajax', 2), row('PSV', 1), row('FC Twente', 2)], results)).toBe(true)
  })

  it('is false when a club has two results fewer, or more', () => {
    expect(hasEnoughLeagueResults([row('Ajax', 4), row('PSV', 1), row('FC Twente', 1)], results)).toBe(false)
    expect(hasEnoughLeagueResults([row('Ajax', 1), row('PSV', 1), row('FC Twente', 1)], results)).toBe(false)
  })

  it('is false when there are no results, or no table, or no match played', () => {
    expect(hasEnoughLeagueResults(table, [])).toBe(false)
    expect(hasEnoughLeagueResults([row('Ajax', 1), row('PSV', 1)], [])).toBe(false)
    expect(hasEnoughLeagueResults([], results)).toBe(false)
    expect(hasEnoughLeagueResults([row('Ajax', 0), row('PSV', 0)], [])).toBe(false)
  })

  it('is false when a result is of a club the table does not have', () => {
    expect(hasEnoughLeagueResults(table, [...results, result('Ajax', 1, 0, 'Vreemd', '2026-09-15', 3)])).toBe(false)
  })
})

describe('lastFiveOf', () => {
  it('is undefined when the results are incomplete, and the table otherwise', () => {
    const table = [row('Ajax', 1), row('sc Heerenveen', 1)]
    const results = [result('sc Heerenveen', 0, 0, 'Ajax', '2026-09-20', 7)]

    expect(lastFiveOf([], [], table)).toBeUndefined()
    expect(lastFiveOf([ours({ goalsFor: 2 })], results, table)?.rows.map((r) => [r.club, r.points])).toEqual([
      ['sc Heerenveen', 3],
      ['Ajax', 0],
    ])
  })

  it('names the day of the last result in our data, not the day of the table', () => {
    const table = [row('Ajax', 2), row('PSV', 2), row('sc Heerenveen', 1)]
    const results = [result('Ajax', 1, 0, 'PSV', '2026-09-20', 7), result('PSV', 1, 1, 'Ajax', '2026-10-04', 8)]

    expect(lastFiveOf([], results.slice(0, 1), table)?.lastResultOn).toBe('2026-09-20')
    expect(lastFiveOf([], results, table)?.lastResultOn).toBe('2026-10-04')
    expect(lastFiveOf([ours({ matchDate: '2026-10-11' })], results, table)?.lastResultOn).toBe('2026-10-11')
  })

  it('is undefined when no club has a result at all', () => {
    expect(
      lastFiveOf(
        [],
        [result('sc Heerenveen', 0, 0, 'Ajax', '2026-09-20', 7)],
        [row('Ajax', 1), row('sc Heerenveen', 1)],
      ),
    ).toBeUndefined()
  })
})
