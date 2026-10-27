import type { PublicMatch, PublicStandingsRow } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import {
  cleanSheetsOf,
  goalsPerQuarter,
  overviewOf,
  parseCleanSheetCount,
  scorersCoverage,
  standingsAround,
  topScorersOf,
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
  playerId: null,
  playerName: null,
  playerSearchTerm: null,
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
      { goals: 2, player: 'Proefman', playerId: null, position: 1, searchTerm: null },
      { goals: 1, player: 'Nepper', playerId: null, position: 2, searchTerm: null },
    ])
  })

  it('counts a penalty as a goal of the player', () => {
    expect(topScorersOf([played([goal('Proefman', { penalty: true }), goal('Proefman')])])).toEqual([
      { goals: 2, player: 'Proefman', playerId: null, position: 1, searchTerm: null },
    ])
  })

  it('does not count the own goal of an opponent for a player of ours, who has no goal from it', () => {
    expect(topScorersOf([played([goal('Teststraat', { ownGoal: true }), goal('Proefman')])])).toEqual([
      { goals: 1, player: 'Proefman', playerId: null, position: 1, searchTerm: null },
    ])
  })

  it('does not count an own goal of ours for anybody, or a goal of the opponent for a player with the same name', () => {
    const own = goal('Proefman', { minute: 20, ours: false, ownGoal: true })
    const against = goal('Proefman', { minute: 30, ours: false })

    expect(topScorersOf([played([own, against, goal('Nepper')])])).toEqual([
      { goals: 1, player: 'Nepper', playerId: null, position: 1, searchTerm: null },
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

  it('lists everybody who scored, however many players that is and however few goals they have', () => {
    const names = Array.from({ length: 20 }, (_, index) => `Speler ${String(index + 1).padStart(2, '0')}`)
    const goals = [goal(names[0]!), goal(names[0]!), ...names.slice(1).map((name) => goal(name))]

    const scorers = topScorersOf([played(goals)])

    expect(scorers).toHaveLength(20)
    expect(scorers[0]).toEqual({ goals: 2, player: 'Speler 01', playerId: null, position: 1, searchTerm: null })
    expect(scorers.slice(1).every((item) => item.goals === 1 && item.position === 2)).toBe(true)
    expect(scorers.slice(1).map((item) => item.player)).toEqual(names.slice(1))
  })

  describe('with the goals linked to the players of the squad', () => {
    /** A goal of a player of ours: the name in the match line, and the player behind it. */
    const linked = (id: number, name: string, searchTerm: string, shown: string, options: Partial<Goal> = {}) =>
      goal(shown, { playerId: id, playerName: name, playerSearchTerm: searchTerm, ...options })

    it('counts per player and shows his full name, with his id and the end of his name', () => {
      const matches = [
        played([linked(7, 'Luca Oyen', 'Oyen', 'Oyen'), linked(8, 'Jacob Trenskow', 'Trenskow', 'Trenskow')]),
        played([linked(7, 'Luca Oyen', 'Oyen', 'L. Oyen')]),
      ]

      expect(topScorersOf(matches)).toEqual([
        { goals: 2, player: 'Luca Oyen', playerId: 7, position: 1, searchTerm: 'Oyen' },
        { goals: 1, player: 'Jacob Trenskow', playerId: 8, position: 2, searchTerm: 'Trenskow' },
      ])
    })

    it('makes two rows of two players with the same surname, who were not counted as one', () => {
      const matches = [
        played([
          linked(1, 'Bram Jansen', 'Jansen', 'Jansen'),
          linked(2, 'Kees Jansen', 'Jansen', 'Jansen'),
          linked(2, 'Kees Jansen', 'Jansen', 'Jansen'),
        ]),
      ]

      expect(topScorersOf(matches).map((item) => [item.position, item.player, item.playerId, item.goals])).toEqual([
        [1, 'Kees Jansen', 2, 2],
        [2, 'Bram Jansen', 1, 1],
      ])
    })

    it('keeps the goals of a player who has left the squad', () => {
      expect(topScorersOf([played([linked(9, 'Marko Farji', 'Farji', 'Farji')])])).toEqual([
        { goals: 1, player: 'Marko Farji', playerId: 9, position: 1, searchTerm: 'Farji' },
      ])
    })

    it('counts a goal without a player under its name, as a row of its own, so no goal is lost', () => {
      const matches = [
        played([goal('Onbekend'), goal('Onbekend'), linked(7, 'Luca Oyen', 'Oyen', 'Oyen'), goal('Oyen')]),
      ]

      expect(topScorersOf(matches)).toEqual([
        { goals: 2, player: 'Onbekend', playerId: null, position: 1, searchTerm: null },
        { goals: 1, player: 'Luca Oyen', playerId: 7, position: 2, searchTerm: 'Oyen' },
        { goals: 1, player: 'Oyen', playerId: null, position: 2, searchTerm: null },
      ])
    })

    it('does not count an own goal or a goal of the opponent for a linked player', () => {
      const own = linked(7, 'Luca Oyen', 'Oyen', 'Oyen', { ours: false, ownGoal: true })
      const opponent = linked(7, 'Luca Oyen', 'Oyen', 'Oyen', { ours: false })

      expect(topScorersOf([played([own, opponent])])).toEqual([])
    })
  })

  it('is empty without goals, for a match without scorers and for no matches', () => {
    expect(topScorersOf([])).toEqual([])
    expect(topScorersOf([played([])])).toEqual([])
    expect(topScorersOf([played([goal('Teststraat', { ours: false })])])).toEqual([])
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

describe('goalsPerQuarter', () => {
  const minutes = (...list: number[]) => played(list.map((minute) => goal('Proefman', { minute })))

  it('puts minutes 1 to 15, 16 to 30, 31 to 45, 46 to 60, 61 to 75 and 76 to 90 in the six quarters', () => {
    const matches = [
      minutes(1, 15),
      minutes(16, 30),
      minutes(31, 45),
      minutes(46, 60),
      minutes(61, 75),
      minutes(76, 90),
    ]

    expect(goalsPerQuarter(matches).scored).toEqual([2, 2, 2, 2, 2, 2])
  })

  it('puts 15 in the first quarter and 16 in the second', () => {
    expect(goalsPerQuarter([minutes(15)]).scored).toEqual([1, 0, 0, 0, 0, 0])
    expect(goalsPerQuarter([minutes(16)]).scored).toEqual([0, 1, 0, 0, 0, 0])
  })

  it('counts a goal in stoppage time in the quarter before it: 45+1 in 31–45 and 90+3 in 76–90', () => {
    const matches = [
      played([
        goal('Proefman', { minute: 45, stoppageMinutes: 1 }),
        goal('Nepper', { minute: 90, stoppageMinutes: 3 }),
      ]),
    ]

    expect(goalsPerQuarter(matches).scored).toEqual([0, 0, 1, 0, 0, 1])
  })

  it('counts minute 45 and minute 46 in different quarters', () => {
    expect(goalsPerQuarter([minutes(45, 46)]).scored).toEqual([0, 0, 1, 1, 0, 0])
  })

  it('leaves out a goal in extra time, from minute 91', () => {
    const matches = [minutes(90, 91, 105, 120)]

    expect(goalsPerQuarter(matches).scored).toEqual([0, 0, 0, 0, 0, 1])
  })

  it('leaves out a goal in stoppage time of extra time', () => {
    const matches = [played([goal('Proefman', { minute: 120, stoppageMinutes: 2 })])]

    expect(goalsPerQuarter(matches)).toMatchObject({ known: 1, scored: [0, 0, 0, 0, 0, 0] })
  })

  it('leaves out a goal with minute 0, which no match has', () => {
    expect(goalsPerQuarter([minutes(0)]).scored).toEqual([0, 0, 0, 0, 0, 0])
  })

  it('counts the goals of the opponents as goals against', () => {
    const matches = [played([goal('Proefman', { minute: 10 }), goal('Teststraat', { minute: 80, ours: false })])]

    expect(goalsPerQuarter(matches)).toMatchObject({ conceded: [0, 0, 0, 0, 0, 1], scored: [1, 0, 0, 0, 0, 0] })
  })

  it('counts an own goal for the club that profits: ours is a goal for us, not ours is a goal against', () => {
    const matches = [
      played([
        goal('Teststraat', { minute: 20, ours: true, ownGoal: true }),
        goal('Proefman', { minute: 50, ours: false, ownGoal: true }),
      ]),
    ]

    expect(goalsPerQuarter(matches)).toMatchObject({ conceded: [0, 0, 0, 1, 0, 0], scored: [0, 1, 0, 0, 0, 0] })
  })

  it('counts the matches in the league and the cup alike', () => {
    const cup = { ...minutes(10), competition: 'KNVB Beker' as const }

    expect(goalsPerQuarter([minutes(10), cup]).scored).toEqual([2, 0, 0, 0, 0, 0])
  })

  it('counts a goalless draw as a match whose goals are known, without a goal', () => {
    const draw = { ...match('Speelronde 2', 'played', '2026-08-08'), goalsAgainst: 0, goalsFor: 0 }

    expect(goalsPerQuarter([draw, minutes(10)])).toEqual({
      conceded: [0, 0, 0, 0, 0, 0],
      extraTime: false,
      known: 2,
      played: 2,
      scored: [1, 0, 0, 0, 0, 0],
    })
  })

  it('leaves out a match with a score and no goals, because the page named none or they did not fit', () => {
    const noGoals = { ...match('Speelronde 2', 'played', '2026-08-08'), goalsAgainst: 1, goalsFor: 2 }

    expect(goalsPerQuarter([noGoals, minutes(10)])).toMatchObject({ known: 1, played: 2 })
  })

  it('leaves out a played match without a score, and a match that is not played, even with goals', () => {
    const noScore = { ...minutes(10), goalsAgainst: null, goalsFor: null }
    const scheduled = { ...minutes(10), status: 'scheduled' as const }

    expect(goalsPerQuarter([noScore, scheduled, minutes(70)])).toEqual({
      conceded: [0, 0, 0, 0, 0, 0],
      extraTime: false,
      known: 1,
      played: 2,
      scored: [0, 0, 0, 0, 1, 0],
    })
  })

  it('says a match in the count went to extra time, and leaves out its goals after minute 90', () => {
    const tie = { ...minutes(10, 100), competition: 'KNVB Beker' as const, extraTime: true }

    expect(goalsPerQuarter([minutes(20), tie])).toMatchObject({ extraTime: true, scored: [1, 1, 0, 0, 0, 0] })
  })

  it('says no extra time when no match in the count had it', () => {
    expect(goalsPerQuarter([minutes(10), minutes(20)]).extraTime).toBe(false)
  })

  it('does not say extra time for a match that is not in the count, such as one without goals or not played', () => {
    const noGoals = {
      ...match('Speelronde 2', 'played', '2026-08-08'),
      competition: 'KNVB Beker' as const,
      extraTime: true,
      goalsAgainst: 1,
      goalsFor: 2,
    }
    const scheduled = { ...minutes(10), extraTime: true, status: 'scheduled' as const }

    expect(goalsPerQuarter([minutes(10), noGoals, scheduled]).extraTime).toBe(false)
  })

  it('gives zeroes and no matches for a season without matches', () => {
    expect(goalsPerQuarter([])).toEqual({
      conceded: [0, 0, 0, 0, 0, 0],
      extraTime: false,
      known: 0,
      played: 0,
      scored: [0, 0, 0, 0, 0, 0],
    })
  })

  it('does not change the list it is given', () => {
    const matches = [minutes(10, 50)]
    const copy = structuredClone(matches)

    goalsPerQuarter(matches)

    expect(matches).toEqual(copy)
  })
})
