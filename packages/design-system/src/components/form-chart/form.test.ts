import { describe, expect, it } from 'vitest'

import { formOf, pointsOf, slots, toneOf } from './form'

describe('pointsOf', () => {
  it('gives 3 points for a win, 1 for a draw and none for a loss', () => {
    expect([pointsOf('W'), pointsOf('G'), pointsOf('V')]).toEqual([3, 1, 0])
  })
})

describe('toneOf', () => {
  it('gives a win the positive tone, a draw the neutral one and a loss the negative one', () => {
    expect([toneOf('W'), toneOf('G'), toneOf('V')]).toEqual(['positive', 'neutral', 'negative'])
  })
})

describe('formOf', () => {
  it('gives the latest five results as marks, the oldest first, with a word for each', () => {
    expect(formOf(['V', 'W', 'G', 'V', 'W', 'G', 'W'])).toEqual([
      { label: 'gelijkspel', mark: 'G', tone: 'neutral' },
      { label: 'verlies', mark: 'V', tone: 'negative' },
      { label: 'winst', mark: 'W', tone: 'positive' },
      { label: 'gelijkspel', mark: 'G', tone: 'neutral' },
      { label: 'winst', mark: 'W', tone: 'positive' },
    ])
  })

  it('gives all the results when there are fewer than five, and none when there are none', () => {
    expect(formOf(['W', 'V']).map((mark) => mark.mark)).toEqual(['W', 'V'])
    expect(formOf([])).toEqual([])
  })

  it('takes the number from the call', () => {
    expect(formOf(['W', 'G', 'V'], 2).map((mark) => mark.mark)).toEqual(['G', 'V'])
  })
})

describe('slots', () => {
  it('gives a place for every match of the season, in order, with a bar for each result played', () => {
    const result = slots(['W', 'G', 'V'], 5)

    expect(result).toEqual([
      { tone: 'positive', value: 3 },
      { tone: 'neutral', value: 1 },
      { tone: 'negative', value: 0 },
      null,
      null,
    ])
  })

  it('has only empty places when nothing is played', () => {
    expect(slots([], 34)).toHaveLength(34)
    expect(slots([], 34).every((place) => place === null)).toBe(true)
  })

  it('leaves out results past the number of matches', () => {
    expect(slots(['W', 'W', 'W'], 2)).toHaveLength(2)
  })
})
