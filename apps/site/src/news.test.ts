import { describe, expect, it } from 'vitest'

import { dateTimeOf, formatDay, formatTime, groupByDay, windowStart } from './news'

describe('windowStart', () => {
  it('is the first moment of the Dutch day six days before today, in summer time', () => {
    // Thursday 22 October 2026, 14:30 in the Netherlands (12:30 UTC). Friday 16 October starts at 22:00 UTC the day before.
    expect(windowStart(new Date('2026-10-22T12:30:00Z')).toISOString()).toBe('2026-10-15T22:00:00.000Z')
  })

  it('is the first moment of the Dutch day six days before today, in winter time', () => {
    // Wednesday 2 December 2026. Thursday 26 November starts at 23:00 UTC the day before.
    expect(windowStart(new Date('2026-12-02T09:00:00Z')).toISOString()).toBe('2026-11-25T23:00:00.000Z')
  })

  it('counts the Dutch day, not the UTC day, just after midnight in the Netherlands', () => {
    // 00:30 on Friday 23 October in the Netherlands is still Thursday 22 October in UTC.
    expect(windowStart(new Date('2026-10-22T22:30:00Z')).toISOString()).toBe('2026-10-16T22:00:00.000Z')
    // And the other way round: 23:30 on Thursday 22 October in the Netherlands is 21:30 UTC.
    expect(windowStart(new Date('2026-10-22T21:30:00Z')).toISOString()).toBe('2026-10-15T22:00:00.000Z')
  })

  it('starts the week on the Sunday that summer time ends, a day of 25 hours that begins in summer time', () => {
    // Summer time ends on Sunday 25 October 2026 at 03:00 (01:00 UTC). On Saturday 31 October the week starts on that Sunday.
    expect(windowStart(new Date('2026-10-31T12:00:00Z')).toISOString()).toBe('2026-10-24T22:00:00.000Z')
  })

  it('starts the week on the first day in winter time', () => {
    // Monday 26 October 2026 is the first day wholly in winter time and starts at 23:00 UTC the day before. The week that
    // starts there ends on Sunday 1 November.
    expect(windowStart(new Date('2026-11-01T11:00:00Z')).toISOString()).toBe('2026-10-25T23:00:00.000Z')
  })

  it('starts the week in summer time when today is in winter time, and the change is inside the week', () => {
    // Thursday 29 October is in winter time. The week starts on Friday 23 October, before the change.
    expect(windowStart(new Date('2026-10-29T10:00:00Z')).toISOString()).toBe('2026-10-22T22:00:00.000Z')
    // Monday 26 October: the week starts on Tuesday 20 October.
    expect(windowStart(new Date('2026-10-26T10:00:00Z')).toISOString()).toBe('2026-10-19T22:00:00.000Z')
  })

  it('gives the same start on the day summer time ends, before and after the clock goes back', () => {
    // On Sunday 25 October the week starts on Monday 19 October, in summer time.
    expect(windowStart(new Date('2026-10-25T10:00:00Z')).toISOString()).toBe('2026-10-18T22:00:00.000Z')
    // 02:30 by the clock, before it goes back (00:30 UTC): summer time.
    expect(windowStart(new Date('2026-10-25T00:30:00Z')).toISOString()).toBe('2026-10-18T22:00:00.000Z')
    // 02:30 by the clock again, after it went back (01:30 UTC): winter time, the same day.
    expect(windowStart(new Date('2026-10-25T01:30:00Z')).toISOString()).toBe('2026-10-18T22:00:00.000Z')
  })

  it('crosses the change in spring too, and the end of a month and a year', () => {
    // Summer time begins on Sunday 29 March 2026. On Friday 3 April the week starts on Saturday 28 March, in winter time.
    expect(windowStart(new Date('2026-04-03T10:00:00Z')).toISOString()).toBe('2026-03-27T23:00:00.000Z')
    // On Wednesday 6 January 2027 the week starts on Thursday 31 December, in winter time.
    expect(windowStart(new Date('2027-01-06T10:00:00Z')).toISOString()).toBe('2026-12-30T23:00:00.000Z')
  })

  it('ignores the milliseconds of the moment', () => {
    expect(windowStart(new Date('2026-10-22T12:30:00.999Z')).toISOString()).toBe('2026-10-15T22:00:00.000Z')
  })
})

describe('formatDay', () => {
  it('writes the weekday, the day and the month in Dutch', () => {
    expect(formatDay(new Date('2026-10-21T12:05:00Z'))).toBe('woensdag 21 oktober')
    expect(formatDay(new Date('2026-03-01T12:00:00Z'))).toBe('zondag 1 maart')
  })

  it('names the day by the Dutch calendar', () => {
    // 23:30 UTC on Wednesday is 01:30 on Thursday in the Netherlands in summer time.
    expect(formatDay(new Date('2026-10-21T23:30:00Z'))).toBe('donderdag 22 oktober')
  })
})

