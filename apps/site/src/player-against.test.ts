import { describe, expect, it } from 'vitest'

import { againstLabel, type AgainstMatch, playerAgainstOf } from './player-against'

const match = (id: number, season: string, day: string): AgainstMatch => ({
  club: 'Oefenstad',
  competition: 'Eredivisie',
  day,
  goals: 0,
  goalsAgainst: 1,
  goalsFor: 2,
  home: true,
  id,
  minutes: 90,
  round: String(id),
  season,
})

describe('playerAgainstOf', () => {
  const seasons = ['2003/04', '2004/05', '2007/08']

  it('puts a season before his first in "voor", one after his last in "na", and the rest "tussendoor"', () => {
    const found = [
      match(1, '2001/02', '2001-10-13'),
      match(2, '2005/06', '2005-10-13'),
      match(3, '2010/11', '2010-10-13'),
      match(4, '2003/04', '2003-10-13'),
      match(5, '2007/08', '2007-10-13'),
    ]
    const result = playerAgainstOf(found, seasons)

    expect(result?.before.map(({ id }) => id)).toEqual([1])
    expect(result?.after.map(({ id }) => id)).toEqual([3])
    // His first and last season count as "tussendoor": he played for us and against us then.
    expect(result?.between.map(({ id }) => id)).toEqual([5, 2, 4])
  })

  it('has the newest match first in every group, a match of the same day by its id', () => {
    const result = playerAgainstOf(
      [match(1, '2001/02', '2001-10-13'), match(2, '2001/02', '2002-03-02'), match(3, '2001/02', '2002-03-02')],
      seasons,
    )

    expect(result?.before.map(({ id }) => id)).toEqual([3, 2, 1])
  })

  it('treats a player with one season as one with a first and a last season that are the same', () => {
    const result = playerAgainstOf(
      [match(1, '2001/02', '2001-10-13'), match(2, '2004/05', '2004-10-13'), match(3, '2009/10', '2009-10-13')],
      ['2004/05'],
    )

    expect(result?.before.map(({ id }) => id)).toEqual([1])
    expect(result?.between.map(({ id }) => id)).toEqual([2])
    expect(result?.after.map(({ id }) => id)).toEqual([3])
  })

  it('has no card without matches, or without a season of his own', () => {
    expect(playerAgainstOf([], seasons)).toBeUndefined()
    expect(playerAgainstOf([match(1, '2001/02', '2001-10-13')], [])).toBeUndefined()
  })
})

describe('againstLabel', () => {
  it('names the match from our side, with the day', () => {
    expect(againstLabel({ club: 'Ajax', day: '2007-11-03', home: true })).toBe('sc Heerenveen – Ajax, 3 november 2007')
    expect(againstLabel({ club: 'Ajax', day: '2007-11-03', home: false })).toBe('Ajax – sc Heerenveen, 3 november 2007')
  })
})
