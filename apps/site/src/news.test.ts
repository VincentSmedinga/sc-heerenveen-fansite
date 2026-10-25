import { describe, expect, it } from 'vitest'

import {
  dateTimeOf,
  episodeDetails,
  formatDayAndTime,
  formatDiscussionTime,
  formatDuration,
  formatEpisodeTime,
  formatNewsTime,
  weekdayStart,
} from './news'

describe('weekdayStart', () => {
  it('is the first moment of the Dutch day six days before today, in summer time', () => {
    // Thursday 22 October 2026, 14:30 in the Netherlands (12:30 UTC). Friday 16 October starts at 22:00 UTC the day before.
    expect(weekdayStart(new Date('2026-10-22T12:30:00Z')).toISOString()).toBe('2026-10-15T22:00:00.000Z')
  })

  it('is the first moment of the Dutch day six days before today, in winter time', () => {
    // Wednesday 2 December 2026. Thursday 26 November starts at 23:00 UTC the day before.
    expect(weekdayStart(new Date('2026-12-02T09:00:00Z')).toISOString()).toBe('2026-11-25T23:00:00.000Z')
  })

  it('counts the Dutch day, not the UTC day, just after midnight in the Netherlands', () => {
    // 00:30 on Friday 23 October in the Netherlands is still Thursday 22 October in UTC.
    expect(weekdayStart(new Date('2026-10-22T22:30:00Z')).toISOString()).toBe('2026-10-16T22:00:00.000Z')
    // And the other way round: 23:30 on Thursday 22 October in the Netherlands is 21:30 UTC.
    expect(weekdayStart(new Date('2026-10-22T21:30:00Z')).toISOString()).toBe('2026-10-15T22:00:00.000Z')
  })

  it('starts on the Sunday that summer time ends, a day of 25 hours that begins in summer time', () => {
    // Summer time ends on Sunday 25 October 2026 at 03:00 (01:00 UTC). On Saturday 31 October the weekdays start on that Sunday.
    expect(weekdayStart(new Date('2026-10-31T12:00:00Z')).toISOString()).toBe('2026-10-24T22:00:00.000Z')
  })

  it('starts on the first day in winter time', () => {
    // Monday 26 October 2026 is the first day wholly in winter time and starts at 23:00 UTC the day before. The weekdays that
    // start there end on Sunday 1 November.
    expect(weekdayStart(new Date('2026-11-01T11:00:00Z')).toISOString()).toBe('2026-10-25T23:00:00.000Z')
  })

  it('starts in summer time when today is in winter time, and the change is inside the days', () => {
    // Thursday 29 October is in winter time. The weekdays start on Friday 23 October, before the change.
    expect(weekdayStart(new Date('2026-10-29T10:00:00Z')).toISOString()).toBe('2026-10-22T22:00:00.000Z')
    // Monday 26 October: the weekdays start on Tuesday 20 October.
    expect(weekdayStart(new Date('2026-10-26T10:00:00Z')).toISOString()).toBe('2026-10-19T22:00:00.000Z')
  })

  it('gives the same start on the day summer time ends, before and after the clock goes back', () => {
    // On Sunday 25 October the weekdays start on Monday 19 October, in summer time.
    expect(weekdayStart(new Date('2026-10-25T10:00:00Z')).toISOString()).toBe('2026-10-18T22:00:00.000Z')
    // 02:30 by the clock, before it goes back (00:30 UTC): summer time.
    expect(weekdayStart(new Date('2026-10-25T00:30:00Z')).toISOString()).toBe('2026-10-18T22:00:00.000Z')
    // 02:30 by the clock again, after it went back (01:30 UTC): winter time, the same day.
    expect(weekdayStart(new Date('2026-10-25T01:30:00Z')).toISOString()).toBe('2026-10-18T22:00:00.000Z')
  })

  it('crosses the change in spring too, and the end of a month and a year', () => {
    // Summer time begins on Sunday 29 March 2026. On Friday 3 April the weekdays start on Saturday 28 March, in winter time.
    expect(weekdayStart(new Date('2026-04-03T10:00:00Z')).toISOString()).toBe('2026-03-27T23:00:00.000Z')
    // On Wednesday 6 January 2027 the weekdays start on Thursday 31 December, in winter time.
    expect(weekdayStart(new Date('2027-01-06T10:00:00Z')).toISOString()).toBe('2026-12-30T23:00:00.000Z')
  })

  it('ignores the milliseconds of the moment', () => {
    expect(weekdayStart(new Date('2026-10-22T12:30:00.999Z')).toISOString()).toBe('2026-10-15T22:00:00.000Z')
  })
})

