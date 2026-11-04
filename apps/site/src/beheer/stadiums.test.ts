import { describe, expect, it } from 'vitest'

import { searchClubs } from './stadiums'

describe('searchClubs', () => {
  const clubs = [{ name: 'AZ' }, { name: 'FC Groningen' }, { name: 'Go Ahead Eagles' }, { name: 'Fortuna Sittard' }]

  it('gives every club for an empty search', () => {
    expect(searchClubs(clubs, '')).toEqual(clubs)
    expect(searchClubs(clubs, '   ')).toEqual(clubs)
  })

  it('finds a part of a name, whatever the capitals', () => {
    expect(searchClubs(clubs, 'groning')).toEqual([{ name: 'FC Groningen' }])
    expect(searchClubs(clubs, 'GO AHEAD')).toEqual([{ name: 'Go Ahead Eagles' }])
  })

  it('wants every word, in any order, and no accents to get in the way', () => {
    expect(searchClubs(clubs, 'eagles ahead')).toEqual([{ name: 'Go Ahead Eagles' }])
    expect(searchClubs(clubs, 'fc sittard')).toEqual([])
    expect(searchClubs([{ name: 'Fortuña Sittard' }], 'fortuna')).toEqual([{ name: 'Fortuña Sittard' }])
  })

  it('treats a % or an _ as an ordinary character, because it is no pattern', () => {
    expect(searchClubs(clubs, '%')).toEqual([])
    expect(searchClubs(clubs, '_')).toEqual([])
  })
})
