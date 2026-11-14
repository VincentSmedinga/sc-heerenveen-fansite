import { describe, expect, it } from 'vitest'

import type { AllMatch } from './matches'

import { seasonTalliesOf } from './seasonTally'

const match = (season: string, competition: string, goalsFor: number, goalsAgainst: number, extra = {}) =>
  ({ competition, goalsAgainst, goalsFor, season, status: 'played', ...extra }) as unknown as AllMatch

const matches = [
  match('2024/25', 'Eredivisie', 2, 1),
  match('2024/25', 'Eredivisie', 1, 1),
  match('2024/25', 'KNVB Beker', 0, 3),
  match('2024/25', 'Eredivisie', 4, 0, { status: 'scheduled' }),
  match('2023/24', 'KNVB Beker', 1, 1, { penaltiesAgainst: 3, penaltiesFor: 4 }),
]

describe('seasonTalliesOf', () => {
  it('counts the results and goals of every season for all competitions', () => {
    expect(seasonTalliesOf(matches, 'all').get('2024/25')).toEqual({
      drawn: 1,
      goalsAgainst: 5,
      goalsFor: 3,
      lost: 1,
      won: 1,
    })
  })

  it('counts a cup tie that a shoot-out decided as a win, with the goals after extra time', () => {
    expect(seasonTalliesOf(matches, 'all').get('2023/24')).toEqual({
      drawn: 0,
      goalsAgainst: 1,
      goalsFor: 1,
      lost: 0,
      won: 1,
    })
  })

  it('follows the choice, and leaves a season without a match of it out', () => {
    const tallies = seasonTalliesOf(matches, 'league')

    expect(tallies.get('2024/25')).toMatchObject({ lost: 0, won: 1 })
    expect(tallies.has('2023/24')).toBe(false)
  })
})