describe('formatDayAndTime', () => {
  it('writes the short weekday and the time in Dutch, such as "wo 14:05"', () => {
    expect(formatDayAndTime(new Date('2026-10-21T12:05:00Z'))).toBe('wo 14:05')
  })

  it('writes the time with two digits for the hour and the minutes', () => {
    expect(formatDayAndTime(new Date('2026-10-21T04:07:00Z'))).toBe('wo 06:07')
  })

  it('writes each weekday as two letters, without a full stop', () => {
    // Monday 19 October to Sunday 25 October 2026, at noon UTC.
    const week = ['19', '20', '21', '22', '23', '24', '25'].map((day) =>
      formatDayAndTime(new Date(`2026-10-${day}T10:00:00Z`)),
    )

    expect(week).toEqual(['ma 12:00', 'di 12:00', 'wo 12:00', 'do 12:00', 'vr 12:00', 'za 12:00', 'zo 11:00'])
  })

  it('names the day by the Dutch calendar, not by UTC', () => {
    // 23:30 UTC on Wednesday is 01:30 on Thursday in the Netherlands in summer time.
    expect(formatDayAndTime(new Date('2026-10-21T23:30:00Z'))).toBe('do 01:30')
  })

  it('writes the time in winter time with one hour more than UTC', () => {
    expect(formatDayAndTime(new Date('2026-12-02T12:05:00Z'))).toBe('wo 13:05')
  })

  it('writes the time on both sides of the change back to winter time', () => {
    // Summer time ends on 25 October 2026 at 01:00 UTC: the clock goes from 03:00 back to 02:00.
    expect(formatDayAndTime(new Date('2026-10-25T00:59:00Z'))).toBe('zo 02:59')
    expect(formatDayAndTime(new Date('2026-10-25T01:00:00Z'))).toBe('zo 02:00')
  })

  it('writes midnight as 00:00, on the new day', () => {
    // 22:00 UTC on Wednesday is midnight on Thursday in summer time.
    expect(formatDayAndTime(new Date('2026-10-21T21:59:00Z'))).toBe('wo 23:59')
    expect(formatDayAndTime(new Date('2026-10-21T22:00:00Z'))).toBe('do 00:00')
    expect(formatDayAndTime(new Date('2026-10-21T22:05:00Z'))).toBe('do 00:05')
  })

  it('does not repeat a weekday in the days that get one', () => {
    const now = new Date('2026-10-22T12:30:00Z')
    const first = weekdayStart(now)
    const days = Array.from({ length: 7 }, (_, index) =>
      formatDayAndTime(new Date(first.getTime() + index * 24 * 60 * 60 * 1000 + 60 * 60 * 1000)).slice(0, 2),
    )

    expect(new Set(days).size).toBe(7)
  })
})

