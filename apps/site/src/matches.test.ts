import type { PublicMatch, PublicStandingsRow } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import {
  cleanSheetsOf,
  overviewOf,
  parseCleanSheetCount,
  scorersCoverage,
  standingsAround,
  topScorersOf,
  topScorersShown,
} from './matches'

const match = (round: string, status: PublicMatch['status'], matchDate: string): PublicMatch => ({
  competition: 'Eredivisie',
  dateText: null,
  extraTime: false,
  goals: [],
  goalsAgainst: status === 'played' ? 0 : null,
  goalsFor: status === 'played' ? 1 : null,
  home: true,
  kickoffAt: new Date(`${matchDate}T14:30:00Z`),
  matchDate,
  opponent: 'Testdorp FC',
  penaltiesAgainst: null,
  penaltiesFor: null,
  round,
  stadium: null,
  status,
})

const season = [
  match('Speelronde 1', 'played', '2026-08-01'),
  match('Speelronde 2', 'played', '2026-08-08'),
  match('Speelronde 3', 'played', '2026-08-15'),
  match('Speelronde 4', 'played', '2026-08-22'),
  match('Speelronde 5', 'postponed', '2026-08-29'),
  match('Speelronde 6', 'scheduled', '2026-09-05'),
  match('Speelronde 7', 'scheduled', '2026-09-12'),
]

describe('overviewOf', () => {
  it('puts the matches that are not played in the programme, in the order they are given, a postponed one included', () => {
    expect(overviewOf(season).programme.map((item) => item.round)).toEqual([
      'Speelronde 5',
      'Speelronde 6',
      'Speelronde 7',
    ])
  })

  it('gives the results with the newest first', () => {
    expect(overviewOf(season).results.map((item) => item.round)).toEqual([
      'Speelronde 4',
      'Speelronde 3',
      'Speelronde 2',
      'Speelronde 1',
    ])
  })

  it('gives the newest result as the previous match for the homepage', () => {
    expect(overviewOf(season).previous?.round).toBe('Speelronde 4')
    expect(overviewOf([match('Speelronde 5', 'postponed', '2026-08-29')]).previous).toBeUndefined()
  })

  it('takes the first match that is scheduled as the next one, and not a postponed match', () => {
    expect(overviewOf(season).next?.round).toBe('Speelronde 6')
  })

  it('has no next match when only a postponed one is left, and nothing at all for no matches', () => {
    expect(overviewOf([match('Speelronde 5', 'postponed', '2026-08-29')]).next).toBeUndefined()
    expect(overviewOf([])).toEqual({ next: undefined, previous: undefined, programme: [], results: [] })
  })

  it('does not change the list it is given', () => {
    const copy = [...season]

    overviewOf(season)

    expect(season).toEqual(copy)
  })
})

const row = (position: number, club: string): PublicStandingsRow => ({
  club,
  drawn: 0,
  goalDifference: 0,
  goalsAgainst: 0,
  goalsFor: 0,
  lost: 0,
  played: 0,
  points: 0,
  position,
  validOn: '2026-10-18',
  won: 0,
})

const table = ['Een', 'Twee', 'Drie', 'sc Heerenveen', 'Vijf', 'Zes', 'Zeven'].map((club, index) =>
  row(index + 1, club),
)

describe('standingsAround', () => {
  it('gives three clubs with sc Heerenveen in the middle', () => {
    expect(standingsAround(table).map((item) => item.club)).toEqual(['Drie', 'sc Heerenveen', 'Vijf'])
  })

  it('keeps the real positions', () => {
    expect(standingsAround(table).map((item) => item.position)).toEqual([3, 4, 5])
  })

  it('gives the first three when sc Heerenveen is first or second, so it is the middle one only if possible', () => {
    const first = [row(1, 'sc Heerenveen'), ...table.slice(0, 3).map((item) => row(item.position + 1, item.club))]
    const second = [row(1, 'Een'), row(2, 'sc Heerenveen'), row(3, 'Drie'), row(4, 'Vier')]

    expect(standingsAround(first).map((item) => item.club)).toEqual(['sc Heerenveen', 'Een', 'Twee'])
    expect(standingsAround(second).map((item) => item.club)).toEqual(['Een', 'sc Heerenveen', 'Drie'])
  })

  it('gives the last three when sc Heerenveen is last', () => {
    const last = [row(1, 'Een'), row(2, 'Twee'), row(3, 'Drie'), row(4, 'Vier'), row(5, 'sc Heerenveen')]

    expect(standingsAround(last).map((item) => item.club)).toEqual(['Drie', 'Vier', 'sc Heerenveen'])
  })

  it('gives the first three when sc Heerenveen is not in the table, and all of a short table', () => {
    expect(standingsAround(table.filter((item) => item.club !== 'sc Heerenveen')).map((item) => item.club)).toEqual([
      'Een',
      'Twee',
      'Drie',
    ])
    expect(standingsAround(table.slice(0, 2))).toHaveLength(2)
    expect(standingsAround([])).toEqual([])
  })
})

