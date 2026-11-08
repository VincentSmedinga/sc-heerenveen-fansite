import { describe, expect, it } from 'vitest'

import { halfOf } from './halves'

describe('halfOf', () => {
  it('puts the minutes up to 45 in the first half, with the added time of 45', () => {
    expect(halfOf(1, false)).toBe('first')
    expect(halfOf(45, false)).toBe('first')
  })

  it('puts 46 to 90 in the second half, with the added time of 90', () => {
    expect(halfOf(46, false)).toBe('second')
    expect(halfOf(90, true)).toBe('second')
  })

  it('puts minute 91 and later in extra time, when there was extra time', () => {
    expect(halfOf(91, true)).toBe('extra-time')
    expect(halfOf(120, true)).toBe('extra-time')
  })

  it('keeps a minute past 90 in the second half when there was no extra time', () => {
    expect(halfOf(91, false)).toBe('second')
  })

  it('gives an event without a minute a block of its own', () => {
    expect(halfOf(null, false)).toBe('unknown')
    expect(halfOf(null, true)).toBe('unknown')
  })
})
