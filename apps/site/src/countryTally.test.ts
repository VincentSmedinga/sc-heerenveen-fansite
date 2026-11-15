import { describe, expect, it } from 'vitest'

import type { AllMatch } from './matches'

import { countryTalliesOf } from './countryTally'

const match = (
  competition: string,
  opponentCountry: null | string,
  goalsFor: number,
  goalsAgainst: number,
  extra = {},
) =>
  ({
    competition,
    goalsAgainst,
    goalsFor,
    opponentCountry,
    season: '2024/25',
    status: 'played',
    ...extra,
  }) as unknown as AllMatch

const matches = [
  match('Eredivisie', 'DE', 5, 0),
  match('UEFA Cup', 'DE', 2, 1),
  match('Europa League', 'DE', 1, 1),
  match('Europa League', 'DE', 3, 0),
  match('Europa League', 'SE', 0, 2),
  match('Play-offs Conference League', 'SE', 3, 0),
  match('Champions League', 'BE', 1, 0),
  match('Europacup II', 'BE', 0, 1),
  match('UEFA Cup', null, 1, 0),
  match('UEFA Cup', null, 2, 2),
  match('UEFA Cup', 'DE', 4, 0, { status: 'scheduled' }),
]

describe('countryTalliesOf', () => {
  it('counts the played European matches per country, with the results and the goals ours first', () => {
    expect(countryTalliesOf(matches).find(({ country }) => country === 'DE')).toEqual({
      country: 'DE',
      drawn: 1,
      goalsAgainst: 2,
      goalsFor: 6,
      lost: 0,
      played: 3,
      won: 2,
    })
  })

  it('counts a club of Wales under Wales and not under the United Kingdom (#1277)', () => {
    const tallies = countryTalliesOf([
      match('Europa League', 'GB-WLS', 2, 0),
      match('Europa League', 'GB', 1, 1),
      match('UEFA Cup', 'GB-ENG', 0, 1),
    ])

    expect(tallies.map(({ country, played }) => [country, played]).toSorted()).toEqual([
      ['GB', 1],
      ['GB-ENG', 1],
      ['GB-WLS', 1],
    ])
  })

  it('leaves out the other competitions and the matches still to play', () => {
    const played = countryTalliesOf(matches).reduce((sum, { played }) => sum + played, 0)

    expect(played).toBe(9)
  })

  it('puts the country with the most matches first and, with as many, orders them by their Dutch name', () => {
    // België, Zweden and Duitsland: Duitsland has three matches, België and Zweden two.
    expect(countryTalliesOf(matches).map(({ country }) => country)).toEqual(['DE', 'BE', 'SE', null])
  })

  it('puts the matches against clubs without a country last, whatever their number', () => {
    const many = [
      ...matches,
      match('UEFA Cup', null, 1, 0),
      match('UEFA Cup', null, 1, 0),
      match('UEFA Cup', null, 1, 0),
    ]
    const tallies = countryTalliesOf(many)

    expect(tallies.at(-1)).toMatchObject({ country: null, played: 5 })
  })

  it('counts the matches of the choice of competition: Europa and all competitions have them, others none', () => {
    expect(countryTalliesOf(matches, 'league')).toEqual([])
    expect(countryTalliesOf(matches, 'europe')).toHaveLength(4)
  })

  it('has nothing without a European match', () => {
    expect(countryTalliesOf([match('Eredivisie', 'DE', 1, 0)])).toEqual([])
  })
})
