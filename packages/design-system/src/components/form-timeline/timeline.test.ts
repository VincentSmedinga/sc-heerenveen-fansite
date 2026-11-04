import { describe, expect, it } from 'vitest'

import { barsOf, shortYear, yearLabels } from './timeline'

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

  it('starts with a label under the first year, whatever year it is, and counts from there', () => {
    expect(yearLabels(8, 1993, 2, 5)).toEqual([{ at: 1, text: '93' }])
    expect(yearLabels(34, 2010, 2, 4)).toEqual(
      [2010, 2014, 2018, 2022, 2026].map((year, index) => ({ at: 1 + index * 8, text: String(year).slice(2) })),
    )
  })

  it('counts over the turn of the century', () => {
    expect(yearLabels(20, 1996, 2, 4).map(({ text }) => text)).toEqual(['96', '00', '04'])
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
