import { describe, expect, it } from 'vitest'

import type { AllMatch } from './matches'

import { competitionTalliesOf } from './competitionTally'

const match = (competition: string, goalsFor: number, goalsAgainst: number, extra = {}) =>
  ({ competition, goalsAgainst, goalsFor, season: '2024/25', status: 'played', ...extra }) as unknown as AllMatch

const matches = [
  match('Eredivisie', 2, 1),
  match('Eredivisie', 1, 1),
  match('Eredivisie', 4, 0, { status: 'scheduled' }),
  match('KNVB Beker', 1, 1, { penaltiesAgainst: 3, penaltiesFor: 4 }),
  match('UEFA Cup', 0, 3),
  match('Play-offs Conference League', 2, 0),
]

describe('competitionTalliesOf', () => {
  it('counts each kind of competition in the order of the search, without the kinds that have no match', () => {
    expect(competitionTalliesOf(matches).map(({ value }) => value)).toEqual(['eredivisie', 'knvb-beker', 'europa'])
  })

  it('counts the results and goals, without the matches still to play', () => {
    expect(competitionTalliesOf(matches)[0]).toMatchObject({
      drawn: 1,
      goalsAgainst: 2,
      goalsFor: 3,
      label: 'Eredivisie',
      lost: 0,
      played: 2,
      won: 1,
    })
  })

  it('counts a cup tie that a shoot-out decided as a win, with the goals after extra time', () => {
    expect(competitionTalliesOf(matches)[1]).toMatchObject({ drawn: 0, goalsFor: 1, played: 1, won: 1 })
  })

  it('counts every European cup and the play-offs as Europa', () => {
    expect(competitionTalliesOf(matches)[2]).toMatchObject({ goalsAgainst: 3, goalsFor: 2, lost: 1, played: 2, won: 1 })
  })

  it('is empty without a played match', () => {
    expect(competitionTalliesOf([match('Eredivisie', 1, 0, { status: 'scheduled' })])).toEqual([])
  })
})
