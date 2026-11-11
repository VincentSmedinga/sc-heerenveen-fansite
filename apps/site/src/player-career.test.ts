import { describe, expect, it } from 'vitest'

import type { CareerMatch, PlayerSeason } from './player-seasons'

import { careerCoverage, careerMoments, careerPeriods, momentText } from './player-career'

let nextId = 1

/** A made-up match on a day of a season. */
const matchIn = (season: string, day: string): CareerMatch => ({
  competition: 'Eredivisie',
  goalsAgainst: 0,
  goalsFor: 1,
  home: true,
  id: nextId++,
  matchDate: `${season.slice(0, 4)}-${day}`,
  opponent: 'Testclub',
  round: String(nextId),
  season,
})

const goalIn = (match: CareerMatch, minute?: number) => ({ match, minute, stoppage: undefined })

/** A made-up season; `complete` says whether we have every line-up of it. */
const seasonOf = (season: string, extra: Partial<PlayerSeason> = {}, complete = true): PlayerSeason => ({
  assists: undefined,
  cleanSheets: undefined,
  conceded: undefined,
  goalMoments: [],
  goals: 0,
  goalsByCompetition: {},
  lineupMatches: [],
  matchesInSeason: 34,
  played: undefined,
  red: undefined,
  reportedMatches: complete ? 34 : 10,
  season,
  shirtNumber: undefined,
  source: complete ? 'lineups' : 'some-lineups',
  started: undefined,
  yellow: undefined,
  ...extra,
})

describe('the moment of a season', () => {
  it('is his first match when we have the line-ups of that season and of the seasons before', () => {
    const first = matchIn('2003/04', '08-10')
    const moments = careerMoments([
      seasonOf('2004/05', { lineupMatches: [matchIn('2004/05', '08-10')] }),
      seasonOf('2003/04', { goalMoments: [goalIn(first, 10)], lineupMatches: [first, matchIn('2003/04', '09-10')] }),
    ])

    expect(moments.get('2003/04')).toMatchObject({ kind: 'first-match', match: first })
  })

  it('has no first match when an earlier season has no complete line-ups, and takes his first goal', () => {
    const first = matchIn('2003/04', '08-10')
    const goal = matchIn('2003/04', '09-10')
    const moments = careerMoments([
      seasonOf('2003/04', { goalMoments: [goalIn(goal, 12)], lineupMatches: [first, goal] }, false),
    ])

    expect(moments.get('2003/04')).toMatchObject({ kind: 'first-goal', match: goal })
  })

  it('takes a hattrick before a double, and a double before his last goal', () => {
    const early = matchIn('2004/05', '08-10')
    const double = matchIn('2004/05', '09-10')
    const hattrick = matchIn('2004/05', '10-10')
    const last = matchIn('2004/05', '11-10')
    const moments = careerMoments([
      seasonOf('2003/04', { goalMoments: [goalIn(matchIn('2003/04', '08-10'))] }, false),
      seasonOf(
        '2004/05',
        {
          goalMoments: [
            goalIn(early),
            goalIn(double, 5),
            goalIn(double, 50),
            goalIn(hattrick, 25),
            goalIn(hattrick, 30),
            goalIn(hattrick, 32),
            goalIn(last),
          ],
        },
        false,
      ),
    ])

    expect(moments.get('2004/05')).toMatchObject({ kind: 'hattrick', match: hattrick })
  })

  it('takes a double when there is no hattrick, then his last goal, then his last match', () => {
    const double = matchIn('2004/05', '09-10')
    const lastGoal = matchIn('2005/06', '09-10')
    const lastMatch = matchIn('2005/06', '12-10')
    const moments = careerMoments([
      seasonOf('2003/04', { goalMoments: [goalIn(matchIn('2003/04', '08-10'))] }, false),
      seasonOf('2004/05', { goalMoments: [goalIn(double), goalIn(double)] }, false),
      seasonOf('2005/06', { goalMoments: [goalIn(lastGoal)], lineupMatches: [lastGoal, lastMatch] }),
      seasonOf('2006/07', {}, false),
    ])

    expect(moments.get('2004/05')).toMatchObject({ kind: 'double', match: double })
    // His last goal is in 2005/06; the last match of the career is in a season we do not know.
    expect(moments.get('2005/06')).toMatchObject({ kind: 'last-goal', match: lastGoal })
    expect(moments.has('2006/07')).toBe(false)
  })

  it('takes his last match when he has no goal and every later line-up is known', () => {
    const last = matchIn('2005/06', '12-10')
    const moments = careerMoments([
      seasonOf('2004/05', { lineupMatches: [matchIn('2004/05', '08-10')] }, false),
      seasonOf('2005/06', { lineupMatches: [matchIn('2005/06', '08-10'), last] }),
    ])

    expect(moments.get('2005/06')).toMatchObject({ kind: 'last-match', match: last })
    expect(moments.has('2004/05')).toBe(false)
  })

  it('does not name a first match for a season without every line-up, and uses a match once', () => {
    const shared = matchIn('2003/04', '08-10')
    const moments = careerMoments([
      seasonOf('2003/04', { goalMoments: [goalIn(shared, 5)], lineupMatches: [shared] }, false),
    ])

    expect(moments.get('2003/04')?.kind).toBe('first-goal')

    // The match of the first goal is also his only goal of the next season's double.
    const again = careerMoments([
      seasonOf('2003/04', { goalMoments: [goalIn(shared)], lineupMatches: [shared] }),
      seasonOf('2004/05', { goalMoments: [goalIn(shared), goalIn(shared)] }, false),
    ])

    expect(again.get('2003/04')?.kind).toBe('first-match')
    expect(again.has('2004/05')).toBe(false)
  })
})

