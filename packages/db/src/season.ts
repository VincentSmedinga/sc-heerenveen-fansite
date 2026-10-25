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
