import { describe, expect, it } from 'vitest'

import { nearestPoint, type TrendPoint } from './pointer'

/** Five places of 20 wide: the middles are at 10, 30, 50, 70 and 90. */
const point = (index: number): TrendPoint => ({ across: index * 20 + 10, at: 50, label: String(index) })

describe('nearestPoint', () => {
  const all = [0, 1, 2, 3, 4].map(point)

  it('gives the place under the pointer', () => {
    expect(nearestPoint(12, all)).toBe(0)
    expect(nearestPoint(41, all)).toBe(2)
    expect(nearestPoint(88, all)).toBe(4)
  })

  it('gives the nearer place when the pointer is between two points', () => {
    expect(nearestPoint(19, all)).toBe(0)
    expect(nearestPoint(21, all)).toBe(1)
  })

  it('gives the first of two places that are equally near', () => {
    expect(nearestPoint(20, all)).toBe(0)
  })

  it('gives the first and the last place at and past the edges', () => {
    expect(nearestPoint(0, all)).toBe(0)
    expect(nearestPoint(-30, all)).toBe(0)
    expect(nearestPoint(100, all)).toBe(4)
    expect(nearestPoint(160, all)).toBe(4)
  })

  it('jumps over a place without a point to the nearest place that has one', () => {
    const gaps = [null, null, point(2), null, point(4)]

    expect(nearestPoint(5, gaps)).toBe(2)
    expect(nearestPoint(70, gaps)).toBe(2)
    expect(nearestPoint(75, gaps)).toBe(4)
    expect(nearestPoint(100, gaps)).toBe(4)
  })

  it('gives nothing when no place has a point', () => {
    expect(nearestPoint(50, [null, null, null])).toBeNull()
    expect(nearestPoint(50, [])).toBeNull()
  })
})
