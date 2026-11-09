import type { ReactNode } from 'react'

/** A place to point at: how far along and how high it is (0 to 100), and its text. */
export type TrendPoint = { across: number; at: number; label: ReactNode }

/**
 * The place with a point that is nearest to a position across the chart, as the number of the
 * place counted from 0, or `null` when no place has a point. The position is a share of the
 * width from 0 to 100; one outside the chart is the nearest edge. Two equally near places give
 * the first, and a place without a point (`null`) is never chosen, so the pointer jumps over
 * gaps to the nearest place that has one.
 */
export function nearestPoint(position: number, points: readonly (null | TrendPoint)[]): null | number {
  const at = Math.min(100, Math.max(0, position))
  let nearest: null | number = null
  let distance = Infinity

  points.forEach((point, index) => {
    if (point === null) return

    const away = Math.abs(point.across - at)

    if (away < distance) {
      distance = away
      nearest = index
    }
  })

  return nearest
}
