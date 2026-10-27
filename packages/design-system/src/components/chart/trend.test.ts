import { describe, expect, it } from 'vitest'

import { monotonePath, movingAverage } from './trend'

/** Every `x y` pair of a path, whatever the command in front of it. */
const pairsOf = (path: string) =>
  [...path.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/gu)].map(([, x, y]) => ({ x: Number(x), y: Number(y) }))

/** The end point of every stretch of a path: the last pair of each M, L or C. */
const pointsOf = (path: string) =>
  path
    .split(/(?=[MLC])/u)
    .filter(Boolean)
    .map((part) => pairsOf(part).at(-1)!)

describe('movingAverage', () => {
  it('averages each value with the ones before it, from the place where the window is full', () => {
    expect(movingAverage([3, 3, 1, 0, 3, 1], 3)).toEqual([null, null, 7 / 3, 4 / 3, 4 / 3, 4 / 3])
  })

  it('has no average at all when there are fewer values than the window', () => {
    expect(movingAverage([3, 1, 0], 5)).toEqual([null, null, null])
    expect(movingAverage([], 5)).toEqual([])
  })

  it('gives as many places as values, so it lines up with the chart', () => {
    expect(movingAverage([3, 1, 0, 3, 3, 1, 0], 5)).toHaveLength(7)
  })

  it('gives the values themselves for a window of one', () => {
    expect(movingAverage([3, 1, 0], 1)).toEqual([3, 1, 0])
  })

  it('leaves a gap at every place whose window holds a gap', () => {
    expect(movingAverage([3, 3, null, 1, 1, 1], 2)).toEqual([null, 3, null, null, 1, 1])
  })
})

describe('monotonePath', () => {
  it('has no path for no values, for gaps only and for one value', () => {
    expect(monotonePath([], 3)).toBe('')
    expect(monotonePath([null, null], 3)).toBe('')
    expect(monotonePath([null, 2, null], 3)).toBe('')
  })

  it('puts the points in the middle of their place, with the top as 0 and the ground as 100', () => {
    expect(pointsOf(monotonePath([null, 3, 0], 3))).toEqual([
      { x: 1.5, y: 0 },
      { x: 2.5, y: 100 },
    ])
  })

  it('draws straight stretches when asked', () => {
    expect(monotonePath([0, 1.5, 3], 3, 'straight')).toBe('M0.5 100 L1.5 50 L2.5 0')
  })

  it('never goes below 0 or above the maximum, also where the values jump', () => {
    const values = [0, 3, 0, 3, 3, 0, 0, 1, 3, 1, 0.2, 2.9, 0]
    const path = monotonePath(values, 3)

    for (const { y } of pairsOf(path)) {
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(100)
    }
  })

  it('never goes past the two values of a stretch, so the curve has no overshoot', () => {
    const values = [3, 0, 0.2, 3, 2.9, 3, 0, 1]
    const heights = values.map((value) => 100 - (value / 3) * 100)
    const parts = monotonePath(values, 3).split(/(?=C)/u).slice(1)

    parts.forEach((part, index) => {
      const [first, second] = pairsOf(part)
      const low = Math.min(heights[index]!, heights[index + 1]!)
      const high = Math.max(heights[index]!, heights[index + 1]!)

      expect(first!.y).toBeGreaterThanOrEqual(low - 0.001)
      expect(first!.y).toBeLessThanOrEqual(high + 0.001)
      expect(second!.y).toBeGreaterThanOrEqual(low - 0.001)
      expect(second!.y).toBeLessThanOrEqual(high + 0.001)
    })
  })

  it('is flat between two equal values', () => {
    const parts = monotonePath([1, 2, 2, 2, 0], 3).split(/(?=C)/u).slice(1)
    const flat = [parts[1], parts[2]].flatMap((part) => pairsOf(part!))

    expect(new Set(flat.map(({ y }) => y)).size).toBe(1)
  })

  it('levels out at a top or a bottom of the values', () => {
    // The curve leaves the top at slope 0: the control point after it has the same height.
    const parts = monotonePath([0, 3, 0], 3).split(/(?=C)/u).slice(1)

    expect(pairsOf(parts[0]!)[1]!.y).toBe(0)
    expect(pairsOf(parts[1]!)[0]!.y).toBe(0)
  })

  it('starts a new path after a gap and draws nothing for the gap itself', () => {
    const path = monotonePath([1, 2, null, 0, 3, 1], 3)

    expect(path.match(/M/gu)).toHaveLength(2)
    expect(pointsOf(path).map(({ x }) => x)).toEqual([0.5, 1.5, 3.5, 4.5, 5.5])
    expect(path).not.toMatch(/2\.5/u)
  })

  it('clamps a value outside 0 and the maximum', () => {
    expect(monotonePath([-2, 9], 3, 'straight')).toBe('M0.5 100 L1.5 0')
  })

  it('rounds the numbers, so the markup stays small', () => {
    expect(monotonePath([1, 2, 1.123456], 3)).not.toMatch(/\d\.\d{4}/u)
  })
})