describe('formatNewsTime', () => {
  // Thursday 22 October 2026, 14:30 in the Netherlands.
  const now = new Date('2026-10-22T12:30:00Z')
  const format = (moment: string) => formatNewsTime(new Date(moment), now)

  it('gives the short weekday and the time for today', () => {
    expect(format('2026-10-22T10:05:00Z')).toBe('do 12:05')
  })

  it('gives the short weekday and the time for the six days before today', () => {
    expect(format('2026-10-21T12:05:00Z')).toBe('wo 14:05')
    expect(format('2026-10-16T22:00:00Z')).toBe('za 00:00')
  })

  it('gives the date and the time from the seventh day before today', () => {
    // The weekdays start on Friday 16 October at 00:00 in the Netherlands, which is 22:00 UTC on Thursday 15 October.
    expect(format('2026-10-15T22:00:00Z')).toBe('vr 00:00')
    expect(format('2026-10-15T21:59:00Z')).toBe('15 okt 23:59')
    expect(format('2026-10-14T12:05:00Z')).toBe('14 okt 14:05')
  })

  it('gives the date and the time for older news of this year', () => {
    expect(format('2026-10-09T06:10:00Z')).toBe('9 okt 08:10')
    expect(format('2026-03-02T12:00:00Z')).toBe('2 mrt 13:00')
  })

  it('gives the year too for news of another year, because the news has no limit in time', () => {
    expect(format('2025-12-30T10:00:00Z')).toBe('30 dec 2025 11:00')
  })

  it('gives the date and the time in Dutch time, not in UTC', () => {
    // 23:30 UTC on 14 October is 01:30 on 15 October in summer time.
    expect(format('2026-10-14T23:30:00Z')).toBe('15 okt 01:30')
  })

  it('counts a moment after now as today, as a clock that is ahead would give', () => {
    expect(format('2026-10-22T12:40:00Z')).toBe('do 14:40')
  })

  it('keeps the Dutch time and the date across the end of summer time and the end of the year', () => {
    expect(formatNewsTime(new Date('2026-10-18T23:15:00Z'), new Date('2026-10-31T12:00:00Z'))).toBe('19 okt 01:15')
    expect(formatNewsTime(new Date('2026-12-20T23:30:00Z'), new Date('2026-12-31T10:00:00Z'))).toBe('21 dec 00:30')
    expect(formatNewsTime(new Date('2026-12-20T23:30:00Z'), new Date('2027-01-06T10:00:00Z'))).toBe('21 dec 2026 00:30')
  })
})

describe('dateTimeOf', () => {
  it('gives the full time in UTC', () => {
    expect(dateTimeOf(new Date('2026-10-21T12:05:00Z'))).toBe('2026-10-21T12:05:00.000Z')
  })
})

describe('formatDiscussionTime', () => {
  // Friday 23 October 2026, 15:40 in the Netherlands.
  const now = new Date('2026-10-23T13:40:00Z')
  const format = (moment: string) => formatDiscussionTime(new Date(moment), now)

  it('gives the time alone for a moment today', () => {
    expect(format('2026-10-23T11:28:21Z')).toBe('13:28')
  })

  it('gives the time alone from the first moment of the Dutch day, and not before it', () => {
    // Midnight in the Netherlands is 22:00 UTC the day before.
    expect(format('2026-10-22T22:00:00Z')).toBe('00:00')
    expect(format('2026-10-22T21:59:59Z')).toBe('do 23:59')
  })

  it('counts the Dutch day, not the UTC day', () => {
    expect(formatDiscussionTime(new Date('2026-10-22T22:30:00Z'), new Date('2026-10-23T09:00:00Z'))).toBe('00:30')
  })

  it('gives a moment after now as the time alone, as a clock that is ahead would give', () => {
    expect(format('2026-10-23T13:50:00Z')).toBe('15:50')
  })

  it('gives the short weekday and the time for the six days before today', () => {
    expect(format('2026-10-22T19:45:00Z')).toBe('do 21:45')
    expect(format('2026-10-17T10:05:00Z')).toBe('za 12:05')
  })

  it('gives the date from the seventh day before today, with no time', () => {
    // The weekdays start on Saturday 17 October at 00:00 in the Netherlands, which is 22:00 UTC on Friday 16 October.
    expect(format('2026-10-16T22:00:00Z')).toBe('za 00:00')
    expect(format('2026-10-16T21:59:59Z')).toBe('16 okt')
    expect(format('2026-10-10T08:10:00Z')).toBe('10 okt')
  })

  it('gives the year too when the moment is not in this year', () => {
    expect(format('2025-12-30T12:00:00Z')).toBe('30 dec 2025')
    // Half past midnight on 1 January is this year in the Netherlands, although it is still last year in UTC.
    expect(format('2025-12-31T23:30:00Z')).toBe('1 jan')
  })

  it('keeps the Dutch time across the end of summer time', () => {
    // Summer time ended on Sunday 25 October 2026 at 03:00. On Monday 26 October at 10:00 it is 09:00 UTC.
    const monday = new Date('2026-10-26T09:00:00Z')

    expect(formatDiscussionTime(new Date('2026-10-26T07:15:00Z'), monday)).toBe('08:15')
    expect(formatDiscussionTime(new Date('2026-10-24T20:15:00Z'), monday)).toBe('za 22:15')
  })
})

