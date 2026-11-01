import type { PublicMatch } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import { competitionQuery, parseCompetition } from './competition'
import {
  cleanSheetsOf,
  competitionNames,
  extremesOf,
  goalsPerQuarter,
  hasPlayedExtraMatch,
  homeAwayOf,
  leagueResultsOf,
  matchFlowOf,
  scorersCoverage,
  streaksOf,
  topScorersOf,
} from './matches'

/*
 * The choice between all the matches (the Eredivisie and the KNVB Beker) and the Eredivisie
 * alone, for each helper the cards use: with a season that has a cup tie and one that has none.
 */

const goal = (minute: number, extra: Partial<PublicMatch['goals'][number]> = {}): PublicMatch['goals'][number] => ({
  minute,
  ours: true,
  ownGoal: false,
  penalty: false,
  player: 'Proefman',
  playerId: null,
  playerName: null,
  playerPage: null,
  playerSearchTerm: null,
  stoppageMinutes: null,
  ...extra,
})

const played = (
  round: string,
  matchDate: string,
  goalsFor: number,
  goalsAgainst: number,
  extra: Partial<PublicMatch> = {},
): PublicMatch => ({
  afterNinetyAgainst: null,
  afterNinetyFor: null,
  competition: 'Eredivisie',
  dateText: null,
  extraTime: false,
  goals: [],
  goalsAgainst,
  goalsFor,
  home: true,
  kickoffAt: new Date(`${matchDate}T14:30:00Z`),
  matchDate,
  opponent: `Club ${round}`,
  penaltiesAgainst: null,
  penaltiesFor: null,
  round,
  stadium: null,
  status: 'played',
  ...extra,
})

const cup = (
  round: string,
  matchDate: string,
  goalsFor: number,
  goalsAgainst: number,
  extra: Partial<PublicMatch> = {},
) => played(round, matchDate, goalsFor, goalsAgainst, { competition: 'KNVB Beker', ...extra })

const playoffs = (
  round: string,
  matchDate: string,
  goalsFor: number,
  goalsAgainst: number,
  extra: Partial<PublicMatch> = {},
) => played(round, matchDate, goalsFor, goalsAgainst, { competition: 'Play-offs Conference League', ...extra })

describe('parseCompetition', () => {
  it('gives all the matches without a parameter, and the Eredivisie for eredivisie', () => {
    expect(parseCompetition(undefined)).toBe('all')
    expect(parseCompetition('eredivisie')).toBe('league')
  })

  it.each(['', 'Eredivisie', 'EREDIVISIE', 'alle', 'alle-wedstrijden', 'beker', ' eredivisie', 'eredivisie '])(
    'gives nothing for %j, so the page is "niet gevonden"',
    (value) => {
      expect(parseCompetition(value)).toBeUndefined()
    },
  )

  it('gives nothing for a value given twice, also when both are right', () => {
    expect(parseCompetition(['eredivisie', 'eredivisie'])).toBeUndefined()
    expect(parseCompetition(['eredivisie'])).toBeUndefined()
  })
})

describe('competitionQuery', () => {
  it('is nothing for all the matches, which have no parameter, and the parameter for the Eredivisie', () => {
    expect(competitionQuery('all')).toBe('')
    expect(competitionQuery('league')).toBe('?competitie=eredivisie')
  })
})

