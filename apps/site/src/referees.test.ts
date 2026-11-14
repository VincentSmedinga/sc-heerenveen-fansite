import type { PublicMatch } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import { refereesOf } from './referees'

const match = (referee: null | string, goalsFor: number, goalsAgainst: number, extra = {}) =>
  ({
    competition: 'Eredivisie',
    goalsAgainst,
    goalsFor,
    penaltiesAgainst: null,
    penaltiesFor: null,
    referee,
    status: 'played',
    ...extra,
  }) as unknown as PublicMatch

const matches = [
  match('Bas Nijhuis', 2, 1),
  match('Bas Nijhuis', 1, 1),
  match('Danny Makkelie', 0, 1),
  match('Danny Makkelie', 3, 0),
  match('Pol van Boekel', 1, 0),
  match(null, 1, 0),
  match('Bas Nijhuis', 4, 0, { status: 'scheduled' }),
  match('Ruud Bossen', 2, 0, { competition: 'KNVB Beker' }),
]

describe('refereesOf', () => {
  it('counts the matches, wins, draws and losses under each referee, the most points per match first', () => {
    expect(refereesOf(matches, 'all').rows).toEqual([
      { drawn: 0, lost: 0, name: 'Pol van Boekel', played: 1, won: 1 },
      { drawn: 0, lost: 0, name: 'Ruud Bossen', played: 1, won: 1 },
      { drawn: 1, lost: 0, name: 'Bas Nijhuis', played: 2, won: 1 },
      { drawn: 0, lost: 1, name: 'Danny Makkelie', played: 2, won: 1 },
    ])
  })

  it('puts the most matches first when the points per match are equal, then the last name', () => {
    const { rows } = refereesOf(
      [match('A Zwart', 1, 0), match('B Aap', 1, 0), match('C Aap', 1, 0), match('C Aap', 1, 0)],
      'all',
    )

    expect(rows.map(({ name }) => name)).toEqual(['C Aap', 'B Aap', 'A Zwart'])
  })

  it('counts a shoot-out as the table does, a win or a loss for the one who took it', () => {
    const { rows } = refereesOf([match('A Een', 1, 1, { penaltiesAgainst: 3, penaltiesFor: 4 })], 'all')

    expect(rows).toEqual([{ drawn: 0, lost: 0, name: 'A Een', played: 1, won: 1 }])
  })

  it('says how many played matches have a referee, and leaves the matches still to play out', () => {
    expect(refereesOf(matches, 'all')).toMatchObject({ known: 6, played: 7, referees: 4 })
  })

  it('follows the choice of competition', () => {
    expect(refereesOf(matches, 'league')).toMatchObject({ known: 5, played: 6, referees: 3 })
  })

  it('shows two spellings of a name as two referees', () => {
    const { rows } = refereesOf([match('B. Nijhuis', 1, 0), match('Bas Nijhuis', 1, 0)], 'all')

    expect(rows.map(({ name }) => name)).toEqual(['B. Nijhuis', 'Bas Nijhuis'])
  })

  it('keeps every name that shares the last place of the top, on points per match and matches', () => {
    const many = [
      ...Array.from({ length: 3 }, () => match('A Eerste', 1, 0)),
      match('B Tweede', 1, 0),
      match('B Tweede', 1, 0),
      match('C Derde', 1, 0),
      match('C Derde', 1, 0),
      match('D Vierde', 1, 0),
      match('E Vijfde', 0, 1),
    ]
    const { referees, rows } = refereesOf(many, 'all', { top: 2 })

    expect(rows.map(({ name }) => name)).toEqual(['A Eerste', 'C Derde', 'B Tweede'])
    expect(referees).toBe(5)
  })

  it('has no rows when no match has a referee', () => {
    expect(refereesOf([match(null, 1, 0)], 'all')).toMatchObject({ known: 0, played: 1, referees: 0, rows: [] })
  })
})
