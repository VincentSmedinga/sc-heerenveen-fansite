import { describe, expect, it } from 'vitest'

import { againstByClub, againstLabel, type AgainstMatch } from './player-against'

const match = (id: number, club: string, day: string): AgainstMatch => ({
  club,
  competition: 'Eredivisie',
  day,
  goals: 0,
  goalsAgainst: 1,
  goalsFor: 2,
  home: true,
  id,
  minutes: 90,
  round: String(id),
  season: '2001/02',
})

describe('againstByClub', () => {
  it('puts the club with the most matches first, and the newest match first within a club', () => {
    const result = againstByClub([
      match(1, 'Ajax', '2001-10-13'),
      match(2, 'Vitesse', '2003-03-02'),
      match(3, 'Ajax', '2005-04-09'),
      match(4, 'Ajax', '2003-01-01'),
      match(5, 'Vitesse', '2004-05-06'),
    ])

    expect(result?.map(({ id }) => id)).toEqual([3, 4, 1, 5, 2])
  })

  it('gives a tie to the club with the newest match, a match of the same day by its id', () => {
    const result = againstByClub([
      match(1, 'Ajax', '2001-10-13'),
      match(2, 'Vitesse', '2002-03-02'),
      match(3, 'Vitesse', '2002-03-02'),
      match(4, 'Ajax', '2002-03-02'),
    ])

    expect(result?.map(({ id }) => id)).toEqual([4, 1, 3, 2])
  })

  it('has no card without matches', () => {
    expect(againstByClub([])).toBeUndefined()
  })
})

describe('againstLabel', () => {
  it('names the match from our side, with the day', () => {
    expect(againstLabel({ club: 'Ajax', day: '2007-11-03', home: true })).toBe('sc Heerenveen – Ajax, 3 november 2007')
    expect(againstLabel({ club: 'Ajax', day: '2007-11-03', home: false })).toBe('Ajax – sc Heerenveen, 3 november 2007')
  })
})
