/**
 * A day and a time on the clock in the Netherlands, `2026-11-14` and `20:00`, as a moment in
 * UTC. The text must be a real day and time; the caller checks that.
 */
export function amsterdamToUtc(day: string, time: string): Date {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number]
  const [hours, minutes] = time.split(':').map(Number) as [number, number]
  const local = Date.UTC(year, month - 1, date, hours, minutes)
  // The offset at the first guess may differ from the offset at the answer around a change of
  // the clock, so the guess is corrected twice.
  let moment = local - amsterdamOffsetMs(local)

  moment = local - amsterdamOffsetMs(moment)

  return new Date(moment)
}

/**
 * The season a moment falls in. A season starts on 1 July and is written `2026/27`:
 * 25 October 2026 is in `2026/27`, and 30 June 2027 still is.
 */
export function seasonOf(moment: Date): string {
  const year = moment.getUTCMonth() >= 6 ? moment.getUTCFullYear() : moment.getUTCFullYear() - 1

  return `${year}/${String((year + 1) % 100).padStart(2, '0')}`
}

/** The first day of a season, `2026/27` becoming `2026-07-01`. */
export function seasonStart(season: string): string {
  return `${season.slice(0, 4)}-07-01`
}

/** A moment as the day and the time on the clock in the Netherlands: `2026-11-14`, `20:00`. */
export function utcToAmsterdam(moment: Date): { day: string; time: string } {
  const local = new Date(moment.getTime() + amsterdamOffsetMs(moment.getTime())).toISOString()

  return { day: local.slice(0, 10), time: local.slice(11, 16) }
}

/** How far the clock in the Netherlands is ahead of UTC at a moment: one or two hours. */
function amsterdamOffsetMs(moment: number): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    hour: 'numeric',
    hourCycle: 'h23',
    minute: 'numeric',
    month: 'numeric',
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
  }).formatToParts(new Date(moment))
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value)

  return (
    Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute')) -
    Math.floor(moment / 60_000) * 60_000
  )
}