describe('formatEpisodeTime', () => {
  // Friday 23 October 2026, 15:40 in the Netherlands.
  const now = new Date('2026-10-23T13:40:00Z')

  it('is the short weekday and the time within the last seven days, as for the news', () => {
    expect(formatEpisodeTime(new Date('2026-10-22T12:05:00Z'), now)).toBe(
      formatNewsTime(new Date('2026-10-22T12:05:00Z'), now),
    )
    expect(formatEpisodeTime(new Date('2026-10-22T12:05:00Z'), now)).toBe('do 14:05')
    expect(formatEpisodeTime(new Date('2026-10-17T22:30:00Z'), now)).toBe('zo 00:30')
  })

  it('is the date alone, without the time, for an episode from before the last seven days', () => {
    expect(formatEpisodeTime(new Date('2026-10-16T12:05:00Z'), now)).toBe('16 okt')
    expect(formatEpisodeTime(new Date('2026-01-05T12:05:00Z'), now)).toBe('5 jan')
  })

  it('has the year when the episode is from another year, because the list goes back years', () => {
    expect(formatEpisodeTime(new Date('2025-12-31T12:05:00Z'), now)).toBe('31 dec 2025')
    expect(formatEpisodeTime(new Date('2021-10-06T12:05:00Z'), now)).toBe('6 okt 2021')
  })

  it('counts the Dutch year, not the UTC year, at New Year', () => {
    const later = new Date('2027-01-20T12:00:00Z')

    // 00:30 on 1 January 2027 in the Netherlands is still 31 December 2026 in UTC, so this one is from this year.
    expect(formatEpisodeTime(new Date('2026-12-31T23:30:00Z'), later)).toBe('1 jan')
    expect(formatEpisodeTime(new Date('2026-12-31T22:30:00Z'), later)).toBe('31 dec 2026')
  })

  it('writes a moment after now, from a clock that is ahead, as today', () => {
    expect(formatEpisodeTime(new Date('2026-10-23T20:00:00Z'), now)).toBe('vr 22:00')
  })
})

describe('formatDuration', () => {
  it.each([
    [2944, '49 min'],
    [2216, '37 min'],
    [60, '1 min'],
    [3600, '1 uur'],
    [4320, '1 uur 12 min'],
    [7230, '2 uur 1 min'],
    [86_400, '24 uur'],
  ])('writes %i seconds as %s', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text)
  })

  it('rounds to the nearest minute, and never writes 0 min', () => {
    expect(formatDuration(89)).toBe('1 min')
    expect(formatDuration(90)).toBe('2 min')
    expect(formatDuration(5)).toBe('1 min')
    expect(formatDuration(3599)).toBe('1 uur')
  })
})

describe('episodeDetails', () => {
  it('gives the season and the number, then the duration', () => {
    expect(episodeDetails({ durationSeconds: 2216, episodeNumber: 16, seasonNumber: 9 })).toEqual([
      'seizoen 9, aflevering 16',
      '37 min',
    ])
  })

  it('leaves out the season when the feed gave none', () => {
    expect(episodeDetails({ durationSeconds: 2216, episodeNumber: 120, seasonNumber: null })).toEqual([
      'aflevering 120',
      '37 min',
    ])
  })

  it('leaves out a season without an episode number, and gives nothing when the feed gave nothing', () => {
    expect(episodeDetails({ durationSeconds: 2216, episodeNumber: null, seasonNumber: 9 })).toEqual(['37 min'])
    expect(episodeDetails({ durationSeconds: null, episodeNumber: null, seasonNumber: null })).toEqual([])
    expect(episodeDetails({ durationSeconds: null, episodeNumber: 3, seasonNumber: null })).toEqual(['aflevering 3'])
  })
})
