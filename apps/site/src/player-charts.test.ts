import { describe, expect, it } from 'vitest'

import type { CareerGoal, CareerMatch, PlayerSeason } from './player-seasons'

import { goalQuartersOf, playerRecordOf, seasonBarsOf } from './player-charts'

const match = (extra: Partial<CareerMatch> = {}): CareerMatch => ({
  competition: 'Eredivisie',
  goalsAgainst: 0,
  goalsFor: 1,
  home: true,
  id: 1,
  matchDate: '2004-04-10',
  opponent: 'Test FC',
  round: '1',
  season: '2003/04',
  ...extra,
})

const goal = (minute: number | undefined, stoppage?: number): CareerGoal => ({
  match: match(),
  minute,
  stoppage,
})

const season = (name: string, extra: Partial<PlayerSeason> = {}): PlayerSeason => ({
  assists: 0,
  cleanSheets: undefined,
  conceded: undefined,
  goalMoments: [],
  goals: 2,
  goalsByCompetition: {},
  lineupMatches: [],
  matchesInSeason: 34,
  played: 20,
  red: 0,
  reportedMatches: 34,
  season: name,
  shirtNumber: undefined,
  source: 'lineups',
  started: 18,
  yellow: 0,
  ...extra,
})

describe('seasonBarsOf', () => {
  it('shows the goals per season for an attacker, the oldest season first, with at least 5 goals', () => {
    const bars = seasonBarsOf([season('2004/05', { goals: 3 }), season('2003/04', { goals: 2 })], 'aanvaller')

    expect(bars?.title).toBe('Doelpunten per seizoen')
    expect(bars?.rows).toEqual([
      { season: '2003/04', value: 2 },
      { season: '2004/05', value: 3 },
    ])
  })

  it('has no card with fewer than 5 goals, and gives a player without a line the goals too', () => {
    expect(seasonBarsOf([season('2003/04', { goals: 4 })], 'middenvelder')).toBeUndefined()
    expect(seasonBarsOf([season('2003/04', { goals: 5 })], undefined)?.title).toBe('Doelpunten per seizoen')
  })

  it('leaves a season without a number out, and keeps a season with 0', () => {
    const bars = seasonBarsOf(
      [season('2005/06', { goals: 5 }), season('2004/05', { goals: undefined }), season('2003/04', { goals: 0 })],
      'aanvaller',
    )

    expect(bars?.rows.map(({ season: name }) => name)).toEqual(['2003/04', '2005/06'])
  })

  it('shows the matches for a defender and the clean sheets for a goalkeeper, from two seasons on', () => {
    const seasons = [
      season('2004/05', { cleanSheets: 9, played: 30 }),
      season('2003/04', { cleanSheets: undefined, played: 20 }),
    ]

    expect(seasonBarsOf(seasons, 'verdediger')?.title).toBe('Wedstrijden per seizoen')
    expect(seasonBarsOf(seasons, 'verdediger')?.rows).toHaveLength(2)
    expect(seasonBarsOf(seasons, 'doelman')).toBeUndefined()
    expect(seasonBarsOf([...seasons, season('2002/03', { cleanSheets: 4 })], 'doelman')?.title).toBe(
      'De nul per seizoen',
    )
    expect(seasonBarsOf([season('2003/04', { played: 20 })], 'verdediger')).toBeUndefined()
  })
})

describe('goalQuartersOf', () => {
  const withGoals = (...goals: CareerGoal[]) => [season('2003/04', { goalMoments: goals })]

  it('counts the goals per quarter of an hour', () => {
    const quarters = goalQuartersOf(withGoals(goal(1), goal(15), goal(16), goal(45), goal(46), goal(90)))

    expect(quarters?.counts).toEqual([2, 1, 1, 1, 0, 1])
  })

  it('counts a goal in added time with the quarter before it, and drops a goal in extra time', () => {
    const quarters = goalQuartersOf(withGoals(goal(45, 2), goal(90, 3), goal(10), goal(20), goal(30), goal(105)))

    expect(quarters?.counts).toEqual([1, 2, 1, 0, 0, 1])
  })

  it('says how many goals have no minute, and needs 5 goals with a minute', () => {
    const quarters = goalQuartersOf(withGoals(goal(5), goal(10), goal(20), goal(30), goal(40), goal(undefined)))

    expect(quarters).toMatchObject({ total: 6, unknown: 1 })
    expect(
      goalQuartersOf(withGoals(goal(5), goal(10), goal(20), goal(30), goal(undefined), goal(undefined))),
    ).toBeUndefined()
  })
})

describe('playerRecordOf', () => {
  it('counts the matches in the line-ups, and a win on penalties as a win', () => {
    const lineupMatches = [
      match({ goalsFor: 2 }),
      match({ goalsAgainst: 1, goalsFor: 1 }),
      match({ goalsAgainst: 3, goalsFor: 0 }),
      match({ goalsAgainst: 1, goalsFor: 1, penaltiesAgainst: 3, penaltiesFor: 4 }),
    ]

    expect(playerRecordOf([season('2003/04', { lineupMatches })], false)).toEqual({
      draws: 1,
      losses: 1,
      title: 'Uitslagen met hem in het veld',
      wins: 2,
    })
  })

  it('says "in het doel" for a goalkeeper, and has no card without line-ups', () => {
    expect(playerRecordOf([season('2003/04', { lineupMatches: [match()] })], true)?.title).toBe(
      'Uitslagen met hem in het doel',
    )
    expect(playerRecordOf([season('2003/04')], false)).toBeUndefined()
  })
})
