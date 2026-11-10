import type { MatchChange } from '@fansite/db/schema'

import { describe, expect, it } from 'vitest'

import { describeWaitingChange } from './import-changes.ts'
import { hasStood } from './match-changes.ts'

const change = (season: string, firstSeenAt: string) => ({ firstSeenAt: new Date(firstSeenAt), season }) as MatchChange

describe('whether a change that waits is taken over (issue 1025)', () => {
  it('is after seven days in the season that is on, and not a second before', () => {
    const waiting = change('2026/27', '2026-11-01T10:00:00Z')

    expect(hasStood(waiting, new Date('2026-11-08T09:59:59Z'))).toBe(false)
    expect(hasStood(waiting, new Date('2026-11-08T10:00:00Z'))).toBe(true)
    expect(hasStood(waiting, new Date('2026-11-20T10:00:00Z'))).toBe(true)
  })

  it('is still so on the last day of the season', () => {
    expect(hasStood(change('2026/27', '2027-06-23T23:59:59Z'), new Date('2027-06-30T23:59:59Z'))).toBe(true)
  })

  it('is never so from 1 July, when the season is over', () => {
    // First seen just before the boundary: the seven days end in the next season.
    expect(hasStood(change('2026/27', '2027-06-24T00:00:00Z'), new Date('2027-07-01T00:00:00Z'))).toBe(false)
    // It stood for seven days in the season, and no run took it over before 1 July.
    expect(hasStood(change('2026/27', '2027-06-01T10:00:00Z'), new Date('2027-07-01T00:00:00Z'))).toBe(false)
    // First seen in the weekly read of July, or with `import:season` years later.
    expect(hasStood(change('2026/27', '2027-07-01T03:00:00Z'), new Date('2027-07-08T03:05:00Z'))).toBe(false)
    expect(hasStood(change('2013/14', '2026-11-01T10:00:00Z'), new Date('2026-11-11T10:00:00Z'))).toBe(false)
  })

  it('is so for the first match of the new season on 1 July', () => {
    expect(hasStood(change('2027/28', '2027-06-24T00:00:00Z'), new Date('2027-07-01T00:00:00Z'))).toBe(true)
  })
})

describe('the last line of a change that waits, in `import:status` and `import:changes`', () => {
  const waiting = (season: string) =>
    ({
      competition: 'Eredivisie',
      firstSeenAt: new Date('2026-11-01T10:00:00Z'),
      id: 7,
      lastSeenAt: new Date('2026-11-02T10:00:00Z'),
      newValue: 'nieuw',
      oldValue: 'oud',
      reason: 'the date of a match played 5 days ago changed',
      round: 'Speelronde 1',
      season,
      timesSeen: 2,
    }) as MatchChange
  const now = new Date('2026-11-03T10:00:00Z')

  it('says when the change is taken over in the season that is on', () => {
    expect(describeWaitingChange(waiting('2026/27'), now).at(-1)).toMatch(
      /seen 2 times; taken over from 2026-11-08 10:00:00 UTC if it stays$/u,
    )
  })

  it('promises no take-over in a season that is over', () => {
    expect(describeWaitingChange(waiting('2025/26'), now).at(-1)).toMatch(
      /seen 2 times; the season is over, so it waits until a person decides$/u,
    )
  })
})
