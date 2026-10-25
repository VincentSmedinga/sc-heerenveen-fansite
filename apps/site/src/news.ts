/* How the site shows the news to visitors: the day or date and time of an item, in Dutch time. The database holds UTC. */

const timeZone = 'Europe/Amsterdam'

/**
 * The days that get a weekday: today and the six days before it. A weekday is only clear within seven days; further
 * back "wo" could be either of two Wednesdays, so older news gets a date. The time of a discussion follows the same rule.
 */
const daysWithWeekday = 7

const dayAndTimeFormat = new Intl.DateTimeFormat('nl-NL', {
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  timeZone,
  weekday: 'short',
})

const timeFormat = new Intl.DateTimeFormat('nl-NL', {
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  timeZone,
})

const dateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', timeZone })

const dateWithYearFormat = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'short',
  timeZone,
  year: 'numeric',
})

const clockFormat = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  hour: 'numeric',
  hourCycle: 'h23',
  minute: 'numeric',
  month: 'numeric',
  second: 'numeric',
  timeZone,
  year: 'numeric',
})

/** The moment as the `datetime` of a `time` element. */
export function dateTimeOf(moment: Date) {
  return moment.toISOString()
}

/**
 * The facts about an episode as short texts for a `NewsItem`: the season and the number, such as "seizoen 9, aflevering
 * 16" or "aflevering 120", and the duration, such as "37 min". A fact the feed did not give is left out, and so is a
 * season without an episode number, because a season alone says little.
 */
export function episodeDetails({
  durationSeconds,
  episodeNumber,
  seasonNumber,
}: {
  durationSeconds: null | number
  episodeNumber: null | number
  seasonNumber: null | number
}) {
  return [
    episodeNumber === null
      ? undefined
      : `${seasonNumber === null ? '' : `seizoen ${seasonNumber}, `}aflevering ${episodeNumber}`,
    durationSeconds === null ? undefined : formatDuration(durationSeconds),
  ].filter((detail) => detail !== undefined)
}

/**
 * The short weekday and the time of day in the Netherlands, such as "wo 14:05". Within seven days a weekday never
 * appears twice, and the time stays right in a page from the cache.
 */
export function formatDayAndTime(moment: Date) {
  const parts = Object.fromEntries(dayAndTimeFormat.formatToParts(moment).map(({ type, value }) => [type, value]))

  return `${parts['weekday']} ${parts['hour']}:${parts['minute']}`
}

/**
 * The time of the last post of a discussion as a visitor reads it, in Dutch time. Of today it is the time alone, such as
 * "13:28". Of the six days before it is the short weekday and the time, as for the news: "wo 14:05". Anything older is the
 * date, such as "16 okt", with the year when it is not this year. A moment after now, from a clock that is ahead, counts as
 * today.
 */
export function formatDiscussionTime(moment: Date, now: Date) {
  if (moment >= startOfDay(now, 0)) {
    return timeFormat.format(moment)
  }
  if (moment >= weekdayStart(now)) {
    return formatDayAndTime(moment)
  }

  return (clockAt(moment).year === clockAt(now).year ? dateFormat : dateWithYearFormat).format(moment)
}

/**
 * How long an episode lasts as a visitor reads it, in whole minutes: "37 min", "1 uur" or "1 uur 12 min". A duration
 * under half a minute still counts as "1 min", because "0 min" says nothing.
 */
export function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (hours === 0) {
    return `${rest} min`
  }

  return rest === 0 ? `${hours} uur` : `${hours} uur ${rest} min`
}

/**
 * The time of a podcast episode as a visitor reads it, in Dutch time. Within seven days it is the short weekday and the
 * time, such as "wo 14:05", as for the news. Anything older is the date, such as "14 okt", with the year when it is not
 * this year: the list of episodes goes back years, so a date without a year would be unclear.
 */
export function formatEpisodeTime(moment: Date, now: Date) {
  if (moment >= weekdayStart(now)) {
    return formatDayAndTime(moment)
  }

  return (clockAt(moment).year === clockAt(now).year ? dateFormat : dateWithYearFormat).format(moment)
}

/**
 * The time of a news item as a visitor reads it, in Dutch time. Of today and the six days before it is the short weekday
 * and the time, such as "wo 14:05". Anything older is the date and the time, such as "14 okt 14:05", with the year when
 * it is not this year: the news has no limit in time. A moment after now, from a clock that is ahead, counts as today.
 */
export function formatNewsTime(moment: Date, now: Date) {
  if (moment >= weekdayStart(now)) {
    return formatDayAndTime(moment)
  }

  return `${(clockAt(moment).year === clockAt(now).year ? dateFormat : dateWithYearFormat).format(moment)} ${timeFormat.format(moment)}`
}

/** The start of the days that get a weekday: the first moment of the Dutch day six days before today. */
export function weekdayStart(now: Date) {
  return startOfDay(now, daysWithWeekday - 1)
}

/** What the clock and the calendar in the Netherlands show at this moment. */
function clockAt(moment: Date) {
  const parts = Object.fromEntries(clockFormat.formatToParts(moment).map(({ type, value }) => [type, Number(value)]))

  return {
    day: parts['day'] ?? NaN,
    hour: parts['hour'] ?? NaN,
    minute: parts['minute'] ?? NaN,
    month: parts['month'] ?? NaN,
    second: parts['second'] ?? NaN,
    year: parts['year'] ?? NaN,
  }
}

/** How far the Dutch clock is ahead of UTC at this moment, in milliseconds: one or two hours. */
function offsetAt(moment: Date) {
  const { day, hour, minute, month, second, year } = clockAt(moment)
  const wholeSeconds = moment.getTime() - moment.getUTCMilliseconds()

  return Date.UTC(year, month - 1, day, hour, minute, second) - wholeSeconds
}

/** The first moment of the Dutch day that is `daysBefore` days before the Dutch day of `now`. */
function startOfDay(now: Date, daysBefore: number) {
  const { day, month, year } = clockAt(now)
  // Midnight on that day by the Dutch clock, written as if it were UTC. Date.UTC counts the days across months.
  const midnight = Date.UTC(year, month - 1, day - daysBefore)
  // The clock may change between this guess and the real moment, so the offset is looked up again.
  const guess = midnight - offsetAt(new Date(midnight))

  return new Date(midnight - offsetAt(new Date(guess)))
}
