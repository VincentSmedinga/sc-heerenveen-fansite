import { describe, expect, it } from 'vitest'

import {
  type AllTimeMatch,
  allTimeScorersOf,
  countRows,
  hattricksOf,
  lineupSentence,
  penaltiesOf,
  yearsAtClub,
} from './all-time-players'

type Goal = AllTimeMatch['goals'][number]

const goal = (player: string, options: Partial<Goal> = {}): Goal => ({
  minute: 10,
  ours: true,
  ownGoal: false,
  penalty: false,
  personFamilyName: null,
  personFamilyNamePrefix: null,
  personGivenName: null,
  personId: null,
  personSlug: null,
  player,
  playerId: null,
  playerPage: null,
  stoppageMinutes: null,
  ...options,
})

const person = (id: number, family: string, options: Partial<Goal> = {}) =>
  goal(family, { personFamilyName: family, personGivenName: 'Pier', personId: id, ...options })

/** A played match of ours in a season, with these goals and the result they add up to. */
const inSeason = (season: string, goals: Goal[], options: Partial<AllTimeMatch> = {}): AllTimeMatch => ({
  competition: 'Eredivisie',
  dataSource: 'wikipedia',
  goals,
  goalsAgainst: goals.filter((item) => !item.ours).length,
  goalsFor: goals.filter((item) => item.ours).length,
  home: true,
  matchDate: `${season.slice(0, 4)}-09-12`,
  opponent: 'FC Proef',
  round: 'Speelronde 1',
  season,
  status: 'played',
  ...options,
})

const noSeasons = new Map<number, string[]>()

describe('yearsAtClub', () => {
  it('runs from the start of the first season to the end of the last', () => {
    expect(yearsAtClub(['2013/14', '2012/13'])).toBe('2012–2014')
  })

  it('counts a single season as the two years it spans', () => {
    expect(yearsAtClub(['1999/00'])).toBe('1999–2000')
  })

  it('stays a bar for a player we know no seasons of', () => {
    expect(yearsAtClub(undefined)).toBe('–')
    expect(yearsAtClub([])).toBe('–')
  })
})

