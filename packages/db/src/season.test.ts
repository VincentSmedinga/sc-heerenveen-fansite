import { describe, expect, it } from 'vitest'

import { seasonOf, seasonStart } from './season.ts'

describe('the season', () => {
  it('starts on 1 July', () => {
    expect(seasonOf(new Date('2026-06-30T23:59:00Z'))).toBe('2025/26')
    expect(seasonOf(new Date('2026-07-01T00:00:00Z'))).toBe('2026/27')
    expect(seasonOf(new Date('2026-10-25T12:00:00Z'))).toBe('2026/27')
    expect(seasonOf(new Date('2027-06-30T23:59:00Z'))).toBe('2026/27')
  })

  it('writes the second year with two digits, also at the turn of the century', () => {
    expect(seasonOf(new Date('2099-12-31T12:00:00Z'))).toBe('2099/00')
  })

  it('knows its first day', () => {
    expect(seasonStart('2026/27')).toBe('2026-07-01')
  })
})
