import type { PublicMatch, PublicStandingsRow } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import {
  cleanSheetsOf,
  extremesOf,
  goalsPerQuarter,
  goalsWithInitials,
  homeAwayOf,
  lacksResult,
  leaguePlaceOf,
  leagueResultsOf,
  matchFlowOf,
  overviewOf,
  parseCleanSheetCount,
  scorersCoverage,
  standingsAround,
  streaksOf,
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

/** Between round 4 and the postponed round 5: the schedule has two matches still to come. */
const between = new Date('2026-08-25T12:00:00Z')

describe('overviewOf', () => {
  it('puts the matches that have not begun in the programme, in the order they are given, a postponed one included', () => {
    expect(overviewOf(season, between).programme.map((item) => item.round)).toEqual([
      'Speelronde 5',
      'Speelronde 6',
      'Speelronde 7',
    ])
  })

  it('gives the results with the newest first', () => {
    expect(overviewOf(season, between).results.map((item) => item.round)).toEqual([
      'Speelronde 4',
      'Speelronde 3',
      'Speelronde 2',
      'Speelronde 1',
    ])
  })

  it('gives the newest match that has begun as the previous match for the homepage', () => {
    expect(overviewOf(season, between).previous?.round).toBe('Speelronde 4')
    expect(overviewOf([match('Speelronde 5', 'postponed', '2026-08-29')], between).previous).toBeUndefined()
  })

  it('takes the first match that has not begun as the next one, and not a postponed match', () => {
    expect(overviewOf(season, between).next?.round).toBe('Speelronde 6')
  })

  it('has no next match when only a postponed one is left, and nothing at all for no matches', () => {
    expect(overviewOf([match('Speelronde 5', 'postponed', '2026-08-29')], between).next).toBeUndefined()
    expect(overviewOf([], between)).toEqual({ next: undefined, previous: undefined, programme: [], results: [] })
  })

  it('does not change the list it is given', () => {
    const copy = [...season]

    overviewOf(season, between)

    expect(season).toEqual(copy)
  })

  it('has no previous match before the first kick-off of the season, and the whole season is the programme', () => {
    const coming = season.map((item) => ({ ...item, status: 'scheduled' as const }))
    const overview = overviewOf(coming, new Date('2026-07-01T12:00:00Z'))

    expect(overview.previous).toBeUndefined()
    expect(overview.results).toEqual([])
    expect(overview.next?.round).toBe('Speelronde 1')
  })

  it('has no next match after the last one has begun, and the previous match is the last of the season', () => {
    const finished = season.filter((item) => item.status !== 'postponed')
    const overview = overviewOf(finished, new Date('2026-10-01T12:00:00Z'))

    expect(overview.next).toBeUndefined()
    expect(overview.programme).toEqual([])
    expect(overview.previous?.round).toBe('Speelronde 7')
  })

  it('shows the same next match on the homepage as the first match with a date in the programme', () => {
    for (const now of [
      '2026-08-10T12:00:00Z',
      '2026-08-25T12:00:00Z',
      '2026-09-05T15:00:00Z',
      '2026-09-20T12:00:00Z',
    ]) {
      const overview = overviewOf(season, new Date(now))

      expect(overview.next).toBe(overview.programme.find((item) => item.status !== 'postponed'))
    }
  })

  describe('a match is split by its kick-off and not by its status', () => {
    const cup = (extra: Partial<PublicMatch> = {}): PublicMatch => ({
      ...match('Tweede ronde', 'scheduled', '2026-10-28'),
      competition: 'KNVB Beker',
      kickoffAt: new Date('2026-10-28T19:00:00Z'),
      ...extra,
    })
    const before = match('Speelronde 11', 'played', '2026-10-25')
    const after = match('Speelronde 12', 'scheduled', '2026-11-01')
    const overviewAt = (now: string, ...matches: PublicMatch[]) => overviewOf(matches, new Date(now))

    it('makes a cup match that has begun and has no result the previous match, never the next one', () => {
      const overview = overviewAt('2026-10-29T10:00:00Z', before, cup(), after)

      expect(overview.previous?.round).toBe('Tweede ronde')
      expect(overview.next?.round).toBe('Speelronde 12')
      expect(overview.results.map((item) => item.round)).toEqual(['Tweede ronde', 'Speelronde 11'])
      expect(overview.programme.map((item) => item.round)).toEqual(['Speelronde 12'])
    })

    it('counts a match in progress as begun: it is the previous match, with no result', () => {
      const overview = overviewAt('2026-10-28T19:30:00Z', before, cup(), after)

      expect(overview.previous?.round).toBe('Tweede ronde')
      expect(overview.next?.round).toBe('Speelronde 12')
    })

    it('counts a match as begun at the moment of the kick-off and not a moment before', () => {
      expect(overviewAt('2026-10-28T18:59:59.999Z', cup()).next?.round).toBe('Tweede ronde')
      expect(overviewAt('2026-10-28T19:00:00Z', cup()).previous?.round).toBe('Tweede ronde')
    })

    it('keeps a match without a kick-off in the programme until its day is over in Dutch time', () => {
      const day = cup({ kickoffAt: null, matchDate: '2026-10-28' })

      // The clocks went back on 25 October 2026, so Dutch time is an hour ahead of UTC.
      expect(overviewAt('2026-10-28T22:59:59Z', day).next?.round).toBe('Tweede ronde')
      expect(overviewAt('2026-10-28T23:00:00Z', day).previous?.round).toBe('Tweede ronde')
    })

    it('finds the end of the day in summer time too, two hours ahead of UTC', () => {
      const day = cup({ kickoffAt: null, matchDate: '2026-08-28' })

      expect(overviewAt('2026-08-28T21:59:59Z', day).next?.round).toBe('Tweede ronde')
      expect(overviewAt('2026-08-28T22:00:00Z', day).previous?.round).toBe('Tweede ronde')
    })

    it('finds the end of a day that is 25 and one that is 23 hours long, where the clocks change', () => {
      const autumn = cup({ kickoffAt: null, matchDate: '2026-10-25' })
      const spring = cup({ kickoffAt: null, matchDate: '2027-03-28' })

      expect(overviewAt('2026-10-25T22:59:59Z', autumn).next).toBeDefined()
      expect(overviewAt('2026-10-25T23:00:00Z', autumn).previous).toBeDefined()
      expect(overviewAt('2027-03-28T21:59:59Z', spring).next).toBeDefined()
      expect(overviewAt('2027-03-28T22:00:00Z', spring).previous).toBeDefined()
    })

    it('keeps the kick-off as it is across the change of the clocks', () => {
      const late = cup({ kickoffAt: new Date('2026-10-25T00:30:00Z'), matchDate: '2026-10-25' })

      expect(overviewAt('2026-10-25T00:29:59Z', late).next).toBeDefined()
      expect(overviewAt('2026-10-25T00:30:00Z', late).previous).toBeDefined()
    })

    it('never makes a postponed match without a new date the previous or the next match, however long ago its day was', () => {
      const postponed = cup({ status: 'postponed' })
      const overview = overviewAt('2026-11-10T12:00:00Z', before, postponed)

      expect(overview.previous?.round).toBe('Speelronde 11')
      expect(overview.next).toBeUndefined()
      expect(overview.programme).toEqual([postponed])
    })

    it('treats a postponed match with a new date as a scheduled one', () => {
      const moved = cup({ kickoffAt: new Date('2026-11-18T19:00:00Z'), matchDate: '2026-11-18' })

      expect(overviewAt('2026-11-10T12:00:00Z', before, moved).next?.round).toBe('Tweede ronde')
      expect(overviewAt('2026-11-18T19:00:00Z', before, moved).previous?.round).toBe('Tweede ronde')
    })

    it('keeps a match that is played in the results, also if the clock says it has not begun', () => {
      const played = match('Speelronde 12', 'played', '2026-11-01')

      expect(overviewAt('2026-10-01T12:00:00Z', played).previous).toBe(played)
    })
  })
})

describe('lacksResult', () => {
  const cup = (extra: Partial<PublicMatch> = {}): PublicMatch => ({
    ...match('Tweede ronde', 'scheduled', '2026-10-28'),
    kickoffAt: new Date('2026-10-28T19:00:00Z'),
    ...extra,
  })

  it('is false before the kick-off and for the first two hours of the match', () => {
    expect(lacksResult(cup(), new Date('2026-10-28T18:00:00Z'))).toBe(false)
    expect(lacksResult(cup(), new Date('2026-10-28T19:00:00Z'))).toBe(false)
    expect(lacksResult(cup(), new Date('2026-10-28T20:59:59.999Z'))).toBe(false)
  })

  it('is true exactly two hours after the kick-off, and after that', () => {
    expect(lacksResult(cup(), new Date('2026-10-28T21:00:00Z'))).toBe(true)
    expect(lacksResult(cup(), new Date('2026-11-05T12:00:00Z'))).toBe(true)
  })

  it('is false for a match with a result, so the sentence goes away when the result arrives', () => {
    const now = new Date('2026-10-29T10:00:00Z')
    const played = cup({ goalsAgainst: 1, goalsFor: 2, status: 'played' })

    expect(lacksResult(cup(), now)).toBe(true)
    expect(lacksResult(played, now)).toBe(false)
  })

  it('is true for a match that is played but has no score, since the result is not there', () => {
    const noScore = cup({ goalsAgainst: null, goalsFor: null, status: 'played' })

    expect(lacksResult(noScore, new Date('2026-10-29T10:00:00Z'))).toBe(true)
  })

  it('is false for a match without a kick-off on its day, and true from the day after in Dutch time', () => {
    const day = cup({ kickoffAt: null })

    expect(lacksResult(day, new Date('2026-10-28T12:00:00Z'))).toBe(false)
    expect(lacksResult(day, new Date('2026-10-28T22:59:59Z'))).toBe(false)
    expect(lacksResult(day, new Date('2026-10-28T23:00:00Z'))).toBe(true)
  })

  it('is false for a postponed match, and for a match that is still to come', () => {
    expect(lacksResult(cup({ status: 'postponed' }), new Date('2026-11-05T12:00:00Z'))).toBe(false)
    expect(lacksResult(cup(), new Date('2026-10-01T12:00:00Z'))).toBe(false)
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
      { goals: 2, id: 'Proefman', player: 'Proefman', position: 1, surname: 'Proefman' },
      { goals: 1, id: 'Nepper', player: 'Nepper', position: 2, surname: 'Nepper' },
    ])
  })

  it('counts a penalty as a goal of the player', () => {
    expect(topScorersOf([played([goal('Proefman', { penalty: true }), goal('Proefman')])])).toEqual([
      { goals: 2, id: 'Proefman', player: 'Proefman', position: 1, surname: 'Proefman' },
    ])
  })

  it('does not count the own goal of an opponent for a player of ours, who has no goal from it', () => {
    expect(topScorersOf([played([goal('Teststraat', { ownGoal: true }), goal('Proefman')])])).toEqual([
      { goals: 1, id: 'Proefman', player: 'Proefman', position: 1, surname: 'Proefman' },
    ])
  })

  it('does not count an own goal of ours for anybody, or a goal of the opponent for a player with the same name', () => {
    const own = goal('Proefman', { minute: 20, ours: false, ownGoal: true })
    const against = goal('Proefman', { minute: 30, ours: false })

    expect(topScorersOf([played([own, against, goal('Nepper')])])).toEqual([
      { goals: 1, id: 'Nepper', player: 'Nepper', position: 1, surname: 'Nepper' },
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
    expect(scorers[0]).toEqual({ goals: 2, id: 'Speler 01', player: 'Speler 01', position: 1, surname: 'Speler 01' })
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
        { givenName: 'Luca', goals: 2, id: 7, player: 'Luca Oyen', position: 1, surname: 'Oyen' },
        { givenName: 'Jacob', goals: 1, id: 8, player: 'Jacob Trenskow', position: 2, surname: 'Trenskow' },
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

      expect(topScorersOf(matches).map((item) => [item.position, item.player, item.id, item.goals])).toEqual([
        [1, 'Kees Jansen', 2, 2],
        [2, 'Bram Jansen', 1, 1],
      ])
    })

    it('keeps the goals of a player who has left the squad', () => {
      expect(topScorersOf([played([linked(9, 'Marko Farji', 'Farji', 'Farji')])])).toEqual([
        { givenName: 'Marko', goals: 1, id: 9, player: 'Marko Farji', position: 1, surname: 'Farji' },
      ])
    })

    it('counts a goal without a player under its name, as a row of its own, so no goal is lost', () => {
      const matches = [
        played([goal('Onbekend'), goal('Onbekend'), linked(7, 'Luca Oyen', 'Oyen', 'Oyen'), goal('Oyen')]),
      ]

      expect(topScorersOf(matches)).toEqual([
        { goals: 2, id: 'Onbekend', player: 'Onbekend', position: 1, surname: 'Onbekend' },
        { goals: 1, id: 'Oyen', player: 'Oyen', position: 2, surname: 'Oyen' },
        { givenName: 'Luca', goals: 1, id: 7, player: 'Luca Oyen', position: 2, surname: 'Oyen' },
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

describe('leagueResultsOf', () => {
  const playedOn = (round: string, matchDate: string, goalsFor: number, goalsAgainst: number): PublicMatch => ({
    ...match(round, 'played', matchDate),
    goalsAgainst,
    goalsFor,
  })

  it('gives W for a win, G for a draw and V for a loss, on the score', () => {
    const matches = [
      playedOn('Speelronde 1', '2026-08-01', 3, 0),
      playedOn('Speelronde 2', '2026-08-08', 1, 1),
      playedOn('Speelronde 3', '2026-08-15', 0, 2),
      playedOn('Speelronde 4', '2026-08-22', 0, 0),
      playedOn('Speelronde 5', '2026-08-29', 2, 1),
    ]

    expect(leagueResultsOf(matches)).toEqual(['W', 'G', 'V', 'G', 'W'])
  })

  it('keeps the order the matches were played in, a postponed match where it was played', () => {
    // Round 3 was postponed and played after round 5, so it comes after it.
    const matches = [
      playedOn('Speelronde 1', '2026-08-01', 1, 0),
      playedOn('Speelronde 2', '2026-08-08', 0, 1),
      playedOn('Speelronde 4', '2026-08-22', 1, 1),
      playedOn('Speelronde 5', '2026-08-29', 2, 0),
      playedOn('Speelronde 3', '2026-09-02', 0, 3),
    ]

    expect(leagueResultsOf(matches)).toEqual(['W', 'V', 'G', 'W', 'V'])
  })

  it('leaves out a cup tie, a match without a score, and a match that is postponed or still to come', () => {
    const noScore: PublicMatch = {
      ...match('Speelronde 9', 'played', '2026-10-01'),
      goalsAgainst: null,
      goalsFor: null,
    }
    const cup: PublicMatch = { ...playedOn('Tweede ronde', '2026-09-23', 4, 0), competition: 'KNVB Beker' }
    const matches: PublicMatch[] = [
      playedOn('Speelronde 1', '2026-08-01', 1, 0),
      cup,
      noScore,
      match('Speelronde 5', 'postponed', '2026-08-29'),
      match('Speelronde 6', 'scheduled', '2026-09-05'),
    ]

    expect(leagueResultsOf(matches)).toEqual(['W'])
  })

  it('gives nothing for no matches or no league match, and does not change the list it is given', () => {
    const matches: PublicMatch[] = [{ ...playedOn('Tweede ronde', '2026-09-23', 1, 0), competition: 'KNVB Beker' }]
    const copy = [...matches]

    expect(leagueResultsOf([])).toEqual([])
    expect(leagueResultsOf(matches)).toEqual([])
    expect(matches).toEqual(copy)
  })
})

describe('streaksOf', () => {
  // Round 1 to 8 as scores: the match in round n is played a week after the one before it.
  const scored = (scores: [number, number][]): PublicMatch[] =>
    scores.map(([goalsFor, goalsAgainst], index) => ({
      ...match(`Speelronde ${index + 1}`, 'played', `2026-08-${String(index * 7 + 1).padStart(2, '0')}`),
      goalsAgainst,
      goalsFor,
    }))
  const byLabel = (matches: PublicMatch[]) =>
    Object.fromEntries(streaksOf(matches).streaks.map(({ current, label, longest }) => [label, [current, longest]]))

  it('has the six streaks, in the order the card shows them', () => {
    expect(streaksOf(scored([[1, 0]])).streaks.map(({ label }) => label)).toEqual([
      'Ongeslagen',
      'Gewonnen',
      'Zonder winst',
      'Verloren',
      'Gescoord',
      'Zonder tegendoelpunt',
    ])
  })

  it('counts each streak apart, as it stands now and the longest', () => {
    // W G W W V G
    const matches = scored([
      [2, 0],
      [1, 1],
      [3, 1],
      [1, 0],
      [0, 2],
      [0, 0],
    ])

    expect(byLabel(matches)).toEqual({
      Gescoord: [0, 4],
      Gewonnen: [0, 2],
      Ongeslagen: [1, 4],
      Verloren: [0, 1],
      'Zonder tegendoelpunt': [1, 1],
      'Zonder winst': [2, 2],
    })
  })

  it('has a current streak of 0 when the latest match does not meet the condition, and counts a streak that runs', () => {
    const matches = scored([
      [0, 1],
      [0, 2],
      [2, 1],
      [1, 0],
      [3, 0],
    ])

    expect(byLabel(matches)).toMatchObject({
      Gescoord: [3, 3],
      Gewonnen: [3, 3],
      Ongeslagen: [3, 3],
      Verloren: [0, 2],
      'Zonder tegendoelpunt': [2, 2],
      'Zonder winst': [0, 2],
    })
  })

  it('finds the longest streak early in the season, when a shorter one runs now', () => {
    const matches = scored([
      [1, 0],
      [2, 0],
      [3, 0],
      [0, 1],
      [1, 0],
    ])

    expect(byLabel(matches)).toMatchObject({ Gewonnen: [1, 3] })
    expect(byLabel(matches)['Zonder tegendoelpunt']).toEqual([1, 3])
  })

  it('finds the longest streak late in the season, when the current one is 0', () => {
    const matches = scored([
      [0, 1],
      [1, 1],
      [1, 2],
      [0, 3],
      [0, 0],
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
    ])

    expect(byLabel(matches)).toMatchObject({ Ongeslagen: [0, 4], 'Zonder tegendoelpunt': [0, 4] })
  })

  it('counts a match whose scorers are not known, because the streaks come from the score', () => {
    const matches = scored([
      [1, 0],
      [2, 0],
    ])

    expect(matches.every((item) => item.goals.length === 0)).toBe(true)
    expect(byLabel(matches)).toMatchObject({ Gewonnen: [2, 2] })
  })

  it('gives the latest five matches, the oldest first, with their results', () => {
    const matches = scored([
      [0, 3],
      [1, 0],
      [1, 1],
      [0, 2],
      [2, 2],
      [4, 1],
      [0, 0],
    ])
    const { last } = streaksOf(matches)

    expect(last.map(({ match: item }) => item.round)).toEqual([
      'Speelronde 3',
      'Speelronde 4',
      'Speelronde 5',
      'Speelronde 6',
      'Speelronde 7',
    ])
    expect(last.map(({ result }) => result)).toEqual(['G', 'V', 'G', 'W', 'G'])
  })

  it('leaves out a cup tie, a match without a score and a match that is not played', () => {
    const matches: PublicMatch[] = [
      ...scored([[1, 0]]),
      { ...match('Tweede ronde', 'played', '2026-08-10'), competition: 'KNVB Beker', goalsAgainst: 5, goalsFor: 0 },
      { ...match('Speelronde 3', 'played', '2026-08-15'), goalsAgainst: null, goalsFor: null },
      match('Speelronde 4', 'postponed', '2026-08-22'),
      match('Speelronde 5', 'scheduled', '2026-08-29'),
    ]
    const result = streaksOf(matches)

    expect(result.played).toBe(1)
    expect(result.last).toHaveLength(1)
    expect(byLabel(matches)).toMatchObject({ Verloren: [0, 0] })
    expect(byLabel(matches)).toMatchObject({ Gewonnen: [1, 1] })
  })

  it('puts a postponed match where it was played', () => {
    // Round 3 was postponed and played after round 5, so it is the latest match.
    const won = (round: string, matchDate: string): PublicMatch => ({
      ...match(round, 'played', matchDate),
      goalsAgainst: 0,
      goalsFor: 1,
    })
    const matches = [
      won('Speelronde 1', '2026-08-01'),
      won('Speelronde 2', '2026-08-08'),
      won('Speelronde 4', '2026-08-22'),
      won('Speelronde 5', '2026-08-29'),
      { ...match('Speelronde 3', 'played', '2026-09-05'), goalsAgainst: 2, goalsFor: 0 },
    ]

    expect(byLabel(matches)).toMatchObject({ Gewonnen: [0, 4] })
    expect(streaksOf(matches).last.at(-1)?.match.round).toBe('Speelronde 3')
  })

  it('works for one match', () => {
    const result = streaksOf(scored([[0, 1]]))

    expect(result.played).toBe(1)
    expect(result.last).toHaveLength(1)
    expect(
      Object.fromEntries(result.streaks.map(({ current, label, longest }) => [label, [current, longest]])),
    ).toEqual({
      Gescoord: [0, 0],
      Gewonnen: [0, 0],
      Ongeslagen: [0, 0],
      Verloren: [1, 1],
      'Zonder tegendoelpunt': [0, 0],
      'Zonder winst': [1, 1],
    })
  })

  it('gives all zero and no matches for no matches, and does not change the list it is given', () => {
    const matches = scored([[1, 0]])
    const copy = [...matches]

    expect(streaksOf([])).toEqual({
      last: [],
      played: 0,
      streaks: expect.arrayContaining([{ current: 0, label: 'Ongeslagen', longest: 0 }]),
    })
    expect(streaksOf([]).streaks.every(({ current, longest }) => current === 0 && longest === 0)).toBe(true)
    streaksOf(matches)
    expect(matches).toEqual(copy)
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

describe('matchFlowOf', () => {
  const ours = (minute: number, stoppageMinutes: null | number = null) =>
    goal('Proefman', { minute, ours: true, stoppageMinutes })
  const theirs = (minute: number, stoppageMinutes: null | number = null) =>
    goal('Teststraat', { minute, ours: false, stoppageMinutes })
  const row = (matches: number, won: number, drawn: number, lost: number, points: number) => ({
    drawn,
    lost,
    matches,
    points,
    won,
  })
  const none = row(0, 0, 0, 0, 0)

  it('puts a match in "we score first" when our goal comes first, with its result and points', () => {
    const flow = matchFlowOf([played([ours(10), theirs(30), ours(60)]), played([ours(10), theirs(30), theirs(60)])])

    expect(flow.firstGoal).toEqual({ opponent: none, ours: row(2, 1, 0, 1, 3) })
  })

  it('puts a match in "the opponent scores first" when their goal comes first', () => {
    const flow = matchFlowOf([played([theirs(10), ours(30), ours(60)]), played([theirs(20), ours(30)])])

    expect(flow.firstGoal).toEqual({ opponent: row(2, 1, 1, 0, 4), ours: none })
  })

  it('leaves a goalless draw out of the first goal, and counts it at half-time as level', () => {
    const draw = { ...played([]), goalsAgainst: 0, goalsFor: 0 }
    const flow = matchFlowOf([draw])

    expect(flow).toMatchObject({ known: 1, played: 1, unknownFirstGoal: 0 })
    expect(flow.firstGoal).toEqual({ opponent: none, ours: none })
    expect(flow.atHalfTime).toEqual({ ahead: none, behind: none, level: row(1, 0, 1, 0, 1) })
  })

  it('puts the goals in the order of the clock and not in the order of the data', () => {
    // The page lists the goals of the home club before those of the away club.
    const flow = matchFlowOf([played([ours(70), theirs(5)])])

    expect(flow.firstGoal.opponent.matches).toBe(1)
    expect(flow.firstGoal.ours.matches).toBe(0)
  })

  it('does not know the first goal when both clubs score in the first minute with a goal', () => {
    const flow = matchFlowOf([played([ours(12), theirs(12), ours(80)])])

    expect(flow).toMatchObject({ known: 1, unknownFirstGoal: 1 })
    expect(flow.firstGoal).toEqual({ opponent: none, ours: none })
    expect(flow.atHalfTime.level.matches).toBe(1)
  })

  it('knows the first goal when it is two goals of one club in the same minute', () => {
    const flow = matchFlowOf([played([ours(12), ours(12), theirs(50)])])

    expect(flow.unknownFirstGoal).toBe(0)
    expect(flow.firstGoal.ours.matches).toBe(1)
  })

  it('knows the first goal when the same minute only comes after it', () => {
    const flow = matchFlowOf([played([theirs(5), ours(40), theirs(40)])])

    expect(flow.unknownFirstGoal).toBe(0)
    expect(flow.firstGoal.opponent.matches).toBe(1)
  })

  it('puts 45 before 45+1 and 45+1 before 45+2, so they have an order', () => {
    const flow = matchFlowOf([played([ours(45, 1), theirs(45), ours(45, 2)])])

    expect(flow.unknownFirstGoal).toBe(0)
    expect(flow.firstGoal.opponent.matches).toBe(1)
  })

  it('does not know the first goal when both clubs score in the same stoppage minute', () => {
    expect(matchFlowOf([played([ours(45, 2), theirs(45, 2)])]).unknownFirstGoal).toBe(1)
  })

  it('counts a goal in minute 45 and in the stoppage time of the first half for half-time', () => {
    const flow = matchFlowOf([played([ours(45)]), played([ours(45, 3)]), played([theirs(45, 1), ours(80)])])

    expect(flow.atHalfTime).toEqual({ ahead: row(2, 2, 0, 0, 6), behind: row(1, 0, 1, 0, 1), level: none })
  })

  it('does not count a goal from minute 46 for half-time', () => {
    const flow = matchFlowOf([played([theirs(46)]), played([ours(46), ours(60)])])

    expect(flow.atHalfTime).toEqual({ ahead: none, behind: none, level: row(2, 1, 0, 1, 3) })
  })

  it('splits half-time into ahead, level and behind with the result of each', () => {
    const flow = matchFlowOf([
      played([ours(10), theirs(70)]),
      played([ours(10), theirs(20), ours(80)]),
      played([theirs(10), ours(20), theirs(80)]),
      played([theirs(10), theirs(40), ours(60)]),
    ])

    expect(flow.atHalfTime).toEqual({
      ahead: row(1, 0, 1, 0, 1),
      behind: row(1, 0, 0, 1, 0),
      level: row(2, 1, 0, 1, 3),
    })
  })

  it('counts an own goal for the club that profits', () => {
    const own = goal('Teststraat', { minute: 10, ours: true, ownGoal: true })
    const flow = matchFlowOf([played([own, theirs(50)])])

    expect(flow.firstGoal.ours).toEqual(row(1, 0, 1, 0, 1))
  })

  it('counts a win after trailing, also when the club led later', () => {
    const flow = matchFlowOf([played([theirs(10), ours(30), ours(60)]), played([ours(10), theirs(20), ours(60)])])

    expect(flow).toMatchObject({ notWonAfterLead: 0, wonAfterTrailing: 1 })
  })

  it('counts a draw or a loss after a lead as not won after leading, and a win after a lead not', () => {
    const flow = matchFlowOf([
      played([ours(10), theirs(50)]),
      played([ours(10), theirs(50), theirs(80)]),
      played([ours(10), theirs(50), ours(80)]),
      played([theirs(10), theirs(20)]),
    ])

    expect(flow).toMatchObject({ notWonAfterLead: 2, wonAfterTrailing: 0 })
  })

  it('counts a draw after trailing as neither', () => {
    expect(matchFlowOf([played([theirs(10), ours(50)])])).toMatchObject({ notWonAfterLead: 0, wonAfterTrailing: 0 })
  })

  it('leaves a lead out when it depends on the order within a minute', () => {
    // 1-0 or 0-1 after minute 20, then level: a lead or a trail only if the order were known.
    const flow = matchFlowOf([played([ours(20), theirs(20)]), played([theirs(20), ours(20), ours(70)])])

    expect(flow).toMatchObject({ notWonAfterLead: 0, wonAfterTrailing: 0 })
  })

  it('counts a lead that every order within a minute has, such as two goals against one', () => {
    const flow = matchFlowOf([played([ours(20), ours(20), theirs(20), theirs(60)])])

    expect(flow.notWonAfterLead).toBe(1)
  })

  it('leaves out a match without known goals, and a match that is not played', () => {
    const noGoals = { ...match('Speelronde 2', 'played', '2026-08-08'), goalsAgainst: 1, goalsFor: 2 }
    const scheduled = { ...played([ours(10)]), status: 'scheduled' as const }
    const flow = matchFlowOf([noGoals, scheduled, played([ours(10)])])

    expect(flow).toMatchObject({ known: 1, played: 2 })
    expect(flow.firstGoal.ours.matches).toBe(1)
  })

  it('leaves out a played match without a score', () => {
    const noScore = { ...played([ours(10)]), goalsAgainst: null, goalsFor: null }

    expect(matchFlowOf([noScore])).toMatchObject({ known: 0 })
  })

  it('leaves out a cup match, in the count and in the matches played', () => {
    const cup = { ...played([ours(10)]), competition: 'KNVB Beker' as const }

    expect(matchFlowOf([cup, played([ours(10)])])).toMatchObject({ known: 1, played: 1 })
  })

  it('gives zeroes for a season without matches', () => {
    expect(matchFlowOf([])).toEqual({
      atHalfTime: { ahead: none, behind: none, level: none },
      firstGoal: { opponent: none, ours: none },
      known: 0,
      notWonAfterLead: 0,
      played: 0,
      unknownFirstGoal: 0,
      wonAfterTrailing: 0,
    })
  })

  it('does not change the list it is given', () => {
    const matches = [played([ours(70), theirs(5)])]
    const copy = structuredClone(matches)

    matchFlowOf(matches)

    expect(matches).toEqual(copy)
  })
})

describe('goalsWithInitials', () => {
  const trenskow = (id: number, given: string, minute: number) =>
    goal('Trenskow', {
      minute,
      playerId: id,
      playerName: `${given} Trenskow`,
      playerSearchTerm: 'Trenskow',
    })

  it('gives the whole given name when two players with the same name have the same initial', () => {
    const goals = [trenskow(1, 'Jakob', 10), trenskow(2, 'Jan', 20), trenskow(1, 'Jakob', 30)]

    expect(goalsWithInitials(goals).map((item) => item.player)).toEqual([
      'Jakob Trenskow',
      'Jan Trenskow',
      'Jakob Trenskow',
    ])
  })

  it('puts only the initial before the player whose initial nobody shares', () => {
    const goals = [trenskow(1, 'Jakob', 10), trenskow(2, 'Jan', 20), trenskow(3, 'Bram', 30)]

    expect(goalsWithInitials(goals).map((item) => item.player)).toEqual([
      'Jakob Trenskow',
      'Jan Trenskow',
      'B. Trenskow',
    ])
  })

  it('tells them apart when their given names start with different letters', () => {
    const goals = [trenskow(1, 'Jakob', 10), trenskow(2, 'Bram', 20)]

    expect(goalsWithInitials(goals).map((item) => item.player)).toEqual(['J. Trenskow', 'B. Trenskow'])
  })

  it('leaves two goals of one player alone', () => {
    const goals = [trenskow(1, 'Jakob', 10), trenskow(1, 'Jakob', 20)]

    expect(goalsWithInitials(goals).map((item) => item.player)).toEqual(['Trenskow', 'Trenskow'])
  })

  it('leaves players with different names alone, and goals without a player', () => {
    const goals = [
      trenskow(1, 'Jakob', 10),
      goal('Oyen', { minute: 20, playerId: 3, playerName: 'Luca Oyen', playerSearchTerm: 'Oyen' }),
      goal('Trenskow', { minute: 30, ours: false }),
    ]

    expect(goalsWithInitials(goals)).toEqual(goals)
  })

  it('leaves the other fields of a goal as they are', () => {
    const [changed] = goalsWithInitials([
      { ...trenskow(1, 'Jakob', 10), penalty: true },
      { ...trenskow(2, 'Bram', 20), ownGoal: true },
    ])

    expect(changed).toMatchObject({ minute: 10, penalty: true, player: 'J. Trenskow', playerId: 1 })
  })

  it('does not shorten a name that has no given name to tell it from', () => {
    const goals = [
      goal('Dinho', { minute: 10, playerId: 1, playerName: 'Dinho', playerSearchTerm: 'Dinho' }),
      goal('Dinho', { minute: 20, playerId: 2, playerName: 'Dinho', playerSearchTerm: 'Dinho' }),
    ]

    expect(goalsWithInitials(goals)).toEqual(goals)
  })
})

describe('extremesOf', () => {
  /** A played match with this score, and these goals if it has any. */
  const scored = (round: string, goalsFor: number, goalsAgainst: number, goals: Goal[] = []): PublicMatch => ({
    ...match(round, 'played', `2026-08-${String(Number(round.replace(/\D/g, '')) + 8).padStart(2, '0')}`),
    goals,
    goalsAgainst,
    goalsFor,
  })
  const rounds = (...list: (PublicMatch | undefined)[]) => list.map((item) => item?.round)

  it('picks the biggest win, the biggest loss and the match with the most goals from the score', () => {
    const matches = [
      scored('Speelronde 1', 3, 0),
      scored('Speelronde 2', 0, 2),
      scored('Speelronde 3', 1, 5),
      scored('Speelronde 4', 2, 1),
    ]
    const extremes = extremesOf(matches)

    expect(extremes.biggestWin?.round).toBe('Speelronde 1')
    expect(extremes.biggestLoss?.round).toBe('Speelronde 3')
    expect(extremes.mostGoals?.round).toBe('Speelronde 3')
    expect(extremes.played).toBe(4)
  })

  it('takes the match played last when two are level, in each of the three lines', () => {
    const matches = [
      scored('Speelronde 1', 3, 1),
      scored('Speelronde 2', 0, 2),
      scored('Speelronde 3', 2, 0),
      scored('Speelronde 4', 1, 3),
      scored('Speelronde 5', 1, 1),
    ]
    const extremes = extremesOf(matches)

    expect(rounds(extremes.biggestWin, extremes.biggestLoss, extremes.mostGoals)).toEqual([
      'Speelronde 3',
      'Speelronde 4',
      'Speelronde 4',
    ])
  })

  it('has no win without a win and no loss without a loss, and a draw is neither', () => {
    expect(rounds(extremesOf([scored('Speelronde 1', 0, 1), scored('Speelronde 2', 2, 2)]).biggestWin)).toEqual([
      undefined,
    ])
    expect(rounds(extremesOf([scored('Speelronde 1', 1, 0), scored('Speelronde 2', 2, 2)]).biggestLoss)).toEqual([
      undefined,
    ])
    expect(
      rounds(
        extremesOf([scored('Speelronde 1', 0, 0)]).biggestWin,
        extremesOf([scored('Speelronde 1', 0, 0)]).biggestLoss,
      ),
    ).toEqual([undefined, undefined])
  })

  it('picks our earliest and our last goal, and counts the stoppage time in the minute', () => {
    const matches = [
      scored('Speelronde 1', 2, 0, [
        goal('Proefman', { minute: 44 }),
        goal('Nepper', { minute: 45, stoppageMinutes: 2 }),
      ]),
      scored('Speelronde 2', 1, 0, [goal('Kopie', { minute: 48 })]),
    ]
    const { earliestGoal, latestGoal } = extremesOf(matches)

    expect([earliestGoal?.goal.player, earliestGoal?.match.round]).toEqual(['Proefman', 'Speelronde 1'])
    expect([latestGoal?.goal.player, latestGoal?.match.round]).toEqual(['Kopie', 'Speelronde 2'])
  })

  it('counts a goal in the stoppage time of minute 90 as the last one, and 45+3 as later than 46', () => {
    const matches = [
      scored('Speelronde 1', 2, 0, [
        goal('Proefman', { minute: 90 }),
        goal('Nepper', { minute: 90, stoppageMinutes: 4 }),
      ]),
      scored('Speelronde 2', 2, 0, [
        goal('Kopie', { minute: 46 }),
        goal('Proefman', { minute: 45, stoppageMinutes: 3 }),
      ]),
    ]

    expect(extremesOf(matches).latestGoal?.goal.player).toBe('Nepper')
    expect(extremesOf(matches.slice(1)).latestGoal?.goal.player).toBe('Proefman')
  })

  it('takes the match played last when two goals are in the same minute', () => {
    const matches = [
      scored('Speelronde 1', 1, 0, [goal('Proefman', { minute: 5 })]),
      scored('Speelronde 2', 1, 0, [goal('Nepper', { minute: 5 })]),
    ]

    expect(extremesOf(matches).earliestGoal?.goal.player).toBe('Nepper')
    expect(extremesOf(matches).latestGoal?.goal.player).toBe('Nepper')
  })

  it('leaves out the goals of the opponent, a goal in extra time and a goal in minute 0', () => {
    const matches = [
      scored('Speelronde 1', 2, 2, [
        goal('Teststraat', { minute: 2, ours: false }),
        goal('Proefman', { minute: 0 }),
        goal('Nepper', { minute: 30 }),
        goal('Kopie', { minute: 105 }),
        goal('Teststraat', { minute: 80, ours: false }),
      ]),
    ]
    const { earliestGoal, latestGoal } = extremesOf(matches)

    expect([earliestGoal?.goal.player, latestGoal?.goal.player]).toEqual(['Nepper', 'Nepper'])
  })

  it('counts an own goal of the opponent as a goal of ours, with the sign that it is one', () => {
    const matches = [scored('Speelronde 1', 1, 0, [goal('Teststraat', { minute: 3, ownGoal: true })])]

    expect(extremesOf(matches).earliestGoal?.goal).toMatchObject({ ours: true, ownGoal: true, player: 'Teststraat' })
  })

  it('takes the goals only from matches whose goals are known, and says how many that are', () => {
    const matches = [
      scored('Speelronde 1', 4, 0),
      scored('Speelronde 2', 0, 0),
      scored('Speelronde 3', 1, 0, [goal('Proefman', { minute: 77 })]),
    ]
    const extremes = extremesOf(matches)

    expect(extremes.known).toBe(2)
    expect(extremes.played).toBe(3)
    expect(extremes.biggestWin?.round).toBe('Speelronde 1')
    expect(extremes.earliestGoal?.match.round).toBe('Speelronde 3')
  })

  it('keeps the three lines of the score and has no goal when no match has its goals', () => {
    const extremes = extremesOf([scored('Speelronde 1', 2, 0), scored('Speelronde 2', 1, 3)])

    expect(extremes).toMatchObject({ earliestGoal: undefined, known: 0, latestGoal: undefined, played: 2 })
    expect(rounds(extremes.biggestWin, extremes.biggestLoss, extremes.mostGoals)).toEqual([
      'Speelronde 1',
      'Speelronde 2',
      'Speelronde 2',
    ])
  })

  it('leaves out a cup tie, a match that is not played and a match without a score', () => {
    const matches = [
      { ...scored('Tweede ronde', 9, 0, [goal('Proefman', { minute: 1 })]), competition: 'KNVB Beker' as const },
      match('Speelronde 5', 'postponed', '2026-08-29'),
      match('Speelronde 6', 'scheduled', '2026-09-05'),
      { ...scored('Speelronde 1', 1, 0), goalsAgainst: null },
    ]

    expect(extremesOf(matches)).toEqual({
      biggestLoss: undefined,
      biggestWin: undefined,
      earliestGoal: undefined,
      known: 0,
      latestGoal: undefined,
      mostGoals: undefined,
      played: 0,
    })
  })

  it('has nothing for no matches', () => {
    expect(extremesOf([])).toEqual({
      biggestLoss: undefined,
      biggestWin: undefined,
      earliestGoal: undefined,
      known: 0,
      latestGoal: undefined,
      mostGoals: undefined,
      played: 0,
    })
  })

  it('shows one match in every line it fits, and does not change the list it is given', () => {
    const matches = [scored('Speelronde 1', 3, 1, [goal('Proefman', { minute: 20 })])]
    const copy = structuredClone(matches)
    const extremes = extremesOf(matches)

    expect(rounds(extremes.biggestWin, extremes.mostGoals, extremes.earliestGoal?.match)).toEqual([
      'Speelronde 1',
      'Speelronde 1',
      'Speelronde 1',
    ])
    expect(matches).toEqual(copy)
  })
})

describe('leaguePlaceOf', () => {
  const club = (
    name: string,
    position: number,
    played: number,
    points: number,
    won: number,
    goalsFor: number,
    goalsAgainst: number,
  ): PublicStandingsRow => ({
    ...row(position, name),
    drawn: points - won * 3,
    goalDifference: goalsFor - goalsAgainst,
    goalsAgainst,
    goalsFor,
    lost: played - won - (points - won * 3),
    played,
    points,
    won,
  })
  const placeOf = (rows: PublicStandingsRow[], measure: string) =>
    leaguePlaceOf(rows)?.measures.find((item) => item.measure === measure)

  it('gives the five measures in the order of the card, with the matches played', () => {
    const place = leaguePlaceOf([club('Een', 1, 4, 10, 3, 9, 3), club('sc Heerenveen', 2, 4, 7, 2, 6, 5)])

    expect(place?.measures.map((item) => item.measure)).toEqual([
      'pointsPerMatch',
      'won',
      'goalsFor',
      'goalsAgainst',
      'goalDifference',
    ])
    expect(place?.played).toBe(4)
    expect(placeOf([club('sc Heerenveen', 1, 4, 7, 2, 6, 5)], 'pointsPerMatch')?.value).toBe(1.75)
    expect(placeOf([club('sc Heerenveen', 1, 4, 7, 2, 6, 5)], 'goalDifference')?.value).toBe(1)
  })

  it('shares a place between clubs with the same value and skips the next one', () => {
    const rows = [
      club('Een', 1, 4, 9, 3, 8, 2),
      club('Twee', 2, 4, 6, 2, 5, 4),
      club('sc Heerenveen', 3, 4, 6, 2, 5, 5),
      club('Vier', 4, 4, 5, 1, 3, 6),
    ]

    expect(placeOf(rows, 'won')).toMatchObject({ place: 2, shared: true })
    expect(placeOf(rows, 'goalsFor')).toMatchObject({ place: 2, shared: true })
    expect(placeOf(rows, 'goalDifference')).toMatchObject({ place: 3, shared: false })
    expect(placeOf([...rows, club('Vijf', 5, 4, 6, 2, 5, 5)], 'won')).toMatchObject({ place: 2, shared: true })
  })

  it('ranks the best defence on the fewest goals against', () => {
    const rows = [
      club('Een', 1, 4, 9, 3, 8, 2),
      club('sc Heerenveen', 2, 4, 6, 2, 5, 3),
      club('Drie', 3, 4, 3, 1, 3, 9),
    ]

    expect(placeOf(rows, 'goalsAgainst')).toMatchObject({ place: 2, shared: false, value: 3 })
    expect(placeOf(rows, 'goalsFor')).toMatchObject({ place: 2 })
  })

  it('compares points per match when the clubs played a different number of matches', () => {
    // 6 points in 3 matches (2,00) beats 7 points in 4 (1,75), and 3 in 2 (1,50) is behind it.
    const rows = [
      club('Meer', 1, 4, 7, 2, 6, 3),
      club('sc Heerenveen', 2, 3, 6, 2, 5, 2),
      club('Minder', 3, 2, 3, 1, 2, 2),
    ]

    expect(placeOf(rows, 'pointsPerMatch')).toMatchObject({ place: 1, shared: false, value: 2 })
    expect(placeOf(rows, 'won')).toMatchObject({ place: 1, shared: true })
  })

  it('shares the place on points per match when the ratio is the same, with no rounding', () => {
    const rows = [club('Twee', 1, 6, 12, 4, 9, 3), club('sc Heerenveen', 2, 3, 6, 2, 5, 2)]

    expect(placeOf(rows, 'pointsPerMatch')).toMatchObject({ place: 1, shared: true })
  })

  it('says how many points sc Heerenveen is behind the leader and ahead of the last', () => {
    const rows = [
      club('Een', 1, 4, 10, 3, 9, 3),
      club('sc Heerenveen', 2, 4, 7, 2, 6, 5),
      club('Drie', 3, 4, 2, 0, 2, 9),
    ]

    expect(leaguePlaceOf(rows)).toMatchObject({ last: { club: 'Drie', points: 5 }, leader: { club: 'Een', points: 3 } })
  })

  it('has no leader when sc Heerenveen is the leader, and no last when it is the last', () => {
    const rows = [club('sc Heerenveen', 1, 4, 10, 3, 9, 3), club('Twee', 2, 4, 7, 2, 6, 5)]

    expect(leaguePlaceOf(rows)).toMatchObject({ last: { club: 'Twee', points: 3 }, leader: undefined })
    expect(leaguePlaceOf([club('Een', 1, 4, 10, 3, 9, 3), club('sc Heerenveen', 2, 4, 7, 2, 6, 5)])).toMatchObject({
      last: undefined,
      leader: { club: 'Een', points: 3 },
    })
  })

  it('takes the leader and the last by points, so a table out of order never gives a negative gap', () => {
    const rows = [
      club('Een', 1, 4, 5, 1, 5, 4),
      club('sc Heerenveen', 2, 4, 7, 2, 6, 5),
      club('Drie', 3, 4, 9, 3, 9, 3),
    ]

    expect(leaguePlaceOf(rows)).toMatchObject({ last: { club: 'Een', points: 2 }, leader: { club: 'Drie', points: 2 } })
  })

  it('gives 0 points behind a leader with the same points', () => {
    const rows = [club('Een', 1, 4, 7, 2, 7, 3), club('sc Heerenveen', 2, 4, 7, 2, 6, 3)]

    expect(leaguePlaceOf(rows)?.leader).toEqual({ club: 'Een', points: 0 })
  })

  it('leaves out a club that has played nothing, also as the last', () => {
    const rows = [
      club('Een', 1, 1, 3, 1, 2, 0),
      club('sc Heerenveen', 2, 1, 1, 0, 1, 1),
      club('Drie', 3, 0, 0, 0, 0, 0),
    ]
    const place = leaguePlaceOf(rows)

    expect(place?.last).toBeUndefined()
    expect(place?.leader).toEqual({ club: 'Een', points: 2 })
    expect(placeOf(rows, 'goalsAgainst')).toMatchObject({ place: 2, shared: false })
  })

  it('has no leader and no last when sc Heerenveen is the only club that played', () => {
    const place = leaguePlaceOf([club('sc Heerenveen', 1, 1, 3, 1, 2, 0), club('Twee', 2, 0, 0, 0, 0, 0)])

    expect(place).toMatchObject({ last: undefined, leader: undefined, played: 1 })
    expect(place?.measures.every((item) => item.place === 1 && !item.shared)).toBe(true)
  })

  it('gives nothing without sc Heerenveen in the table, when it has played nothing, or with an empty table', () => {
    expect(leaguePlaceOf([club('Een', 1, 4, 10, 3, 9, 3)])).toBeUndefined()
    expect(leaguePlaceOf([club('Een', 1, 1, 3, 1, 2, 0), club('sc Heerenveen', 2, 0, 0, 0, 0, 0)])).toBeUndefined()
    expect(leaguePlaceOf([])).toBeUndefined()
  })
})

describe('homeAwayOf', () => {
  const game = (home: boolean, goalsFor: number, goalsAgainst: number, round = 'Speelronde 1'): PublicMatch => ({
    ...match(round, 'played', '2026-08-01'),
    goalsAgainst,
    goalsFor,
    home,
  })
  const matches = [
    game(true, 3, 0, 'Speelronde 1'),
    game(true, 1, 1, 'Speelronde 2'),
    game(true, 0, 2, 'Speelronde 3'),
    game(false, 2, 1, 'Speelronde 4'),
    game(false, 0, 0, 'Speelronde 5'),
  ]

  it('counts the matches at home and away apart, with the points and the goals', () => {
    const { away, home } = homeAwayOf(matches)

    expect(home).toEqual({
      cleanSheets: 1,
      drawn: 1,
      goalsAgainst: 3,
      goalsFor: 4,
      goalsPerMatch: 4 / 3,
      lost: 1,
      played: 3,
      points: 4,
      pointsPerMatch: 4 / 3,
      won: 1,
    })
    expect(away).toEqual({
      cleanSheets: 1,
      drawn: 1,
      goalsAgainst: 1,
      goalsFor: 2,
      goalsPerMatch: 1,
      lost: 0,
      played: 2,
      points: 4,
      pointsPerMatch: 2,
      won: 1,
    })
  })

  it('gives a total that is home plus away, and that agrees with the results of the season', () => {
    const { away, home, total } = homeAwayOf(matches)
    const results = leagueResultsOf(matches)
    const count = (result: string) => results.filter((item) => item === result).length

    for (const key of [
      'cleanSheets',
      'drawn',
      'goalsAgainst',
      'goalsFor',
      'lost',
      'played',
      'points',
      'won',
    ] as const) {
      expect(total[key]).toBe(home[key] + away[key])
    }
    expect([total.won, total.drawn, total.lost]).toEqual([count('W'), count('G'), count('V')])
    expect(total.points).toBe(count('W') * 3 + count('G'))
    expect(total.pointsPerMatch).toBeCloseTo(8 / 5)
    expect(total.goalsPerMatch).toBeCloseTo(6 / 5)
  })

  it('has zeros and no average for a side that has no match yet', () => {
    const { away, home, total } = homeAwayOf([game(true, 2, 0)])

    expect(away).toEqual({
      cleanSheets: 0,
      drawn: 0,
      goalsAgainst: 0,
      goalsFor: 0,
      goalsPerMatch: undefined,
      lost: 0,
      played: 0,
      points: 0,
      pointsPerMatch: undefined,
      won: 0,
    })
    expect(home.played).toBe(1)
    expect(home.pointsPerMatch).toBe(3)
    expect(total).toEqual(home)
  })

  it('has zeros and no average when there is no match at all', () => {
    const { away, home, total } = homeAwayOf([])

    expect(home).toEqual(away)
    expect(total).toEqual(away)
    expect(total.played).toBe(0)
    expect(total.pointsPerMatch).toBeUndefined()
  })

  it('leaves out a cup tie, a match without a score, and a match that is postponed or still to come', () => {
    const cup: PublicMatch = { ...game(true, 4, 0), competition: 'KNVB Beker' }
    const noScore: PublicMatch = { ...game(false, 0, 0), goalsAgainst: null, goalsFor: null }
    const postponed: PublicMatch = { ...match('Speelronde 6', 'postponed', '2026-09-01'), home: true }
    const scheduled: PublicMatch = { ...match('Speelronde 7', 'scheduled', '2026-09-08'), home: false }

    expect(homeAwayOf([game(true, 1, 0), cup, noScore, postponed, scheduled]).total.played).toBe(1)
  })

  it('counts a match whose goals per player are not known', () => {
    // `game` has no goals in the list, only a score: it still counts.
    expect(homeAwayOf([game(true, 2, 1)]).home).toMatchObject({ goalsAgainst: 1, goalsFor: 2, played: 1, won: 1 })
  })
})
