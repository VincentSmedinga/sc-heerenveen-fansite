import { describe, expect, it } from 'vitest'

import { finalPlacesOf } from './matches'

const row = (season: string, position: number, extra: object = {}) => ({
  goalDifference: 10 - position,
  points: 70 - position,
  pointsDeducted: 0,
  position,
  season,
  ...extra,
})

describe('finalPlacesOf', () => {
  it('gives our place in every season from the first table to the current season, the oldest first', () => {
    const places = finalPlacesOf(
      [row('2024/25', 6), row('2025/26', 3), row('2026/27', 1)],
      ['2024/25', '2026/27'],
      '2026/27',
    )

    expect(places.map(({ row: placed, season }) => [season, placed?.position])).toEqual([
      ['2024/25', 6],
      ['2025/26', 3],
      ['2026/27', 1],
    ])
    expect(places[0]?.row).toEqual({ goalDifference: 4, points: 64, pointsDeducted: 0, position: 6 })
  })

  it('makes a season without a table a place with no row, and marks the current season as now', () => {
    const places = finalPlacesOf([row('2024/25', 6)], ['2024/25'], '2026/27')

    expect(places).toEqual([
      { now: false, row: { goalDifference: 4, points: 64, pointsDeducted: 0, position: 6 }, season: '2024/25' },
      { now: false, row: undefined, season: '2025/26' },
      { now: true, row: undefined, season: '2026/27' },
    ])
  })

  it('keeps the points lost to a deduction', () => {
    const [place] = finalPlacesOf([row('2025/26', 9, { pointsDeducted: 2 })], ['2025/26'], '2025/26')

    expect(place?.row?.pointsDeducted).toBe(2)
  })

  it('has no places without a table, and ignores a season after the current one', () => {
    expect(finalPlacesOf([], [], '2026/27')).toEqual([])
    expect(finalPlacesOf([row('2027/28', 1)], ['2027/28'], '2026/27')).toEqual([])
  })

  it('counts through the turn of the century', () => {
    expect(finalPlacesOf([], ['1998/99'], '2000/01').map(({ season }) => season)).toEqual([
      '1998/99',
      '1999/00',
      '2000/01',
    ])
  })
})