describe('hasPlayedExtraMatch and competitionNames', () => {
  const league = played('Speelronde 1', '2026-08-01', 1, 0)

  it('is true only for a cup tie that was played and has a score', () => {
    expect(hasPlayedExtraMatch([league])).toBe(false)
    expect(hasPlayedExtraMatch([league, cup('Tweede ronde', '2026-09-23', 1, 0)])).toBe(true)
    expect(hasPlayedExtraMatch([cup('Tweede ronde', '2026-09-23', 1, 0, { status: 'scheduled' })])).toBe(false)
    expect(hasPlayedExtraMatch([cup('Tweede ronde', '2026-09-23', 1, 0, { goalsAgainst: null, goalsFor: null })])).toBe(
      false,
    )
  })

  it('is true for a match of the play-offs that was played, and not for one that was not', () => {
    expect(hasPlayedExtraMatch([league, playoffs('Halve finale', '2027-05-20', 2, 3)])).toBe(true)
    expect(hasPlayedExtraMatch([league, playoffs('Halve finale', '2027-05-20', 2, 3, { status: 'scheduled' })])).toBe(
      false,
    )
  })

  it('names the play-offs, and not the cup, when only the play-offs were played', () => {
    const matches = [league, playoffs('Halve finale', '2027-05-20', 2, 3)]

    expect(competitionNames(matches, 'all')).toBe('de Eredivisie en de play-offs')
    expect(competitionNames(matches, 'league')).toBe('de Eredivisie')
  })

  it('names the Eredivisie, the cup and the play-offs when all three were played', () => {
    const matches = [league, cup('Tweede ronde', '2026-09-23', 1, 0), playoffs('Halve finale', '2027-05-20', 2, 3)]

    expect(competitionNames(matches, 'all')).toBe('de Eredivisie, de KNVB Beker en de play-offs')
    expect(competitionNames(matches, 'league')).toBe('de Eredivisie')
  })

  it('names the cup only when it is counted and was played', () => {
    const matches = [league, cup('Tweede ronde', '2026-09-23', 1, 0)]

    expect(competitionNames(matches, 'all')).toBe('de Eredivisie en de KNVB Beker')
    expect(competitionNames(matches, 'league')).toBe('de Eredivisie')
    expect(competitionNames([league], 'all')).toBe('de Eredivisie')
  })
})

describe('a match of the play-offs in the numbers', () => {
  const season = [played('Speelronde 1', '2026-08-01', 2, 0), played('Speelronde 2', '2026-08-08', 1, 0)]
  const lost = playoffs('Halve finale', '2027-05-20', 2, 3, { goals: [goal(54), goal(77), goal(46, { ours: false })] })
  const matches = [...season, lost]

  it('counts for all the matches, like the cup, and for nothing in the Eredivisie alone', () => {
    expect(streaksOf(matches, 'all').played).toBe(3)
    expect(streaksOf(matches, 'league').played).toBe(2)
    expect(leagueResultsOf(matches)).toEqual(['W', 'W'])
  })

  it('leaves the home and away record of the Eredivisie as it was', () => {
    expect(homeAwayOf(matches, 'league')).toEqual(homeAwayOf(season, 'league'))
  })

  it('leaves the top scorers of the Eredivisie as they were', () => {
    expect(topScorersOf(matches, 'league')).toEqual(topScorersOf(season, 'league'))
  })

  it('has the goals of the match in the top scorers for all the matches', () => {
    expect(topScorersOf(matches, 'all')[0]).toMatchObject({ goals: 2 })
  })
})

describe('streaksOf with the choice', () => {
  const season = [played('Speelronde 1', '2026-08-01', 2, 0), played('Speelronde 2', '2026-08-08', 1, 0)]
  const lost = cup('Tweede ronde', '2026-08-15', 0, 3)
  const longest = (matches: PublicMatch[], choice: 'all' | 'league', label: string) =>
    streaksOf(matches, choice).streaks.find((streak) => streak.label === label)

  it('counts a lost cup tie as the end of a streak for all the matches, and not for the Eredivisie', () => {
    const matches = [...season, lost, played('Speelronde 3', '2026-08-22', 1, 0)]

    expect(longest(matches, 'league', 'Ongeslagen')).toMatchObject({ current: 3, longest: 3 })
    expect(longest(matches, 'all', 'Ongeslagen')).toMatchObject({ current: 1, longest: 2 })
    expect(streaksOf(matches, 'all').played).toBe(4)
    expect(streaksOf(matches, 'league').played).toBe(3)
  })

  it('counts the score after extra time: a win after extra time is a win', () => {
    const matches = [...season, cup('Tweede ronde', '2026-08-15', 2, 1, { extraTime: true })]

    expect(longest(matches, 'all', 'Gewonnen')).toMatchObject({ current: 3, longest: 3 })
  })

  it('ignores a shoot-out: a cup tie that is level after extra time is a draw, and the unbeaten streak goes on', () => {
    const matches = [
      ...season,
      cup('Tweede ronde', '2026-08-15', 1, 1, { extraTime: true, penaltiesAgainst: 5, penaltiesFor: 3 }),
      played('Speelronde 3', '2026-08-22', 1, 0),
    ]

    expect(longest(matches, 'all', 'Ongeslagen')).toMatchObject({ current: 4, longest: 4 })
    expect(longest(matches, 'all', 'Gewonnen')).toMatchObject({ current: 1, longest: 2 })
    expect(longest(matches, 'all', 'Zonder winst')).toMatchObject({ current: 0, longest: 1 })
    expect(streaksOf(matches, 'all').last.map(({ result }) => result)).toEqual(['W', 'W', 'G', 'W'])
  })

  it('counts nothing for a cup tie that is not played or has no score', () => {
    const matches = [
      ...season,
      cup('Tweede ronde', '2026-08-15', 0, 3, { status: 'scheduled' }),
      cup('Derde ronde', '2026-08-16', 0, 3, { goalsAgainst: null, goalsFor: null }),
    ]

    expect(streaksOf(matches, 'all')).toEqual(streaksOf(season, 'all'))
  })

  it('is the same for both choices in a season without a cup tie', () => {
    expect(streaksOf(season, 'all')).toEqual(streaksOf(season, 'league'))
  })

  it('counts the Eredivisie alone when no choice is given, as before', () => {
    expect(streaksOf([...season, lost])).toEqual(streaksOf(season, 'league'))
  })
})

