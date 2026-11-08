import type { PublicMatch } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import { specialGoalsOf } from './matches'

type Goal = PublicMatch['goals'][number]

const goal = (player: string, options: Partial<Goal> = {}): Goal => ({
  minute: 10,
  ours: true,
  ownGoal: false,
  penalty: false,
  personFamilyName: null,
  personFamilyNamePrefix: null,
  personGivenName: null,
  personId: null,
  player,
  playerId: null,
  playerPage: null,
  stoppageMinutes: null,
  ...options,
})

/** A played match of ours with these goals, and the result they add up to. */
const played = (goals: Goal[], options: Partial<PublicMatch> = {}): PublicMatch => ({
  afterNinetyAgainst: null,
  afterNinetyFor: null,
  attendance: null,
  competition: 'Eredivisie',
  dateText: null,
  extraTime: false,
  goals,
  goalsAgainst: goals.filter((item) => !item.ours).length,
  goalsFor: goals.filter((item) => item.ours).length,
  home: true,
  kickoffAt: new Date('2026-08-01T14:30:00Z'),
  matchDate: '2026-08-01',
  note: null,
  opponent: 'Testdorp FC',
  penaltiesAgainst: null,
  penaltiesFor: null,
  referee: null,
  round: 'Speelronde 1',
  stadium: null,
  status: 'played',
  ...options,
})

const times = (count: number, make: (index: number) => Goal) => Array.from({ length: count }, (_, index) => make(index))
const names = (players: { player: string; times: number }[]) => players.map(({ player, times: n }) => [player, n])

