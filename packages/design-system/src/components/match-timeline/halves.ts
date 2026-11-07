/** The three blocks of the course of a match. */
export const matchHalves = ['first', 'second', 'extra-time'] as const

export type MatchHalf = (typeof matchHalves)[number]

const endOfFirstHalf = 45
const endOfRegularTime = 90

/**
 * The block an event belongs to, from its minute on the clock. Added time belongs to the half
 * it follows, so 45+2 is in the first half and 90+3 in the second: the minute is 45 and 90
 * there, and the added time does not count. Everything after minute 90 is extra time, but only
 * in a match that had it: without extra time a minute past 90 has nowhere else to go than the
 * second half.
 */
export function halfOf(minute: number, extraTime: boolean): MatchHalf {
  if (minute <= endOfFirstHalf) {
    return 'first'
  }

  return minute <= endOfRegularTime || !extraTime ? 'second' : 'extra-time'
}
