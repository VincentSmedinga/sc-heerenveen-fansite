import { describe, expect, it } from 'vitest'

import { formationsOf, type MatchFormation } from './formations'
import { matchData } from './test-matches'

const played = matchData.matches.filter((match) => match.status === 'played')

const formation = (name: string, goalsFor: number, goalsAgainst: number, extra = {}): MatchFormation => ({
  competition: 'Eredivisie',
  formation: name,
  goalsAgainst,
  goalsFor,
  ...extra,
})

describe('formationsOf', () => {
  it('counts the matches, wins, draws and losses of each formation, the most matches first', () => {
    const { rows } = formationsOf(
      played,
      [
        formation('4-2-3-1', 0, 1),
        formation('4-3-3', 2, 0),
        formation('4-3-3', 1, 1),
        formation('4-3-3', 0, 3),
        formation('4-3-3', 3, 1),
      ],
      'all',
    )

    expect(rows).toEqual([
      { drawn: 1, formation: '4-3-3', lost: 1, played: 4, won: 2 },
      { drawn: 0, formation: '4-2-3-1', lost: 1, played: 1, won: 0 },
    ])
  })

  it('puts formations with as many matches in the order of the name', () => {
    const { rows } = formationsOf(played, [formation('4-4-2', 1, 0), formation('3-5-2', 1, 0)], 'all')

    expect(rows.map((row) => row.formation)).toEqual(['3-5-2', '4-4-2'])
  })

  it('counts a match decided by a shoot-out as a win or a loss, as the rest of the page does', () => {
    const { rows } = formationsOf(
      played,
      [formation('4-3-3', 1, 1, { competition: 'KNVB Beker', penaltiesAgainst: 3, penaltiesFor: 4 })],
      'all',
    )

    expect(rows).toEqual([{ drawn: 0, formation: '4-3-3', lost: 0, played: 1, won: 1 }])
  })

  it('counts the matches of the chosen competition only', () => {
    const matches = [formation('4-3-3', 1, 0), formation('4-3-3', 1, 0, { competition: 'KNVB Beker' })]

    expect(formationsOf(played, matches, 'cup').rows).toEqual([
      { drawn: 0, formation: '4-3-3', lost: 0, played: 1, won: 1 },
    ])
    expect(formationsOf(played, matches, 'europe').rows).toEqual([])
  })

  it('says how many of the played matches have a formation', () => {
    const result = formationsOf(played, [formation('4-3-3', 1, 0)], 'all')

    expect(result.known).toBe(1)
    expect(result.played).toBe(played.length)
  })

  it('ignores an empty formation', () => {
    expect(formationsOf(played, [formation(' ', 1, 0)], 'all')).toMatchObject({ known: 0, rows: [] })
  })
})