describe('specialGoalsOf', () => {
  it('has nothing for a season without matches', () => {
    expect(specialGoalsOf([])).toEqual({
      doubles: [],
      goalsFor: 0,
      hattricks: [],
      known: 0,
      ownGoalsAgainst: 0,
      ownGoalsFor: 0,
      penalties: 0,
      played: 0,
    })
  })

  it('has nothing to count in a season whose matches have no goals, and says how many were played', () => {
    const noScorers = played([], { goalsAgainst: 1, goalsFor: 2 })
    const result = specialGoalsOf([noScorers, played([], { goalsAgainst: 0, goalsFor: 0 })])

    expect(result.goalsFor).toBe(0)
    expect(result.hattricks).toEqual([])
    expect(result.known).toBe(1)
    expect(result.played).toBe(2)
  })

  it('counts one match with a goal and nothing special in it', () => {
    const result = specialGoalsOf([played([goal('Proefman')])])

    expect(result).toMatchObject({ doubles: [], goalsFor: 1, hattricks: [], known: 1, penalties: 0, played: 1 })
  })

  it('finds a hattrick, and counts four goals as one too', () => {
    const matches = [
      played(times(3, () => goal('Proefman'))),
      played(
        times(4, () => goal('Nepper')),
        { matchDate: '2026-08-08' },
      ),
    ]

    expect(names(specialGoalsOf(matches).hattricks)).toEqual([
      ['Nepper', 1],
      ['Proefman', 1],
    ])
    expect(specialGoalsOf(matches).doubles).toEqual([])
  })

  it('counts a goal without a minute as a goal: for the hattrick and for the penalties', () => {
    const result = specialGoalsOf([
      played([goal('Proefman', { minute: null }), goal('Proefman'), goal('Proefman', { penalty: true })]),
    ])

    expect(names(result.hattricks)).toEqual([['Proefman', 1]])
    expect(result.penalties).toBe(1)
    expect(result.goalsFor).toBe(3)
  })

  it('finds a double, which is exactly two goals in a match', () => {
    const matches = [played([goal('Proefman'), goal('Proefman'), goal('Nepper')])]

    expect(names(specialGoalsOf(matches).doubles)).toEqual([['Proefman', 1]])
    expect(specialGoalsOf(matches).hattricks).toEqual([])
  })

  it('keeps a player with a hattrick out of the doubles of that match, but not of another match', () => {
    const matches = [
      played([goal('Proefman'), goal('Proefman'), goal('Proefman'), goal('Nepper'), goal('Nepper')]),
      played([goal('Proefman'), goal('Proefman')]),
    ]
    const { doubles, hattricks } = specialGoalsOf(matches)

    expect(names(hattricks)).toEqual([['Proefman', 1]])
    expect(names(doubles)).toEqual([
      ['Nepper', 1],
      ['Proefman', 1],
    ])
  })

  it('counts how often a player did it, the most often first and A to Z on the surname when level', () => {
    const double = (player: string) => [goal(player), goal(player)]
    const matches = [
      played(double('Zeta')),
      played(double('Alfa')),
      played([...double('Beta'), ...double('Zeta')]),
      played(double('Zeta')),
    ]

    expect(names(specialGoalsOf(matches).doubles)).toEqual([
      ['Zeta', 3],
      ['Alfa', 1],
      ['Beta', 1],
    ])
  })

  it('does not count the goals of two matches together', () => {
    const matches = [played([goal('Proefman'), goal('Proefman')]), played([goal('Proefman')])]

    expect(specialGoalsOf(matches).hattricks).toEqual([])
    expect(names(specialGoalsOf(matches).doubles)).toEqual([['Proefman', 1]])
  })

  it('counts a penalty as a goal of the player and as a penalty, out of all our goals', () => {
    const matches = [
      played([goal('Proefman', { penalty: true }), goal('Proefman', { penalty: true }), goal('Nepper')]),
      played([goal('Tegenstander', { ours: false, penalty: true })]),
    ]
    const result = specialGoalsOf(matches)

    expect(result.penalties).toBe(2)
    expect(result.goalsFor).toBe(3)
    expect(names(result.doubles)).toEqual([['Proefman', 1]])
  })

  it('counts an own goal of the opponent as a goal for us but not for a player, and an own goal of ours against us', () => {
    const matches = [
      played([
        goal('Teststraat', { ownGoal: true }),
        goal('Teststraat', { ownGoal: true }),
        goal('Proefman', { minute: 20, ours: false, ownGoal: true }),
      ]),
    ]
    const result = specialGoalsOf(matches)

    expect(result).toMatchObject({ doubles: [], goalsFor: 2, hattricks: [], ownGoalsAgainst: 1, ownGoalsFor: 2 })
  })

  it('does not count the goals of the opponent for anybody, even a player with the same name', () => {
    const matches = [played([goal('Proefman'), goal('Proefman', { ours: false }), goal('Proefman', { ours: false })])]

    expect(specialGoalsOf(matches)).toMatchObject({ doubles: [], goalsFor: 1, hattricks: [] })
  })

  it('counts a goal without a minute, and a goal in stoppage time, like any other', () => {
    const matches = [
      played([goal('Proefman', { minute: 0 }), goal('Proefman', { stoppageMinutes: 3 }), goal('Proefman')]),
    ]

    expect(names(specialGoalsOf(matches).hattricks)).toEqual([['Proefman', 1]])
  })

  it('counts a goal with only a name as a goal of that name, and tells two names apart', () => {
    const matches = [played([goal('Proefman'), goal('Proefman'), goal('Nepper'), goal('Nepper')])]

    expect(names(specialGoalsOf(matches).doubles)).toEqual([
      ['Nepper', 1],
      ['Proefman', 1],
    ])
  })

  it('counts the goals of one person under two titles together', () => {
    const person = { personFamilyName: 'Finnbogason', personGivenName: 'Alfreð', personId: 7 }
    const matches = [
      played([
        goal('Finnbogason', { ...person, playerPage: 'Alfreð Finnbogason' }),
        goal('Finnbogason', { ...person, playerPage: 'Alfred Finnbogason' }),
        goal('Finnbogason', { ...person, playerId: 3 }),
      ]),
    ]

    expect(specialGoalsOf(matches).hattricks).toEqual([
      { givenName: 'Alfreð', id: 'person:7', player: 'Alfreð Finnbogason', surname: 'Finnbogason', times: 1 },
    ])
  })

  it('makes two people with the same surname two rows', () => {
    const jansen = (id: number, given: string) =>
      goal('Jansen', { personFamilyName: 'Jansen', personGivenName: given, personId: id })
    const matches = [played([jansen(1, 'Bram'), jansen(1, 'Bram'), jansen(2, 'Kees'), jansen(2, 'Kees')])]

    expect(specialGoalsOf(matches).doubles.map((item) => item.player)).toEqual(['Bram Jansen', 'Kees Jansen'])
  })

  it('puts people in order on the family name without the prefix', () => {
    const named = (id: number, given: string, prefix: null | string, family: string) =>
      goal(family, { personFamilyName: family, personFamilyNamePrefix: prefix, personGivenName: given, personId: id })
    const matches = [
      played([named(1, 'Zoë', null, 'Zwart'), named(1, 'Zoë', null, 'Zwart')]),
      played([named(2, 'Joost', 'van', 'Aken'), named(2, 'Joost', 'van', 'Aken')]),
    ]

    expect(specialGoalsOf(matches).doubles.map((item) => item.player)).toEqual(['Joost van Aken', 'Zoë Zwart'])
  })

  it('leaves out a match that is not played, and one with a score and no goals', () => {
    const matches = [
      played(
        times(3, () => goal('Proefman')),
        { status: 'scheduled' },
      ),
      played([], { goalsAgainst: 1, goalsFor: 3 }),
      played([goal('Nepper')]),
    ]
    const result = specialGoalsOf(matches)

    expect(result).toMatchObject({ goalsFor: 1, hattricks: [], known: 1, played: 2 })
  })

  describe('with the choice between the league and the cup', () => {
    const cup = played(
      times(3, () => goal('Proefman', { penalty: true })),
      { competition: 'KNVB Beker', round: 'Tweede ronde' },
    )
    const league = played([goal('Nepper')])

    it('counts a cup match only for all matches', () => {
      const all = specialGoalsOf([league, cup], 'all')
      const eredivisie = specialGoalsOf([league, cup], 'league')

      expect(names(all.hattricks)).toEqual([['Proefman', 1]])
      expect(all).toMatchObject({ goalsFor: 4, known: 2, penalties: 3, played: 2 })
      expect(eredivisie).toMatchObject({ goalsFor: 1, hattricks: [], known: 1, penalties: 0, played: 1 })
    })

    it('counts all matches by default', () => {
      expect(specialGoalsOf([league, cup])).toEqual(specialGoalsOf([league, cup], 'all'))
    })
  })
})
