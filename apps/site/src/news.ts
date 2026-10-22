import type { PublicItem } from '@fansite/db/queries'

/* How the site shows the news to visitors: by day, in Dutch time. The database holds UTC. */

const timeZone = 'Europe/Amsterdam'

/** The week the homepage shows: today and the six days before it. */
const daysShown = 7

const dayFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', timeZone, weekday: 'long' })

const timeFormat = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', hourCycle: 'h23', minute: '2-digit', timeZone })

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

/** The day by the Dutch calendar, such as "woensdag 21 oktober". */
export function formatDay(moment: Date) {
  return dayFormat.format(moment)
}

/** The time of day in the Netherlands, such as "14:05". */
export function formatTime(moment: Date) {
  return timeFormat.format(moment)
}

/**
 * The items grouped by the Dutch calendar day on which they were published, in the order the days first appear. Within
 * a day the items keep their order. Pass them newest first, and the days come newest first too.
 */
export function groupByDay<Item extends Pick<PublicItem, 'publishedAt'>>(items: readonly Item[]) {
  const days = new Map<string, { day: string; items: Item[] }>()

  for (const item of items) {
    const { day, month, year } = clockAt(item.publishedAt)
    const key = `${year}-${month}-${day}`
    const group = days.get(key) ?? { day: formatDay(item.publishedAt), items: [] }

    group.items.push(item)
    days.set(key, group)
  }

  return [...days.entries()].map(([key, { day, items }]) => ({ day, items, key }))
}

/** The start of the week the homepage shows: the first moment of the Dutch day six days before today. */
export function windowStart(now: Date) {
  return startOfDay(now, daysShown - 1)
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
