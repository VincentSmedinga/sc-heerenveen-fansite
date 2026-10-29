import { describe, expect, it } from 'vitest'

import {
  creditName,
  formatReadAt,
  formatTableDay,
  lastDayOf,
  matchMoment,
  weekendText,
  wikipediaUrl,
} from './match-format'

// The afternoon of Sunday 25 October 2026 in the Netherlands, when summer time has just ended.
const now = new Date('2026-10-25T13:40:00Z')

const scheduled = { dateText: null, kickoffAt: null, matchDate: '2026-11-01', status: 'scheduled' } as const

describe('matchMoment', () => {
  it('writes the weekday, the date and the time of a kick-off in Dutch time, with the moment for machines', () => {
    expect(matchMoment({ ...scheduled, kickoffAt: new Date('2026-11-01T13:30:00Z') }, now)).toEqual({
      dateTime: '2026-11-01T13:30:00.000Z',
      time: 'zo 1 nov 14:30',
    })
  })

  it('counts summer time and winter time: the same UTC hour is an hour later in summer', () => {
    expect(
      matchMoment({ ...scheduled, kickoffAt: new Date('2027-05-09T14:30:00Z') }, new Date('2027-05-01T10:00:00Z')).time,
    ).toBe('zo 9 mei 16:30')
    expect(matchMoment({ ...scheduled, kickoffAt: new Date('2026-12-20T14:30:00Z') }, now).time).toBe('zo 20 dec 15:30')
  })

  it('puts a match late in the evening on the Dutch day, not the UTC day', () => {
    expect(matchMoment({ ...scheduled, kickoffAt: new Date('2026-11-01T23:30:00Z') }, now).time).toBe('ma 2 nov 00:30')
  })

  it('adds the year when it is not the year of now', () => {
    expect(matchMoment({ ...scheduled, kickoffAt: new Date('2027-02-14T13:30:00Z') }, now).time).toBe(
      'zo 14 feb 2027 14:30',
    )
  })

  it('writes the weekend as it is known while there is no kick-off, with the first day for machines', () => {
    expect(matchMoment({ ...scheduled, dateText: '12-14 februari 2027', matchDate: '2027-02-12' }, now)).toEqual({
      dateTime: '2027-02-12',
      time: 'weekend 12–14 februari',
    })
  })

  it('writes only the day of a match that is played, in the middle of the Dutch day', () => {
    expect(
      matchMoment(
        { dateText: null, kickoffAt: new Date('2026-10-18T16:45:00Z'), matchDate: '2026-10-18', status: 'played' },
        now,
      ),
    ).toEqual({ dateTime: '2026-10-18', time: 'zo 18 okt' })
  })

  it('keeps the same notation for a match played more than a week ago and for one still to come', () => {
    // The change of #428 is for publication dates; a match keeps its weekday, date and time.
    expect(
      matchMoment(
        { dateText: null, kickoffAt: new Date('2026-10-04T12:15:00Z'), matchDate: '2026-10-04', status: 'played' },
        now,
      ),
    ).toEqual({ dateTime: '2026-10-04', time: 'zo 4 okt' })
    expect(matchMoment({ ...scheduled, kickoffAt: new Date('2026-11-08T15:45:00Z') }, now)).toEqual({
      dateTime: '2026-11-08T15:45:00.000Z',
      time: 'zo 8 nov 16:45',
    })
  })

  it('writes the day of a played match from the day, also when the kick-off is empty', () => {
    expect(matchMoment({ dateText: null, kickoffAt: null, matchDate: '2027-01-10', status: 'played' }, now).time).toBe(
      'zo 10 jan 2027',
    )
  })
})

describe('lastDayOf', () => {
  it('gives the last day of a weekend, with or without the year', () => {
    expect(lastDayOf('12-14 februari 2027', '2027-02-12')).toBe('2027-02-14')
    expect(lastDayOf('24–26 oktober', '2026-10-24')).toBe('2026-10-26')
  })

  it('goes on into the next month, and the next year, when the weekend does', () => {
    expect(lastDayOf('30 januari-1 februari 2027', '2027-01-30')).toBe('2027-02-01')
    expect(lastDayOf('27 februari-1 maart 2028', '2028-02-27')).toBe('2028-03-01')
    expect(lastDayOf('31 december-2 januari', '2026-12-31')).toBe('2027-01-02')
  })

  it('gives the day itself for a single day, a text it does not know and no text', () => {
    expect(lastDayOf('13 februari 2027', '2027-02-13')).toBe('2027-02-13')
    expect(lastDayOf('februari 2027', '2027-02-01')).toBe('2027-02-01')
    expect(lastDayOf(null, '2027-02-13')).toBe('2027-02-13')
  })
})

describe('weekendText', () => {
  it.each([
    ['12-14 februari 2027', 'weekend 12–14 februari'],
    ['12–14 februari', 'weekend 12–14 februari'],
    ['30 januari-1 februari 2027', 'weekend 30 januari–1 februari'],
    ['13 februari 2027', '13 februari'],
    ['in het voorjaar', 'in het voorjaar'],
  ])('writes %j as %j', (text, expected) => {
    expect(weekendText(text)).toBe(expected)
  })
})

describe('formatTableDay and formatReadAt', () => {
  it('writes the day a table holds for with the month in full', () => {
    expect(formatTableDay('2026-10-18')).toBe('18 oktober 2026')
  })

  it('writes the moment of reading in Dutch time, with winter time and summer time', () => {
    expect(formatReadAt(new Date('2026-10-25T12:05:00Z'))).toBe('25 oktober 2026 om 13:05')
    expect(formatReadAt(new Date('2026-07-25T12:05:00Z'))).toBe('25 juli 2026 om 14:05')
  })
})

describe('the links to Wikipedia', () => {
  it('links to the page, with an underscore for a space', () => {
    expect(wikipediaUrl('Eredivisie 2026/27 (mannenvoetbal)')).toBe(
      'https://nl.wikipedia.org/wiki/Eredivisie_2026/27_(mannenvoetbal)',
    )
  })

  it('names the pages for a link', () => {
    expect(creditName('standings', '2026/27')).toBe('Eredivisie 2026/27')
    expect(creditName('programme', '2026/27')).toBe('Programma Eredivisie 2026/27')
    expect(creditName('cup', '2026/27')).toBe('KNVB Beker 2026/27')
  })
})
