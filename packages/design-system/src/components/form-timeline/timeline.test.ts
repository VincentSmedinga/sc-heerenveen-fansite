import { describe, expect, it } from 'vitest'

import { barsOf, shortYear, yearLabels, yearOfPlace } from './timeline'

describe('barsOf', () => {
  it('gives a bar for each result, as high as its points, and nothing for a gap', () => {
    expect(barsOf(['W', null, 'G', 'V'])).toEqual([
      { tone: 'positive', value: 3 },
      null,
      { tone: 'neutral', value: 1 },
      { tone: 'negative', value: 0 },
    ])
  })
})

describe('yearOfPlace', () => {
  it('puts the places of a year together, from the year of the first', () => {
    expect([0, 1, 2, 3, 73].map((place) => yearOfPlace(place, 1990, 2))).toEqual([1990, 1990, 1991, 1991, 2026])
  })
})

describe('shortYear', () => {
  it('writes the last two digits, also over the turn of the century', () => {
    expect([1990, 1999, 2000, 2005, 2026].map(shortYear)).toEqual(['90', '99', '00', '05', '26'])
  })
})

describe('yearLabels', () => {
  it('puts a label under every fifth year, in the middle of the two places of that year', () => {
    const labels = yearLabels(74, 1990, 2, 5)

    expect(labels.map(({ text }) => text)).toEqual(['90', '95', '00', '05', '10', '15', '20', '25'])
    expect(labels.map(({ at }) => at)).toEqual([1, 11, 21, 31, 41, 51, 61, 71])
  })

  it('starts at the first year that is a multiple, when the axis starts in between', () => {
    expect(yearLabels(8, 1993, 2, 5)).toEqual([{ at: 5, text: '95' }])
  })

  it('has no label for a year after the last place', () => {
    expect(yearLabels(21, 1990, 2, 5).map(({ text }) => text)).toEqual(['90', '95', '00'])
    expect(yearLabels(20, 1990, 2, 5).map(({ text }) => text)).toEqual(['90', '95'])
  })

  it('follows the places per year', () => {
    expect(yearLabels(30, 2000, 3, 5)).toEqual([
      { at: 1.5, text: '00' },
      { at: 16.5, text: '05' },
    ])
  })
})