type Goal = PublicMatch['goals'][number]

const goal = (player: string, options: Partial<Goal> = {}): Goal => ({
  minute: 10,
  ours: true,
  ownGoal: false,
  penalty: false,
  player,
  stoppageMinutes: null,
  ...options,
})

/** A played match of ours with these goals, and the result they add up to. */
const played = (goals: Goal[]): PublicMatch => ({
  ...match('Speelronde 1', 'played', '2026-08-01'),
  goals,
  goalsAgainst: goals.filter((item) => !item.ours).length,
  goalsFor: goals.filter((item) => item.ours).length,
})

describe('topScorersOf', () => {
  it('counts the goals per player over all the matches, the most first', () => {
    const matches = [played([goal('Proefman'), goal('Nepper')]), played([goal('Proefman')])]

    expect(topScorersOf(matches)).toEqual([
      { goals: 2, player: 'Proefman', position: 1 },
      { goals: 1, player: 'Nepper', position: 2 },
    ])
  })

  it('counts a penalty as a goal of the player', () => {
    expect(topScorersOf([played([goal('Proefman', { penalty: true }), goal('Proefman')])])).toEqual([
      { goals: 2, player: 'Proefman', position: 1 },
    ])
  })

  it('does not count the own goal of an opponent for a player of ours, who has no goal from it', () => {
    expect(topScorersOf([played([goal('Teststraat', { ownGoal: true }), goal('Proefman')])])).toEqual([
      { goals: 1, player: 'Proefman', position: 1 },
    ])
  })

  it('does not count an own goal of ours for anybody, or a goal of the opponent for a player with the same name', () => {
    const own = goal('Proefman', { minute: 20, ours: false, ownGoal: true })
    const against = goal('Proefman', { minute: 30, ours: false })

    expect(topScorersOf([played([own, against, goal('Nepper')])])).toEqual([
      { goals: 1, player: 'Nepper', position: 1 },
    ])
  })

  it('puts level players on one place and in alphabetical order, and skips the places they take', () => {
    const matches = [
      played([goal('Zeta'), goal('Zeta'), goal('Beta'), goal('Beta'), goal('Alfa'), goal('Alfa'), goal('Gamma')]),
    ]

    expect(topScorersOf(matches).map((item) => [item.position, item.player, item.goals])).toEqual([
      [1, 'Alfa', 2],
      [1, 'Beta', 2],
      [1, 'Zeta', 2],
      [4, 'Gamma', 1],
    ])
  })

  it('is empty without goals, for a match without scorers and for no matches', () => {
    expect(topScorersOf([])).toEqual([])
    expect(topScorersOf([played([])])).toEqual([])
    expect(topScorersOf([played([goal('Teststraat', { ours: false })])])).toEqual([])
  })
})

describe('topScorersShown', () => {
  const scorers = (goals: number[]) =>
    goals.map((count, index) => ({ goals: count, player: `Speler ${index + 1}`, position: index + 1 }))

  it('shows the best five', () => {
    expect(topScorersShown(scorers([9, 8, 7, 6, 5, 4, 3])).map((item) => item.player)).toEqual([
      'Speler 1',
      'Speler 2',
      'Speler 3',
      'Speler 4',
      'Speler 5',
    ])
  })

  it('adds everybody level with the fifth, but not the sixth who has fewer', () => {
    expect(topScorersShown(scorers([9, 8, 7, 5, 5, 5, 5, 4]))).toHaveLength(7)
  })

  it('stops at eight rows when more players are level with the fifth', () => {
    expect(topScorersShown(scorers([9, 8, 7, 6, 2, 2, 2, 2, 2, 2]))).toHaveLength(8)
  })

  it('shows all of them with fewer than five, and nothing for nobody', () => {
    expect(topScorersShown(scorers([3, 1]))).toHaveLength(2)
    expect(topScorersShown([])).toEqual([])
  })
})

