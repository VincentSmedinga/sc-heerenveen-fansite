import type { PublicStaff } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import { type CoachResult, coachResultsOf, type DatedMatch, firstSeasonOf, periodOf } from './coachResults'

const coach = (name: string, from: string, to: null | string, extra: Partial<PublicStaff> = {}): PublicStaff => ({
  endDate: to,
  endPrecision: to === null ? null : 'day',
  interim: false,
  name,
  startDate: from,
  startPrecision: 'day',
  wikipediaPage: null,
  ...extra,
})

const match = (matchDate: string, goalsFor: null | number, goalsAgainst: null | number, extra = {}): DatedMatch => ({
  competition: 'Eredivisie',
  goalsAgainst,
  goalsFor,
  matchDate,
  status: 'played',
  ...extra,
})

const figures = (results: CoachResult[]) =>
  results.map(({ drawn, lost, name, played, pointsPerMatch, won }) => [name, played, won, drawn, lost, pointsPerMatch])

describe('coachResultsOf', () => {
  const coaches = [
    coach('Eerste Trainer', '2010-07-01', '2012-05-29'),
    coach('Tweede Trainer', '2012-06-01', '2013-12-10', { startPrecision: 'month' }),
    coach('Interim Trainer', '2013-12-11', '2014-01-31', { interim: true }),
    coach('Derde Trainer', '2014-02-01', null),
  ]

  it('counts the played matches in the period of each coach, the newest coach first', () => {
    const results = coachResultsOf(
      coaches,
      [
        match('2010-08-08', 2, 0),
        match('2011-09-10', 1, 1),
        match('2012-09-01', 0, 3),
        match('2013-12-20', 4, 0),
        match('2014-03-01', 1, 0),
        match('2014-03-08', 1, 0),
      ],
      'all',
    )

    expect(figures(results)).toEqual([
      ['Derde Trainer', 2, 2, 0, 0, '3,00'],
      ['Interim Trainer', 1, 1, 0, 0, '3,00'],
      ['Tweede Trainer', 1, 0, 0, 1, '0,00'],
      ['Eerste Trainer', 2, 1, 1, 0, '2,00'],
    ])
  })

  it('gives a coach who began or stopped during a season the matches of his period only', () => {
    const results = coachResultsOf(
      [coach('Voor', '2010-07-01', '2011-01-15'), coach('Na', '2011-01-16', null)],
      [match('2011-01-15', 1, 0), match('2011-01-16', 0, 1), match('2011-01-22', 0, 0)],
      'all',
    )

    expect(figures(results)).toEqual([
      ['Na', 2, 0, 1, 1, '0,50'],
      ['Voor', 1, 1, 0, 0, '3,00'],
    ])
  })

  it('writes an interim as such and gives it a row of its own', () => {
    const [first] = coachResultsOf(coaches, [match('2013-12-20', 1, 0)], 'all')

    expect(first).toMatchObject({ interim: true, name: 'Interim Trainer', period: 'dec 2013 – jan 2014' })
  })

  it('takes the first day of the month or the year for a date known to that only', () => {
    const vague = [
      coach('Maand', '2012-06-01', '2013-01-01', { endPrecision: 'month', startPrecision: 'month' }),
      coach('Jaar', '2014-01-01', null, { startPrecision: 'year' }),
    ]
    const results = coachResultsOf(
      vague,
      [match('2012-05-31', 1, 0), match('2012-06-01', 1, 0), match('2013-01-01', 1, 0), match('2013-01-02', 1, 0)],
      'all',
    )

    // 31 May is before the first coach, and 2 January 2013 is in the gap after him.
    expect(figures(results)).toEqual([['Maand', 2, 2, 0, 0, '3,00']])
    expect(periodOf(vague[0]!)).toBe('jun 2012 – jan 2013')
    expect(periodOf(vague[1]!)).toBe('2014 – nu')
  })

  it('gives a day that two periods hold to the coach who began first', () => {
    const results = coachResultsOf(
      [
        coach('Eerder', '2012-06-01', '2014-07-01', { endPrecision: 'month' }),
        coach('Later', '2014-01-01', null, { startPrecision: 'year' }),
      ],
      [match('2014-03-01', 1, 0), match('2014-07-02', 1, 0)],
      'all',
    )

    expect(figures(results)).toEqual([
      ['Later', 1, 1, 0, 0, '3,00'],
      ['Eerder', 1, 1, 0, 0, '3,00'],
    ])
  })

  it('leaves out a coach without a match, such as one from before our matches', () => {
    const results = coachResultsOf(
      [coach('Te vroeg', '1990-07-01', '1992-10-01'), ...coaches],
      [match('2010-08-08', 2, 0)],
      'all',
    )

    expect(results.map(({ name }) => name)).toEqual(['Eerste Trainer'])
    expect(coachResultsOf([], [match('2010-08-08', 2, 0)], 'all')).toEqual([])
  })

  it('counts a match that is played and has a score, and nothing else', () => {
    const results = coachResultsOf(
      coaches,
      [
        match('2010-08-08', 2, 0),
        match('2010-08-15', null, null, { status: 'scheduled' }),
        match('2010-08-22', null, null),
        match('2010-08-29', 1, 0, { status: 'cancelled' }),
      ],
      'all',
    )

    expect(figures(results)).toEqual([['Eerste Trainer', 1, 1, 0, 0, '3,00']])
  })

  it('counts the cup for all the matches and leaves it out for the Eredivisie alone', () => {
    const days = [match('2010-08-08', 2, 0), match('2010-09-20', 0, 1, { competition: 'KNVB Beker' })]

    expect(figures(coachResultsOf(coaches, days, 'all'))).toEqual([['Eerste Trainer', 2, 1, 0, 1, '1,50']])
    expect(figures(coachResultsOf(coaches, days, 'league'))).toEqual([['Eerste Trainer', 1, 1, 0, 0, '3,00']])
  })

  it('leaves a coach out of the Eredivisie when all his matches were in the cup', () => {
    const days = [match('2010-09-20', 0, 1, { competition: 'KNVB Beker' })]

    expect(coachResultsOf(coaches, days, 'league')).toEqual([])
  })
})

describe('firstSeasonOf', () => {
  it('is the season of the first played match with a score', () => {
    expect(firstSeasonOf([match('2012-09-01', 1, 0), match('2010-08-08', 1, 0), match('2009-08-08', null, null)])).toBe(
      '2010/11',
    )
    expect(firstSeasonOf([])).toBeUndefined()
  })
})