describe('homeAwayOf with the choice', () => {
  const league = [
    played('Speelronde 1', '2026-08-01', 2, 0),
    played('Speelronde 2', '2026-08-08', 0, 1, { home: false }),
  ]
  const beker = cup('Tweede ronde', '2026-09-23', 3, 0, { home: false })

  it('adds the cup tie to the away matches for all the matches, and says the points are not all league points', () => {
    const all = homeAwayOf([...league, beker], 'all')

    expect(all.away).toMatchObject({ goalsFor: 3, lost: 1, played: 2, won: 1 })
    expect(all.total.played).toBe(3)
    expect(all.leagueOnly).toBe(false)
  })

  it('leaves the cup tie out for the Eredivisie, and then all counted matches are league matches', () => {
    const only = homeAwayOf([...league, beker], 'league')

    expect(only.total.played).toBe(2)
    expect(only.leagueOnly).toBe(true)
  })

  it('is league only for all the matches in a season without a cup tie, and with no match at all', () => {
    expect(homeAwayOf(league, 'all').leagueOnly).toBe(true)
    expect(homeAwayOf([], 'all').leagueOnly).toBe(true)
  })

  it('counts the score after extra time and treats a shoot-out as a draw', () => {
    const shootOut = cup('Derde ronde', '2026-10-28', 1, 1, { extraTime: true, penaltiesAgainst: 3, penaltiesFor: 4 })
    const all = homeAwayOf([shootOut], 'all')

    expect(all.total).toMatchObject({ drawn: 1, lost: 0, played: 1, won: 0 })
  })
})

describe('extremesOf with the choice', () => {
  const league = [played('Speelronde 1', '2026-08-01', 2, 0)]
  const beker = cup('Tweede ronde', '2026-09-23', 6, 0, { goals: [goal(3), goal(100)] })

  it('finds the biggest win in the cup for all the matches, and in the Eredivisie for that choice', () => {
    expect(extremesOf([...league, beker], 'all').biggestWin?.round).toBe('Tweede ronde')
    expect(extremesOf([...league, beker], 'league').biggestWin?.round).toBe('Speelronde 1')
    expect(extremesOf([...league, beker], 'all').played).toBe(2)
    expect(extremesOf([...league, beker], 'league').played).toBe(1)
  })

  it('takes the earliest goal from the cup but never a goal in extra time', () => {
    const { earliestGoal, latestGoal } = extremesOf([...league, beker], 'all')

    expect(earliestGoal?.goal.minute).toBe(3)
    expect(latestGoal?.goal.minute).toBe(3)
  })
})

