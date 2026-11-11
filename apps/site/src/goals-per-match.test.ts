import type { PublicMatch } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import { goalsPerMatchOf } from './goals-per-match'

type Goal = PublicMatch['goals'][number]

const goal = (player: string, playerId: null | number, options: Partial<Goal> = {}): Goal => ({
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
  playerId,
  playerPage: null,
  stoppageMinutes: null,
  ...options,
})

/** A played match of the competition with these goals. */
const matchOf = (competition: PublicMatch['competition'], goals: Goal[], status: PublicMatch['status'] = 'played') =>
  ({
    competition,
    goals,
    goalsAgainst: 0,
    goalsFor: goals.filter((item) => item.ours).length,
    status,
  }) as const

const stat = (
  playerId: number,
  appearances: number,
  goals: number,
  competition: 'Eredivisie' | 'KNVB Beker' = 'Eredivisie',
) => ({ appearances, competition, goals, playerId })

// Two players: Proefman (id 1) scores two in the league, Nepper (id 2) one.
const league = [
  matchOf('Eredivisie', [goal('Proefman', 1), goal('Nepper', 2)]),
  matchOf('Eredivisie', [goal('Proefman', 1)]),
]

describe('goalsPerMatchOf', () => {
  it('divides the goals of each scorer by the appearances when everything agrees', () => {
    const result = goalsPerMatchOf(league, 'league', [stat(1, 4, 2), stat(2, 1, 1)])

    expect(result).toEqual(
      new Map([
        ['id:1', 0.5],
        ['id:2', 1],
      ]),
    )
  })

  it('has no column when one scorer has no appearances, or no row in the table at all', () => {
    expect(goalsPerMatchOf(league, 'league', [stat(1, 4, 2), stat(2, 0, 1)])).toBeUndefined()
    expect(goalsPerMatchOf(league, 'league', [stat(1, 4, 2)])).toBeUndefined()
  })

  it('has no column when the goals of one scorer in the table differ from those of the card', () => {
    expect(goalsPerMatchOf(league, 'league', [stat(1, 4, 3), stat(2, 1, 1)])).toBeUndefined()
    expect(goalsPerMatchOf(league, 'league', [stat(1, 4, 1), stat(2, 1, 1)])).toBeUndefined()
  })

  it('has no column for a goal that is not linked to a player, and none without scorers', () => {
    const unlinked = [matchOf('Eredivisie', [goal('Proefman', 1), goal('Nepper', null)])]

    expect(goalsPerMatchOf(unlinked, 'league', [stat(1, 4, 1), stat(2, 1, 1)])).toBeUndefined()
    expect(goalsPerMatchOf([matchOf('Eredivisie', [])], 'league', [stat(1, 4, 2)])).toBeUndefined()
    expect(goalsPerMatchOf([], 'league', [])).toBeUndefined()
  })

  it('does not count an own goal or a goal of an opponent for a scorer', () => {
    const matches = [
      matchOf('Eredivisie', [
        goal('Proefman', 1),
        goal('Nepper', 2, { ownGoal: true }),
        goal('Teststraat', null, { ours: false }),
      ]),
    ]

    expect(goalsPerMatchOf(matches, 'league', [stat(1, 2, 1)])).toEqual(new Map([['id:1', 0.5]]))
  })

  it('adds the goals and the appearances of the cup for all matches, and leaves them out for the league', () => {
    const matches = [...league, matchOf('KNVB Beker', [goal('Proefman', 1)])]
    const rows = [stat(1, 4, 2), stat(1, 2, 1, 'KNVB Beker'), stat(2, 1, 1)]

    expect(goalsPerMatchOf(matches, 'all', rows)).toEqual(
      new Map([
        ['id:1', 0.5],
        ['id:2', 1],
      ]),
    )
    expect(goalsPerMatchOf(matches, 'league', rows)).toEqual(
      new Map([
        ['id:1', 0.5],
        ['id:2', 1],
      ]),
    )
  })

  it('has no column for all matches in a season with a played match of the play-offs or of Europe, but has one for the league', () => {
    const rows = [stat(1, 4, 2), stat(2, 1, 1)]

    for (const competition of ['Play-offs Conference League', 'Play-offs Europa League', 'Europa League'] as const) {
      const matches = [...league, matchOf(competition, [])]

      expect(goalsPerMatchOf(matches, 'all', rows)).toBeUndefined()
      expect(goalsPerMatchOf(matches, 'league', rows)?.size).toBe(2)
    }
  })

  it('ignores a match of Europe that is not played yet', () => {
    const matches = [...league, matchOf('Europa League', [], 'scheduled')]

    expect(goalsPerMatchOf(matches, 'all', [stat(1, 4, 2), stat(2, 1, 1)])?.size).toBe(2)
  })

  it('adds the players of one person, as the card counts a person once', () => {
    const matches = [
      matchOf('Eredivisie', [goal('Proefman', 1, { personId: 7 })]),
      matchOf('Eredivisie', [goal('Proefman', 11, { personId: 7 })]),
    ]

    expect(goalsPerMatchOf(matches, 'league', [stat(1, 3, 1), stat(11, 1, 1)])).toEqual(new Map([['person:7', 0.5]]))
  })

  it('knows a season without figures: no rows, so no column', () => {
    expect(goalsPerMatchOf(league, 'league', [])).toBeUndefined()
    expect(goalsPerMatchOf(league, 'all', [])).toBeUndefined()
  })
})