describe('formatTime', () => {
  it('writes the Dutch time with two digits for the hour and the minutes', () => {
    expect(formatTime(new Date('2026-10-21T12:05:00Z'))).toBe('14:05')
    expect(formatTime(new Date('2026-10-21T04:07:00Z'))).toBe('06:07')
  })

  it('writes the time in winter time with one hour more than UTC', () => {
    expect(formatTime(new Date('2026-12-02T12:05:00Z'))).toBe('13:05')
  })

  it('writes the time on both sides of the change back to winter time', () => {
    // Summer time ends on 25 October 2026 at 01:00 UTC: the clock goes from 03:00 back to 02:00.
    expect(formatTime(new Date('2026-10-25T00:59:00Z'))).toBe('02:59')
    expect(formatTime(new Date('2026-10-25T01:00:00Z'))).toBe('02:00')
  })

  it('writes midnight as 00:00', () => {
    expect(formatTime(new Date('2026-10-21T22:00:00Z'))).toBe('00:00')
    expect(formatTime(new Date('2026-10-21T22:05:00Z'))).toBe('00:05')
  })
})

describe('dateTimeOf', () => {
  it('gives the full time in UTC', () => {
    expect(dateTimeOf(new Date('2026-10-21T12:05:00Z'))).toBe('2026-10-21T12:05:00.000Z')
  })
})

describe('groupByDay', () => {
  const item = (time: string) => ({ publishedAt: new Date(time), title: time })

  it('groups the items by Dutch day, newest first, with a heading for each day', () => {
    const days = groupByDay([
      item('2026-10-22T08:00:00Z'),
      item('2026-10-22T06:00:00Z'),
      item('2026-10-21T15:00:00Z'),
      item('2026-10-19T09:00:00Z'),
    ])

    expect(days.map(({ day, items }) => [day, items.map((entry) => entry.title)])).toEqual([
      ['donderdag 22 oktober', ['2026-10-22T08:00:00Z', '2026-10-22T06:00:00Z']],
      ['woensdag 21 oktober', ['2026-10-21T15:00:00Z']],
      ['maandag 19 oktober', ['2026-10-19T09:00:00Z']],
    ])
  })

  it('leaves out a day without items', () => {
    const days = groupByDay([item('2026-10-22T08:00:00Z'), item('2026-10-17T08:00:00Z')])

    expect(days.map(({ day }) => day)).toEqual(['donderdag 22 oktober', 'zaterdag 17 oktober'])
  })

  it('starts a new day at midnight in the Netherlands, not at midnight UTC', () => {
    // 21:59 UTC is 23:59 on Wednesday in summer time; 22:00 UTC is 00:00 on Thursday.
    const days = groupByDay([item('2026-10-21T22:00:00Z'), item('2026-10-21T21:59:00Z')])

    expect(days.map(({ day }) => day)).toEqual(['donderdag 22 oktober', 'woensdag 21 oktober'])
  })

  it('starts a new day at midnight in winter time one hour later than in summer time', () => {
    // On 2 December midnight in the Netherlands is 23:00 UTC.
    const days = groupByDay([item('2026-12-01T23:00:00Z'), item('2026-12-01T22:59:00Z')])

    expect(days.map(({ day }) => day)).toEqual(['woensdag 2 december', 'dinsdag 1 december'])
  })

  it('gives the day of the change back to winter time all its 25 hours', () => {
    // Sunday 25 October 2026 runs from 22:00 UTC on Saturday to 23:00 UTC on Sunday.
    const days = groupByDay([
      item('2026-10-25T22:59:00Z'),
      item('2026-10-25T01:30:00Z'),
      item('2026-10-24T22:00:00Z'),
      item('2026-10-24T21:59:00Z'),
    ])

    expect(days.map(({ day, items }) => [day, items.length])).toEqual([
      ['zondag 25 oktober', 3],
      ['zaterdag 24 oktober', 1],
    ])
    expect(days[0]?.items.map((entry) => formatTime(entry.publishedAt))).toEqual(['23:59', '02:30', '00:00'])
  })

  it('gives each day a key, and the same key to the same day', () => {
    const days = groupByDay([item('2026-10-22T08:00:00Z'), item('2026-10-21T08:00:00Z'), item('2026-11-21T08:00:00Z')])

    expect(new Set(days.map(({ key }) => key)).size).toBe(3)
  })

  it('gives no days when there are no items', () => {
    expect(groupByDay([])).toEqual([])
  })

  it('keeps whatever else the items hold', () => {
    const [day] = groupByDay([{ paywalled: true, publishedAt: new Date('2026-10-22T08:00:00Z') }])

    expect(day?.items).toEqual([{ paywalled: true, publishedAt: new Date('2026-10-22T08:00:00Z') }])
  })
})
