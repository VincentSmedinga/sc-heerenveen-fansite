import { describe, expect, it } from 'vitest'

import { pointAt, slicePath, slicesOf, spreadAngles } from './geometry'

describe('slicesOf', () => {
  it('gives each value a slice as wide as its share of 360 degrees, from the top and clockwise', () => {
    expect(slicesOf([1, 1, 2])).toEqual([
      { end: 90, index: 0, middle: 45, start: 0, value: 1 },
      { end: 180, index: 1, middle: 135, start: 90, value: 1 },
      { end: 360, index: 2, middle: 270, start: 180, value: 2 },
    ])
  })

  it('gives no slice to a value of zero, and the others keep their index', () => {
    expect(slicesOf([0, 3, 0, 1]).map(({ end, index, start }) => ({ end, index, start }))).toEqual([
      { end: 270, index: 1, start: 0 },
      { end: 360, index: 3, start: 270 },
    ])
  })

  it('gives no slice without a value above zero', () => {
    expect(slicesOf([])).toEqual([])
    expect(slicesOf([0, 0, 0])).toEqual([])
  })
})

describe('pointAt', () => {
  it('measures the angle clockwise from the top', () => {
    const top = pointAt(0, 10)
    const right = pointAt(90, 10)

    expect(top.x).toBeCloseTo(160)
    expect(top.y).toBeCloseTo(140)
    expect(right.x).toBeCloseTo(170)
    expect(right.y).toBeCloseTo(150)
  })
})

describe('slicePath', () => {
  it('is an outline of an arc outside, a line, an arc inside and back', () => {
    expect(slicePath({ end: 90, start: 0 })).toMatch(
      /^M [\d. ]+ A 82 82 0 0 1 [\d. ]+ L [\d. ]+ A 52 52 0 0 0 [\d. ]+ Z$/u,
    )
  })

  it('uses the large arc for a slice of more than half the ring', () => {
    expect(slicePath({ end: 270, start: 0 })).toMatch(/A 82 82 0 1 1 .* A 52 52 0 1 0/u)
  })

  it('has two rings for a slice that fills the ring', () => {
    expect(slicePath({ end: 360, start: 0 }).match(/M /gu)).toHaveLength(2)
  })
})

describe('spreadAngles', () => {
  it('leaves angles that are far enough apart where they are', () => {
    expect(spreadAngles([10, 100, 200, 300], 40)).toEqual([10, 100, 200, 300])
  })

  it('moves two angles that are too close apart, each by half of what is missing', () => {
    expect(spreadAngles([100, 110], 40)).toEqual([85, 125])
  })

  it('spreads a row of close angles, keeping their order', () => {
    const spread = spreadAngles([100, 105, 110, 115], 40)

    for (const [index, angle] of spread.entries()) {
      if (index > 0) {
        expect(angle - spread[index - 1]!).toBeGreaterThanOrEqual(39.99)
      }
    }
  })

  it('counts the distance from the last angle to the first around the circle', () => {
    const spread = spreadAngles([5, 100, 350], 40)

    expect(spread[0]! + 360 - spread[2]!).toBeGreaterThanOrEqual(39.99)
    expect(spread[1]).toBe(100)
  })

  it('gives angles back as they were when they can not all fit', () => {
    expect(spreadAngles([1, 2, 3], 130)).toEqual([1, 2, 3])
  })

  it('does not change the list it is given', () => {
    const angles = [100, 110]

    spreadAngles(angles, 40)

    expect(angles).toEqual([100, 110])
  })

  it('takes one angle or none as they are', () => {
    expect(spreadAngles([], 40)).toEqual([])
    expect(spreadAngles([10], 40)).toEqual([10])
  })
})
