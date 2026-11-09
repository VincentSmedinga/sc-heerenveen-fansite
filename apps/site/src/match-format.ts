/*
 * How the site writes a match to visitors: the kick-off or the day in Dutch time, and the
 * weekend while the kick-off is not known. The database holds the kick-off in UTC and the
 * day as a Dutch calendar day.
 */

import type { PublicMatch, PublicStaff, PublicStandingsRow, PublicWikipediaPage } from '@fansite/db/queries'
import type { DatePrecision } from '@fansite/db/schema'

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
 * What the link to a Wikipedia page says: the league table, the programme, the cup or the
 * play-offs of the season, such as "Eredivisie 2026/27". The play-offs are for the Europa
 * League before 2020/21 and for the Conference League from then on. A page with the matches of
 * 2007/08 to 2009/10 (`matches`) holds more than one competition, so it is named by its own
 * title, or by its Dutch name when the title is English (`englishPageNames`): the text of a
 * link is Dutch. A page that is not on the Dutch Wikipedia says which Wikipedia it is on:
 * "(Engelse Wikipedia)".
 */
export function creditName(
  { kind, language, title }: Pick<PublicWikipediaPage, 'kind' | 'language' | 'title'>,
  season: string,
) {
  const name = {
    cup: `KNVB Beker ${season}`,
    'europa-league': `Europa League ${season}`,
    matches: Object.hasOwn(englishPageNames, title) ? englishPageNames[title] : title,
    playoffs: `Play-offs ${Number(season.slice(0, 4)) < 2020 ? 'Europa' : 'Conference'} League ${season}`,
    programme: `Programma Eredivisie ${season}`,
    standings: `Eredivisie ${season}`,
  }[kind]

  return language === 'nl' ? name : `${name} (${language === 'en' ? 'Engelse Wikipedia' : `${language}.wikipedia.org`})`
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

/** What the link to an English page with matches says, by the title of the page. */
const englishPageNames: Readonly<Record<string, string>> = {
  '2007–08 UEFA Cup first round': 'UEFA Cup 2007/08, eerste ronde',
  '2008–09 UEFA Cup first round': 'UEFA Cup 2008/09, eerste ronde',
  '2008–09 UEFA Cup group stage': 'UEFA Cup 2008/09, groepsfase',
  '2009–10 SC Heerenveen season': 'sc Heerenveen in het seizoen 2009/10',
}

const shortDayFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', timeZone, year: 'numeric' })

const shortMonthFormat = new Intl.DateTimeFormat('nl-NL', { month: 'short', timeZone, year: 'numeric' })

/** When a line in an own list (of stadiums, of names) starts: a season, a day or neither. */
export type ListStart = { startDay: null | string; startSeason: null | string }

/**
 * What the list of head coaches says in front of each name, in the order the coaches began: a
 * season with one coach says nothing, because the name is enough. With more, each coach but the
 * last has "tot 14 mrt 2026", the day he stopped, and the last has "vanaf 1 sep 2025", the day
 * he began. A date known to the month or year says so ("tot mrt 2026", "vanaf 2024"). A coach
 * but the last who has no end in the table says nothing.
 */
export function coachPeriods(coaches: PublicStaff[]): (string | undefined)[] {
  return coaches.map((coach, index) => {
    if (coaches.length === 1) {
      return undefined
    }

    if (index === coaches.length - 1) {
      return `vanaf ${formatStaffDate({ date: coach.startDate, precision: coach.startPrecision })}`
    }

    return coach.endDate === null || coach.endPrecision === null
      ? undefined
      : `tot ${formatStaffDate({ date: coach.endDate, precision: coach.endPrecision })}`
  })
}

/**
 * A date of the staff the way its precision allows: "14 mrt 2026" for a day, "mrt 2026" for a
 * month and "2026" for a year. It never writes a day it does not know.
 */
export function formatStaffDate({ date, precision }: { date: string; precision: DatePrecision }) {
  if (precision === 'year') {
    return date.slice(0, 4)
  }

  return (precision === 'month' ? shortMonthFormat : shortDayFormat).format(noonOf(date))
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
 * The year follows only when it is not the year of `now`: a season runs over two years. A list
 * that runs over seasons asks for `withYear`, and the day of a match that is played then has
 * its year always, so a match of the season before can't be taken for one of this season.
 */
export function matchMoment(
  match: Pick<PublicMatch, 'dateText' | 'kickoffAt' | 'matchDate' | 'status'>,
  now: Date,
  { withYear = false }: { withYear?: boolean } = {},
) {
  if (match.status !== 'played' && match.kickoffAt === null) {
    return { dateTime: match.matchDate, time: weekendText(match.dateText ?? match.matchDate) }
  }

  const moment = match.status === 'played' || match.kickoffAt === null ? noonOf(match.matchDate) : match.kickoffAt
  const sameYear = yearOf(moment) === yearOf(now) && !(withYear && match.status === 'played')
  const day = (sameYear ? dayFormat : dayWithYearFormat).format(moment)

  return match.status === 'played'
    ? { dateTime: match.matchDate, time: day }
    : { dateTime: moment.toISOString(), time: `${day} ${timeFormat.format(moment)}` }
}

/**
 * What an own list of a club (its stadium names, its names) says with each name, in the order
 * of the list.
 * The start of a name is a season or a day, and the next start decides where the name before it
 * ends: "t/m 2018/19", the season before, when the next start is a season, and "tot 14 feb
 * 2021" when it is a day. The first name has only its end, and the last has "vanaf" with its
 * start ("vanaf 2020/21", "vanaf 14 feb 2021"). A name in the middle has its start and its
 * end: "2019/20" when it lasted one season, "2019/20 t/m 2021/22", "2019/20 tot 14 feb 2021",
 * "10 aug 2019 t/m 2020/21" or "10 aug 2019 tot 14 feb 2021". A day has a short month, as in a
 * list of head coaches (`coachPeriods`). One name
 * says nothing, because the name is enough.
 */
export function ownListPeriods(starts: readonly ListStart[]): (string | undefined)[] {
  const days = starts.map((start) =>
    start.startDay === null ? undefined : formatStaffDate({ date: start.startDay, precision: 'day' }),
  )

  return starts.map((start, index) => {
    const next = starts[index + 1]
    const begin = start.startSeason ?? days[index]

    if (starts.length === 1) {
      return undefined
    }

    if (next === undefined) {
      return begin === undefined ? undefined : `vanaf ${begin}`
    }

    const lastSeason = next.startSeason === null ? undefined : seasonBefore(next.startSeason)
    const end = lastSeason === undefined ? `tot ${days[index + 1] ?? ''}` : `t/m ${lastSeason}`

    if (begin === undefined) {
      return end
    }

    return begin === lastSeason ? begin : `${begin} ${end}`
  })
}

/**
 * What the list of stadium names of a club says with each name, in the order we saw them: one
 * name says nothing, because the name is enough, and a "vanaf" there would say the stadium
 * began when our data begins. With more, the first name has "t/m 2018/19", the last season we
 * saw it, a name in the middle has its season ("2019/20") or, when it lasted longer, "2019/20
 * t/m 2021/22", and the last has "vanaf 2020/21", the first season we saw it. They are seasons
 * of our matches: the change of a name is seldom on a day we know.
 */
export function stadiumPeriods(
  stadiums: readonly { firstSeason: string; lastSeason: string }[],
): (string | undefined)[] {
  return stadiums.map(({ firstSeason, lastSeason }, index) => {
    if (stadiums.length === 1) {
      return undefined
    }

    if (index === 0) {
      return `t/m ${lastSeason}`
    }

    if (index === stadiums.length - 1) {
      return `vanaf ${firstSeason}`
    }

    return firstSeason === lastSeason ? firstSeason : `${firstSeason} t/m ${lastSeason}`
  })
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

/**
 * The address of a page on the Dutch Wikipedia, or on the Wikipedia of the language the page
 * is on (`language` in `wikipedia_pages`), such as `en` for the English one.
 */
export function wikipediaUrl(title: string, language: PublicWikipediaPage['language'] = 'nl') {
  // The language comes from our own database; what is no language code is the Dutch one.
  const host = /^[a-z]{2,3}(?:-[a-z]{2,8})?$/u.test(language) ? language : 'nl'

  return `https://${host}.wikipedia.org/wiki/${encodeURI(title.replaceAll(' ', '_'))}`
}

/** A calendar day such as `2026-10-25` as a moment in the middle of that day in UTC. */
function noonOf(day: string) {
  return new Date(`${day}T12:00:00Z`)
}

/** The season before one: `2019/20` is preceded by `2018/19`. */
function seasonBefore(season: string) {
  const year = Number(season.slice(0, 4)) - 1

  return `${year}/${String((year + 1) % 100).padStart(2, '0')}`
}

function yearOf(moment: Date) {
  return Number(yearFormat.format(moment))
}
