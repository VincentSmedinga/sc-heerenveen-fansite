import { describe, expect, it } from 'vitest'

import { letterOf, resultOf, shootOutOf } from './match-result'

describe('resultOf', () => {
  it('decides by the goals when there was no shoot-out', () => {
    expect(resultOf({ goalsAgainst: 0, goalsFor: 2 })).toBe('win')
    expect(resultOf({ goalsAgainst: 1, goalsFor: 1 })).toBe('draw')
    expect(resultOf({ goalsAgainst: 3, goalsFor: 2, penaltiesAgainst: null, penaltiesFor: null })).toBe('loss')
  })

  it('decides by the shoot-out when there was one: a cup tie knows no draw', () => {
    expect(resultOf({ goalsAgainst: 1, goalsFor: 1, penaltiesAgainst: 3, penaltiesFor: 4 })).toBe('win')
    expect(resultOf({ goalsAgainst: 2, goalsFor: 2, penaltiesAgainst: 5, penaltiesFor: 4 })).toBe('loss')
  })

  it('gives the letters of the form', () => {
    expect(letterOf({ goalsAgainst: 0, goalsFor: 1 })).toBe('W')
    expect(letterOf({ goalsAgainst: 0, goalsFor: 0 })).toBe('G')
    expect(letterOf({ goalsAgainst: 1, goalsFor: 1, penaltiesAgainst: 5, penaltiesFor: 4 })).toBe('V')
  })
})

describe('shootOutOf', () => {
  it('gives both scores for a shoot-out and nothing without one', () => {
    expect(shootOutOf({ penaltiesAgainst: 3, penaltiesFor: 4 })).toEqual({ penaltiesAgainst: 3, penaltiesFor: 4 })
    expect(shootOutOf({ penaltiesAgainst: null, penaltiesFor: null })).toEqual({})
  })
})