describe('scorersCoverage', () => {
  it('counts the played matches that have their scorers, or nothing of ours to name', () => {
    const noScorers = { ...played([]), goalsFor: 2 }
    const goalless = { ...played([]), goalsAgainst: 0, goalsFor: 0 }
    const lost = played([goal('Teststraat', { ours: false })])

    expect(scorersCoverage([played([goal('Proefman')]), noScorers, goalless, lost])).toEqual({ known: 3, played: 4 })
  })

  it('does not count matches that are not played yet', () => {
    expect(scorersCoverage([played([goal('Proefman')]), match('Speelronde 2', 'scheduled', '2026-08-08')])).toEqual({
      known: 1,
      played: 1,
    })
    expect(scorersCoverage([])).toEqual({ known: 0, played: 0 })
  })
})

describe('cleanSheetsOf', () => {
  const playedOn = (round: string, matchDate: string, goalsFor: number, goalsAgainst: number, home = true) => ({
    ...match(round, 'played', matchDate),
    goalsAgainst,
    goalsFor,
    home,
  })

  it('counts a 3–0 at home, a 1–0 away and a 0–0, and not a 0–1 away or a 2–1', () => {
    const matches = [
      playedOn('Speelronde 1', '2026-08-01', 3, 0),
      playedOn('Speelronde 2', '2026-08-08', 0, 1, false),
      playedOn('Speelronde 3', '2026-08-15', 1, 0, false),
      playedOn('Speelronde 4', '2026-08-22', 0, 0),
      playedOn('Speelronde 5', '2026-08-29', 2, 1),
    ]

    expect(cleanSheetsOf(matches).matches.map((item) => item.round)).toEqual([
      'Speelronde 4',
      'Speelronde 3',
      'Speelronde 1',
    ])
    expect(cleanSheetsOf(matches).played).toBe(5)
  })

  it('counts a match after extra time on its score, and a shoot-out not at all', () => {
    const afterExtraTime = { ...playedOn('Tweede ronde', '2026-09-23', 1, 0), extraTime: true }
    const shootOut = {
      ...playedOn('Derde ronde', '2026-10-28', 0, 0),
      extraTime: true,
      penaltiesAgainst: 5,
      penaltiesFor: 4,
    }

    expect(cleanSheetsOf([afterExtraTime, shootOut]).matches).toEqual([shootOut, afterExtraTime])
    expect(cleanSheetsOf([playedOn('Derde ronde', '2026-10-28', 1, 1)]).matches).toEqual([])
  })

  it('leaves out a match that is postponed or still to come, and a played match without a result', () => {
    const noResult = { ...match('Speelronde 9', 'played', '2026-10-01'), goalsAgainst: null, goalsFor: null }
    const matches = [
      playedOn('Speelronde 1', '2026-08-01', 1, 0),
      noResult,
      match('Speelronde 5', 'postponed', '2026-08-29'),
      match('Speelronde 6', 'scheduled', '2026-09-05'),
    ]

    expect(cleanSheetsOf(matches)).toEqual({ matches: [matches[0]], played: 1 })
  })

  it('gives nothing for a season without matches', () => {
    expect(cleanSheetsOf([])).toEqual({ matches: [], played: 0 })
  })
})

describe('parseCleanSheetCount', () => {
  it('gives the number in the address when it is ten or more, in steps of five', () => {
    expect(parseCleanSheetCount('10')).toBe(10)
    expect(parseCleanSheetCount('15')).toBe(15)
    expect(parseCleanSheetCount('40')).toBe(40)
  })

  it.each([undefined, ['15', '20'], '5', '12', '0', '-5', '1e1', '010', 'abc', '', '1000'])(
    'gives ten for %j',
    (value) => {
      expect(parseCleanSheetCount(value)).toBe(10)
    },
  )
})