describe('allTimeScorersOf', () => {
  it('counts a person who scored in two seasons once, with the years from the squad', () => {
    const { top } = allTimeScorersOf(
      [
        inSeason('2010/11', [person(1, 'Dijk'), person(1, 'Dijk')]),
        inSeason('2011/12', [person(1, 'Dijk', { player: 'P. Dijk' }), person(2, 'Berg')]),
      ],
      'all',
      new Map([[1, ['2010/11', '2011/12', '2012/13']]]),
    )

    expect(top.map(({ goals, players, position }) => [position, goals, players[0].id, players[0].years])).toEqual([
      [1, 3, 'person:1', '2010–2013'],
      [2, 1, 'person:2', '–'],
    ])
  })

  it('splits the list at place ten: places 11 to 25 are for the block that opens, and nobody is in both', () => {
    const goals = Array.from({ length: 30 }, (_, index) =>
      Array.from({ length: 31 - index }, () => goal(`Speler ${String(index).padStart(2, '0')}`)),
    ).flat()
    const { more, top, topGoals, total } = allTimeScorersOf([inSeason('2010/11', goals)], 'all', noSeasons)

    expect(total).toBe(30)
    expect(top.map((place) => place.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(more.map((place) => place.position)[0]).toBe(11)
    expect(more.at(-1)?.position).toBe(25)
    expect(topGoals).toBe(31)
  })

  it('gives players who share a place one place, and the place of the tenth belongs to all who share it', () => {
    const counts = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 3, 1]
    const goals = counts.flatMap((count, index) => Array.from({ length: count }, () => goal(`Speler ${index + 10}`)))
    const { more, top } = allTimeScorersOf([inSeason('2010/11', goals)], 'all', noSeasons)

    expect(top.at(-1)?.players).toHaveLength(2)
    expect(top.at(-1)).toMatchObject({ goals: 3, position: 10 })
    expect(more).toEqual([expect.objectContaining({ goals: 1, position: 12 })])
  })

  it('says from which season it counts: the first season with a match, whatever the order', () => {
    expect(
      allTimeScorersOf(
        [inSeason('2012/13', [goal('A')]), inSeason('2010/11', []), inSeason('2011/12', [goal('B')])],
        'all',
        noSeasons,
      ).since,
    ).toBe('2010/11')
    expect(allTimeScorersOf([], 'all', noSeasons).since).toBeUndefined()
  })

  it('follows the choice: the Eredivisie alone leaves out a goal in the cup', () => {
    const matches = [
      inSeason('2010/11', [goal('Liga')]),
      inSeason('2010/11', [goal('Beker'), goal('Beker')], { competition: 'KNVB Beker' }),
    ]
    const names = (choice: 'all' | 'league') =>
      allTimeScorersOf(matches, choice, noSeasons).top.flatMap((place) => place.players.map((player) => player.player))

    expect(names('all')).toEqual(['Beker', 'Liga'])
    expect(names('league')).toEqual(['Liga'])
  })
})

describe('hattricksOf', () => {
  const trio = (name: string) => [goal(name), goal(name), goal(name)]

  it('lists a hattrick with the match, and counts three goals or more, a penalty included', () => {
    const { list, total } = hattricksOf(
      [
        inSeason('2010/11', [goal('Drie'), goal('Drie'), goal('Drie', { penalty: true }), goal('Twee'), goal('Twee')]),
        inSeason('2011/12', [goal('Vier'), goal('Vier'), goal('Vier'), goal('Vier')], {
          home: false,
          opponent: 'HZVV',
        }),
      ],
      'all',
    )

    expect(total).toBe(2)
    expect(list.map((item) => [item.scorer.player, item.goals, item.match.date])).toEqual([
      ['Vier', 4, '2011-09-12'],
      ['Drie', 3, '2010-09-12'],
    ])
    expect(list[0]?.match.label).toBe('HZVV 0–4 sc Heerenveen')
    expect(list[1]?.match.label).toBe('sc Heerenveen 5–0 FC Proef')
  })

  it('does not count an own goal of ours, or three goals of the opponent', () => {
    const own = [goal('Eigen', { ours: false, ownGoal: true }), goal('Eigen', { ours: false, ownGoal: true })]
    const them = [goal('Zij', { ours: false }), goal('Zij', { ours: false }), goal('Zij', { ours: false })]

    expect(
      hattricksOf([inSeason('2010/11', [...own, goal('Eigen', { ours: false, ownGoal: true }), ...them])], 'all').total,
    ).toBe(0)
  })

  it('counts a match whose goals we do not know for nothing', () => {
    expect(hattricksOf([inSeason('2010/11', [], { goalsAgainst: 0, goalsFor: 3 })], 'all').total).toBe(0)
  })

  it('puts the players with the most first, level players on one place, within the first five places', () => {
    const matches = [
      inSeason('2010/11', trio('Alfa')),
      inSeason('2011/12', trio('Alfa')),
      inSeason('2012/13', trio('Beta')),
      inSeason('2013/14', trio('Gamma')),
      ...['Delta', 'Eta', 'Zeta', 'Theta'].map((name, index) => inSeason(`201${4 + index}/1${5 + index}`, trio(name))),
    ]
    const { top } = hattricksOf(matches, 'all')

    expect(top.map(({ position, scorer, times }) => [position, scorer.player, times])).toEqual([
      [1, 'Alfa', 2],
      [2, 'Beta', 1],
      [2, 'Delta', 1],
      [2, 'Eta', 1],
      [2, 'Gamma', 1],
      [2, 'Theta', 1],
      [2, 'Zeta', 1],
    ])
  })

  it('follows the choice of competition', () => {
    const matches = [inSeason('2010/11', trio('Beker'), { competition: 'KNVB Beker' })]

    expect(hattricksOf(matches, 'cup').total).toBe(1)
    expect(hattricksOf(matches, 'league').total).toBe(0)
  })
})

describe('penaltiesOf', () => {
  it('counts the penalties of sc Heerenveen per player, and the total', () => {
    const { top, total } = penaltiesOf(
      [
        inSeason('2010/11', [goal('Alfa', { penalty: true }), goal('Alfa', { penalty: true }), goal('Beta')]),
        inSeason('2011/12', [
          goal('Beta', { penalty: true }),
          goal('Tegen', { ours: false, penalty: true }),
          goal('Eigen', { ours: false, ownGoal: true }),
        ]),
      ],
      'all',
    )

    expect(total).toBe(3)
    expect(top.map(({ position, scorer, times }) => [position, scorer.player, times])).toEqual([
      [1, 'Alfa', 2],
      [2, 'Beta', 1],
    ])
  })

  it('has nothing when no match has a penalty', () => {
    expect(penaltiesOf([inSeason('2010/11', [goal('Alfa')])], 'all')).toEqual({ top: [], total: 0 })
  })
})

describe('countRows', () => {
  it('puts players with the same count in one row, with the place they share', () => {
    const { top } = penaltiesOf(
      [inSeason('2010/11', [goal('Alfa', { penalty: true }), goal('Beta', { penalty: true })])],
      'all',
    )

    expect(
      countRows(top).map(({ goals, players, position }) => [position, goals, players.map((p) => p.player)]),
    ).toEqual([[1, 1, ['Alfa', 'Beta']]])
  })
})

describe('lineupSentence', () => {
  it('says the stretches whose line-ups we have, and "vanaf" for one that reaches the current season', () => {
    const seasons = ['1992/93', '1993/94', '2005/06', '2026/27']

    expect(lineupSentence(seasons, '2026/27')).toBe(
      'Wedstrijden, minuten en assists per speler kennen we alleen van 1992/93 tot en met 1993/94, in 2005/06 en vanaf 2026/27. Daarom heeft deze pagina er geen lijst aller tijden van.',
    )
  })

  it('joins seasons that follow each other, whatever the order they are given in', () => {
    expect(lineupSentence(['2004/05', '2003/04', '2005/06'], '2026/27')).toContain('van 2003/04 tot en met 2005/06')
  })

  it('says so when no season has line-ups', () => {
    expect(lineupSentence([], '2026/27')).toContain('nog van geen enkel seizoen')
  })
})