describe('what a moment says', () => {
  const goal = (minute?: number, stoppage?: number) => ({ match: matchIn('2003/04', '08-10'), minute, stoppage })

  it('has the minutes we know and drops the ones we do not', () => {
    expect(momentText({ goals: [goal(25), goal(30), goal(32)], kind: 'hattrick' })).toBe('hattrick: 25′, 30′ en 32′')
    expect(momentText({ goals: [goal(25), goal(), goal(32)], kind: 'hattrick' })).toBe('hattrick: 25′ en 32′')
    expect(momentText({ goals: [goal(), goal()], kind: 'double' })).toBe('twee doelpunten')
    expect(momentText({ goals: [goal(90, 2)], kind: 'last-goal' })).toBe('laatste doelpunt: 90+2′')
    expect(momentText({ goals: [], kind: 'first-match' })).toBe('eerste wedstrijd')
  })
})

describe('the career as periods', () => {
  const options = {
    current: '2026/27',
    matchHref: () => undefined,
    moments: new Map(),
    seasonHref: (s: string) => `/${s}`,
  }

  it('has a period for seasons that follow each other, with the gap under the newer one', () => {
    const periods = careerPeriods(
      [seasonOf('2026/27'), seasonOf('2025/26'), seasonOf('2009/10'), seasonOf('2006/07'), seasonOf('2005/06')],
      options,
    )

    expect(periods.map(({ years }) => years)).toEqual(['2025–nu', '2009–2010', '2005–2007'])
    expect(periods[0]?.gap).toBe('2010/11 tot en met 2024/25: niet in de selectie')
    expect(periods[1]?.gap).toBe('2007/08 tot en met 2008/09: niet in de selectie')
    expect(periods[2]?.gap).toBeUndefined()
    expect(periods[0]?.seasons.map(({ season }) => season)).toEqual(['2026/27', '2025/26'])
    expect(periods[0]?.seasons[0]).toMatchObject({ current: true })
  })

  it('names a gap of one season by that season', () => {
    expect(careerPeriods([seasonOf('2008/09'), seasonOf('2006/07')], options)[0]?.gap).toBe(
      '2007/08: niet in de selectie',
    )
  })

  it('has the shirt number, the goals by competition and a remark, and no numbers of the table', () => {
    const [period] = careerPeriods(
      [
        seasonOf('2003/04', { goalsByCompetition: { Eredivisie: 11, 'Europa League': 3 }, shirtNumber: 9 }),
        seasonOf('2002/03', { reportedMatches: 0, source: 'none' }, false),
        seasonOf('2001/02', {}, false),
      ],
      options,
    )

    expect(period?.seasons[0]).toEqual({
      competitions: 'Eredivisie 11 · Europa League 3',
      href: '/2003/04',
      number: '9',
      season: '2003/04',
    })
    expect(period?.seasons[1]).toMatchObject({ remark: 'Geen opstellingen van dit seizoen.' })
    expect(period?.seasons[2]).toMatchObject({ remark: 'Nog niet alle wedstrijden van dit seizoen staan op de site.' })
  })
})

describe('the sentence above the career', () => {
  it('says for how many seasons we have the line-ups', () => {
    const complete = seasonOf('2003/04')
    const partial = seasonOf('2004/05', {}, false)

    expect(careerCoverage([complete, partial, partial])).toBe(
      'Van 1 van zijn 3 seizoenen hebben we de opstellingen. Van de andere alleen de doelpunten.',
    )
    expect(careerCoverage([complete, complete])).toBe('Van alle 2 seizoenen hebben we de opstellingen.')
    expect(careerCoverage([partial, partial])).toBe('Van zijn 2 seizoenen hebben we alleen de doelpunten.')
    expect(careerCoverage([complete])).toBe('Van zijn enige seizoen hebben we de opstellingen.')
  })
})
