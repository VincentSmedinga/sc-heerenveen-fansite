/*
 * How the site writes a match to visitors: the kick-off or the day in Dutch time, and the
 * weekend while the kick-off is not known. The database holds the kick-off in UTC and the
 * day as a Dutch calendar day.
 */

import type { PublicMatch, PublicStandingsRow, PublicWikipediaPage } from '@fansite/db/queries'

const timeZone = 'Europe/Amsterdam'

const yearFormat = new Intl.DateTimeFormat('nl-NL', { timeZone, year: 'numeric' })

const dayFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', timeZone, weekday: 'short' })

const dayWithYearFormat = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'short',
  timeZone,
  weekday: 'short',
  year: 'numeric',
})

const timeFormat = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', hourCycle: 'h23', minute: '2-digit', timeZone })

const longDayFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', timeZone, year: 'numeric' })

const longTimeFormat = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  month: 'long',
  timeZone,
  year: 'numeric',
})

/** Two days, "12-14 februari 2027" or "30 januari-1 februari 2027". The year is optional. */
const range = /^(\d{1,2})(?: (\p{L}+))?\s*[-–]\s*(\d{1,2}) (\p{L}+)(?: \d{4})?$/u

/** "13 februari 2027": one day, the year is optional. */
const singleDay = /^(\d{1,2}) (\p{L}+)(?: \d{4})?$/u

/**
 * What the link to a Wikipedia page says: the league table, the programme or the cup of the
 * season, such as "Eredivisie 2026/27".
 */
export function creditName(kind: PublicWikipediaPage['kind'], season: string) {
  return {
    cup: `KNVB Beker ${season}`,
    programme: `Programma Eredivisie ${season}`,
    standings: `Eredivisie ${season}`,
  }[kind]
}

/**
 * The moment the importer last read a page as a visitor reads it, in Dutch time: "25 oktober
 * 2026 om 14:05".
 */
export function formatReadAt(moment: Date) {
  const parts = Object.fromEntries(longTimeFormat.formatToParts(moment).map(({ type, value }) => [type, value]))

  return `${parts['day']} ${parts['month']} ${parts['year']} om ${parts['hour']}:${parts['minute']}`
}

/**
 * The day a table holds for, such as "18 oktober 2026". It is a calendar day, not a moment, so
 * no time zone shifts it.
 */
export function formatTableDay(day: PublicStandingsRow['validOn']) {
  return longDayFormat.format(noonOf(day))
}

/**
 * The last day a match without a kick-off can be played, as a calendar day such as
 * `2027-02-14`. `matchDate` is the first day, so for a weekend ("12-14 februari 2027") it is
 * the last day of the range, also when the range runs into the next month. A single day, or a
 * text the function does not know, gives `matchDate` itself.
 */
export function lastDayOf(dateText: null | string, matchDate: string) {
  const days = dateText === null ? null : range.exec(dateText)

  if (days === null) {
    return matchDate
  }

  const [year = 0, month = 1, first = 1] = matchDate.split('-').map(Number)
  const last = Number(days[3])
  const monthLength = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const extra = last >= first ? last - first : monthLength - first + last

  return new Date(Date.UTC(year, month - 1, first + extra)).toISOString().slice(0, 10)
}

/**
 * The moment of a match as a visitor reads it, with the value for the `time` element:
 *
 * - a match with a kick-off: the weekday, the date and the time in Dutch time, "zo 1 nov
 *   14:30", and the moment itself;
 * - a match without one: the weekend or the day as Wikipedia has it, "weekend 12–14 februari",
 *   and the first day;
 * - a match that is played: the day alone, "zo 18 okt", because the hour no longer matters.
 *
 * The year follows only when it is not the year of `now`: a season runs over two years.
 */
export function matchMoment(match: Pick<PublicMatch, 'dateText' | 'kickoffAt' | 'matchDate' | 'status'>, now: Date) {
  if (match.status !== 'played' && match.kickoffAt === null) {
    return { dateTime: match.matchDate, time: weekendText(match.dateText ?? match.matchDate) }
  }

  const moment = match.status === 'played' || match.kickoffAt === null ? noonOf(match.matchDate) : match.kickoffAt
  const day = (yearOf(moment) === yearOf(now) ? dayFormat : dayWithYearFormat).format(moment)

  return match.status === 'played'
    ? { dateTime: match.matchDate, time: day }
    : { dateTime: moment.toISOString(), time: `${day} ${timeFormat.format(moment)}` }
}

/**
 * The text Wikipedia gives for a date that has no time yet, as visitors say it: "12-14 februari
 * 2027" is "weekend 12–14 februari", "13 februari 2027" is "13 februari". A text the function
 * does not know stays as it is.
 */
export function weekendText(dateText: string) {
  const days = range.exec(dateText)

  if (days !== null) {
    const [, first, firstMonth, last, lastMonth] = days

    return `weekend ${first}${firstMonth === undefined ? '' : ` ${firstMonth}`}–${last} ${lastMonth}`
  }

  const day = singleDay.exec(dateText)

  return day === null ? dateText : `${day[1]} ${day[2]}`
}

/** The address of a page on the Dutch Wikipedia. */
export function wikipediaUrl(title: string) {
  return `https://nl.wikipedia.org/wiki/${encodeURI(title.replaceAll(' ', '_'))}`
}

/** A calendar day such as `2026-10-25` as a moment in the middle of that day in UTC. */
function noonOf(day: string) {
  return new Date(`${day}T12:00:00Z`)
}

function yearOf(moment: Date) {
  return Number(yearFormat.format(moment))
}
