import { describe, expect, it } from 'vitest'

import { createLimit } from './rate-limit'

const hour = 60 * 60 * 1000

describe('createLimit', () => {
  it('lets the first ten through in an hour and refuses the eleventh', () => {
    const limit = createLimit({ max: 10, perMilliseconds: hour })

    for (let index = 0; index < 10; index += 1) {
      expect(limit.take(index)).toBe(true)
    }

    expect(limit.take(11)).toBe(false)
  })

  it('counts only what fits: a refusal takes nothing from the next hour', () => {
    const limit = createLimit({ max: 1, perMilliseconds: hour })

    expect(limit.take(0)).toBe(true)
    expect(limit.take(1)).toBe(false)
    expect(limit.take(hour - 1)).toBe(false)
    expect(limit.take(hour)).toBe(true)
  })

  it('forgets the times after the hour, so the form opens again', () => {
    const limit = createLimit({ max: 2, perMilliseconds: hour })

    limit.take(0)
    limit.take(1000)

    expect(limit.take(hour - 1)).toBe(false)
    expect(limit.take(hour)).toBe(true)
    expect(limit.take(hour + 1000)).toBe(true)
    expect(limit.take(hour + 1001)).toBe(false)
  })
})
