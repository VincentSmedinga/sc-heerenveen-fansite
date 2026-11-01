import { describe, expect, it } from 'vitest'

import { amsterdamToUtc, seasonOf, seasonStart, utcToAmsterdam } from './season.ts'

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

describe('the clock in the Netherlands', () => {
  it('turns a day and a time into UTC, in winter and in summer', () => {
    expect(amsterdamToUtc('2026-11-14', '20:00').toISOString()).toBe('2026-11-14T19:00:00.000Z')
    expect(amsterdamToUtc('2027-05-09', '14:30').toISOString()).toBe('2027-05-09T12:30:00.000Z')
  })

  it('turns a moment back into the day and the time on that clock', () => {
    expect(utcToAmsterdam(new Date('2026-11-14T19:00:00Z'))).toEqual({ day: '2026-11-14', time: '20:00' })
    expect(utcToAmsterdam(new Date('2027-05-09T22:30:00Z'))).toEqual({ day: '2027-05-10', time: '00:30' })
  })

  it('gets the day of the change of the clock right', () => {
    expect(amsterdamToUtc('2027-03-28', '03:30').toISOString()).toBe('2027-03-28T01:30:00.000Z')
    expect(amsterdamToUtc('2026-10-25', '01:30').toISOString()).toBe('2026-10-24T23:30:00.000Z')
  })
})
