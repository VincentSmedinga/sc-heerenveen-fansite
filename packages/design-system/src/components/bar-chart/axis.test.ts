import { describe, expect, it } from 'vitest'

import { axisLabels } from './axis'

/** The numbers (counted from 1) a narrow and a wide chart show. */
const numbersOf = (slots: number) => {
  const labels = axisLabels(slots)

  return {
    narrow: labels.filter((label) => label.narrow).map((label) => label.slot + 1),
    wide: labels.map((label) => label.slot + 1),
  }
}

describe('axisLabels', () => {
  it('shows 1, 10, 20 and 30 on a narrow chart of a season, and 1, 5, 10 to 30 and 34 on a wide one', () => {
    expect(numbersOf(34)).toEqual({
      narrow: [1, 10, 20, 30],
      wide: [1, 5, 10, 15, 20, 25, 30, 34],
    })
  })

  it('leaves out the last number when it would touch the one before it', () => {
    expect(numbersOf(32).wide).toEqual([1, 5, 10, 15, 20, 25, 30])
    expect(numbersOf(33).wide).toEqual([1, 5, 10, 15, 20, 25, 30, 33])
  })

  it('has no number twice', () => {
    expect(numbersOf(35).wide).toEqual([1, 5, 10, 15, 20, 25, 30, 35])
  })

  it('numbers a short chart too, and an empty one not at all', () => {
    expect(numbersOf(1)).toEqual({ narrow: [1], wide: [1] })
    expect(numbersOf(12)).toEqual({ narrow: [1, 10], wide: [1, 5, 10] })
    expect(axisLabels(0)).toEqual([])
  })
})
