import type { DatePrecision, StaffMember } from './schema.ts'

/**
 * Where a date of the staff can lie, as two days: `from` and `to`, both in `YYYY-MM-DD` and
 * both included. A date known to the day lies on that day; one known to the month or year lies
 * somewhere in it (see `DatePrecision`).
 */
export type DateRange = { from: string; to: string }

/** What the questions about a period need: the dates, and how exactly they are known. */
export type Period = Pick<StaffMember, 'endDate' | 'endPrecision' | 'startDate' | 'startPrecision'>

/** The days a date can be, from the date as stored and its precision. */
export function rangeOf(date: string, precision: DatePrecision): DateRange {
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(5, 7))

  if (precision === 'year') {
    return { from: `${year}-01-01`, to: `${year}-12-31` }
  }

  if (precision === 'month') {
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate()

    return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(last)}` }
  }

  return { from: date, to: date }
}

/**
 * The days the last day of a period can be. A period whose end is known to the month or year
 * stopped in it, which may be on its first day, so the last day it surely held is the day
 * before that month or year. This keeps a coach whose contract ended "in July 2014" out of the
 * season that begins on 1 July 2014.
 */
function endRangeOf(date: string, precision: DatePrecision): DateRange {
  const range = rangeOf(date, precision)

  return precision === 'day' ? range : { from: dayBefore(range.from), to: range.to }
}

/** A period that has not ended goes on without an end, which is a day no question reaches. */
const noEnd: DateRange = { from: '9999-12-31', to: '9999-12-31' }

/**
 * Who has a role on a day: `certain` with the one person who surely has it, `uncertain` with
 * the people who might (the day lies in the uncertainty of a boundary, or two people surely
 * overlap), and `none` when nobody has it, because the day lies in a gap or outside the rows.
 * It never names a person it is not sure of as the answer.
 */
export type StaffOnDay<T> = { candidates: T[]; kind: 'uncertain' } | { kind: 'certain'; member: T } | { kind: 'none' }

/**
 * How sure we are that a period holds a day. `certain` when the day lies in the period whatever
 * the real day of each date turns out to be, `possible` when it might, and `no` when it cannot.
 */
export function coverage(period: Period, day: string): 'certain' | 'no' | 'possible' {
  const { end, start } = bounds(period)

  if (start.to <= day && day <= end.from) {
    return 'certain'
  }

  return start.from <= day && day <= end.to ? 'possible' : 'no'
}

/**
 * Whether a period holds a day of the season, such as `2024/25`, for certain: the days it
 * surely covers (from the latest day it can begin to the earliest day it can end) meet the
 * season. A coach who started "in 2024" is therefore not in the season before 2024/25, and a
 * person whose dates are too vague to cover any day for certain is in no season.
 */
export function servedInSeason(period: Period, season: string) {
  const { end, start } = bounds(period)
  const first = Number(season.slice(0, 4))
  const from = start.to > `${first}-07-01` ? start.to : `${first}-07-01`
  const lastDay = `${first + 1}-06-30`
  const to = end.from < lastDay ? end.from : lastDay

  return from <= to
}

/** Picks the answer for a day from the rows of one role, see `StaffOnDay`. */
export function staffOnDay<T extends Period>(rows: T[], day: string): StaffOnDay<T> {
  const [only, ...others] = rows.filter((row) => coverage(row, day) === 'certain')

  if (only !== undefined && others.length === 0) {
    return { kind: 'certain', member: only }
  }

  const candidates = rows.filter((row) => coverage(row, day) !== 'no')

  return candidates.length === 0 ? { kind: 'none' } : { candidates, kind: 'uncertain' }
}

/** The days the period can begin and the days its last day can be, both included. */
function bounds(period: Period) {
  return {
    end:
      period.endDate === null || period.endPrecision === null ? noEnd : endRangeOf(period.endDate, period.endPrecision),
    start: rangeOf(period.startDate, period.startPrecision),
  }
}

function dayBefore(day: string) {
  return new Date(Date.parse(`${day}T00:00:00Z`) - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}
