import { describe, expect, it } from 'vitest'

import { placeTooltip } from './placement'

// A parent of 200 by 64, a tooltip of 40 by 24 and a gap of 10.
const base = { gap: 10, parent: { height: 64, width: 200 }, tooltip: { height: 24, width: 40 } }

describe('placeTooltip', () => {
  it('puts the tooltip above the place, centred on it', () => {
    expect(placeTooltip({ ...base, anchor: { x: 100, y: 50 } })).toEqual({ side: 'above', x: 80, y: 16 })
  })

  it('puts the tooltip just above the place when it fits exactly', () => {
    expect(placeTooltip({ ...base, anchor: { x: 100, y: 34 } })).toEqual({ side: 'above', x: 80, y: 0 })
  })

  it('puts the tooltip below the place when there is no room above it', () => {
    expect(placeTooltip({ ...base, anchor: { x: 100, y: 20 } })).toEqual({ side: 'below', x: 80, y: 30 })
  })

  it('lets the tooltip stick out above the parent by the overhang', () => {
    expect(placeTooltip({ ...base, anchor: { x: 100, y: 20 }, overhang: 20 })).toEqual({ side: 'above', x: 80, y: -14 })
    expect(placeTooltip({ ...base, anchor: { x: 100, y: 14 }, overhang: 20 })).toEqual({ side: 'above', x: 80, y: -20 })
  })

  it('puts the tooltip below the place when even the overhang is not enough', () => {
    expect(placeTooltip({ ...base, anchor: { x: 100, y: 10 }, overhang: 20 })).toEqual({ side: 'below', x: 80, y: 20 })
  })

  it('shifts the tooltip along when the place is at the left edge', () => {
    expect(placeTooltip({ ...base, anchor: { x: 4, y: 50 } })).toEqual({ side: 'above', x: 0, y: 16 })
  })

  it('shifts the tooltip along when the place is at the right edge', () => {
    expect(placeTooltip({ ...base, anchor: { x: 198, y: 50 } })).toEqual({ side: 'above', x: 160, y: 16 })
  })

  it('keeps the tooltip inside the parent when neither side has room', () => {
    expect(placeTooltip({ ...base, anchor: { x: 100, y: 45 }, tooltip: { height: 50, width: 40 } })).toEqual({
      side: 'below',
      x: 80,
      y: 14,
    })
  })

  it('keeps the tooltip at the edge when it is larger than the parent', () => {
    expect(placeTooltip({ ...base, anchor: { x: 10, y: 10 }, tooltip: { height: 80, width: 300 } })).toEqual({
      side: 'below',
      x: 0,
      y: 0,
    })
  })
})
