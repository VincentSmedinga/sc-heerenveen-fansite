import type { PublicMatch } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import { specialGoalsOf } from './matches'
import { matchPenaltiesOf } from './penalties'

const goal = (ours: boolean, penalty: boolean) => ({
  minute: 10,
  ours,
  ownGoal: false,
  penalty,
  personFamilyName: null,
  personFamilyNamePrefix: null,
  personGivenName: null,
  personId: null,
  personSlug: null,
  player: 'Speler Voorbeeld',
  playerId: null,
  playerPage: null,
  stoppageMinutes: null,
})

const match = (goals: ReturnType<typeof goal>[], extra = {}) =>
  ({
    competition: 'Eredivisie',
    goals,
    goalsAgainst: goals.filter((item) => !item.ours).length,
    goalsFor: goals.filter((item) => item.ours).length,
    status: 'played',
    ...extra,
  }) as unknown as PublicMatch

const matches = [
  match([goal(true, true), goal(true, false), goal(false, true)]),
  match([goal(true, true), goal(true, true)], { competition: 'KNVB Beker' }),
  match([], { goalsAgainst: 2, goalsFor: 1 }),
  match([goal(false, true)], { status: 'scheduled' }),
  // A penalty shoot-out is no goal of the match: the score after extra time has none of it.
  match([goal(true, false)], { goalsAgainst: 1, goalsFor: 1, penaltiesAgainst: 3, penaltiesFor: 4 }),
]

describe('matchPenaltiesOf', () => {
  it('counts the penalties scored for and against us in the played matches whose goals we know', () => {
    expect(matchPenaltiesOf(matches, 'all')).toEqual({ against: 1, for: 3, known: 3, played: 4 })
  })

  it('follows the choice of competition', () => {
    expect(matchPenaltiesOf(matches, 'league')).toEqual({ against: 1, for: 1, known: 2, played: 3 })
  })

  it('counts nothing for a match that is not played, and has no penalties in a 0–0', () => {
    expect(matchPenaltiesOf([match([], { goalsAgainst: 0, goalsFor: 0 })], 'all')).toEqual({
      against: 0,
      for: 0,
      known: 1,
      played: 1,
    })
  })

  it('agrees with the penalties of the card Bijzondere doelpunten on the page Spelers', () => {
    expect(matchPenaltiesOf(matches, 'all').for).toBe(specialGoalsOf(matches, 'all').penalties)
  })
})