describe('goalsPerQuarter with the choice', () => {
  const league = played('Speelronde 1', '2026-08-01', 1, 0, { goals: [goal(10)] })
  const beker = cup('Tweede ronde', '2026-09-23', 3, 1, {
    extraTime: true,
    goals: [goal(20), goal(100), goal(110), goal(30, { ours: false })],
  })

  it('counts the cup tie for all the matches and not for the Eredivisie', () => {
    expect(goalsPerQuarter([league, beker], 'all')).toMatchObject({
      conceded: [0, 1, 0, 0, 0, 0],
      known: 2,
      played: 2,
      scored: [1, 1, 0, 0, 0, 0],
    })
    expect(goalsPerQuarter([league, beker], 'league')).toMatchObject({
      known: 1,
      played: 1,
      scored: [1, 0, 0, 0, 0, 0],
    })
  })

  it('leaves the goals in extra time out and says there was extra time, only when the cup tie counts', () => {
    expect(goalsPerQuarter([league, beker], 'all').extraTime).toBe(true)
    expect(goalsPerQuarter([league, beker], 'league').extraTime).toBe(false)
  })

  it('counts the matches as before when no choice is given', () => {
    expect(goalsPerQuarter([league, beker])).toEqual(goalsPerQuarter([league, beker], 'all'))
  })
})

describe('cleanSheetsOf with the choice', () => {
  const league = [played('Speelronde 1', '2026-08-01', 1, 0), played('Speelronde 2', '2026-08-08', 1, 2)]
  const beker = cup('Tweede ronde', '2026-09-23', 0, 0, { extraTime: true, penaltiesAgainst: 2, penaltiesFor: 4 })

  it('counts the cup tie for all the matches, a 0-0 after extra time being a clean sheet whatever the shoot-out says', () => {
    const all = cleanSheetsOf([...league, beker], 'all')

    expect(all.played).toBe(3)
    expect(all.matches.map((item) => item.round)).toEqual(['Tweede ronde', 'Speelronde 1'])
  })

  it('leaves the cup tie out for the Eredivisie', () => {
    const only = cleanSheetsOf([...league, beker], 'league')

    expect(only.played).toBe(2)
    expect(only.matches.map((item) => item.round)).toEqual(['Speelronde 1'])
  })
})

describe('topScorersOf and scorersCoverage with the choice', () => {
  const league = played('Speelronde 1', '2026-08-01', 1, 0, { goals: [goal(10, { player: 'Proefman' })] })
  const beker = cup('Tweede ronde', '2026-09-23', 3, 0, {
    extraTime: true,
    goals: [goal(20, { player: 'Kopie' }), goal(100, { player: 'Kopie' }), goal(110, { player: 'Proefman' })],
  })
  const goalsOf = (matches: PublicMatch[], choice: 'all' | 'league') =>
    topScorersOf(matches, choice).map(({ goals, player }) => [player, goals])

  it('counts a goal in the cup for all the matches, extra time included', () => {
    expect(goalsOf([league, beker], 'all')).toEqual([
      ['Kopie', 2],
      ['Proefman', 2],
    ])
  })

  it('counts the Eredivisie alone for that choice', () => {
    expect(goalsOf([league, beker], 'league')).toEqual([['Proefman', 1]])
  })

  it('counts the matches the list is based on with the choice', () => {
    const missing = cup('Derde ronde', '2026-10-28', 2, 0)

    expect(scorersCoverage([league, beker, missing], 'all')).toEqual({ known: 2, played: 3 })
    expect(scorersCoverage([league, beker, missing], 'league')).toEqual({ known: 1, played: 1 })
  })
})

describe('the cards that do not follow the choice', () => {
  const league = [
    played('Speelronde 1', '2026-08-01', 2, 0, { goals: [goal(5), goal(50)] }),
    played('Speelronde 2', '2026-08-08', 0, 1, { goals: [goal(30, { ours: false })] }),
  ]
  const beker = cup('Tweede ronde', '2026-09-23', 4, 0, { goals: [goal(5), goal(8), goal(12), goal(70)] })

  it('keeps the season, and how the matches go, on the Eredivisie', () => {
    expect(leagueResultsOf([...league, beker])).toEqual(leagueResultsOf(league))
    expect(matchFlowOf([...league, beker])).toEqual(matchFlowOf(league))
  })
})
