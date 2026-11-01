/*
 * When a card with data from an import last changed at its source, as the line under the card
 * says it. Nothing here knows which source it is: a source gives a moment, and the newest one
 * counts.
 */

import { dateTimeOf, formatNewsTime } from './news'

/** The line under a card: the moment as a visitor reads it, and for a machine. */
export type LastModifiedText = {
  dateTime: string
  text: string
}

/**
 * The line "Laatst gewijzigd" for a list of moments, one per source the card rests on: the
 * newest of them, in the notation of the news (`formatNewsTime`). A source without a moment is
 * left out, and so is a moment after `now` (a clock that is ahead, or a wrong date), because a
 * source can't have changed in the future. Without any moment left it gives undefined, and the
 * card has no line.
 */
export function lastModifiedOf(moments: readonly (Date | undefined)[], now: Date): LastModifiedText | undefined {
  const known = moments.filter((moment): moment is Date => moment !== undefined && isValid(moment) && moment <= now)
  const newest = known.reduce<Date | undefined>(
    (latest, moment) => (latest === undefined || moment > latest ? moment : latest),
    undefined,
  )

  return newest === undefined ? undefined : { dateTime: dateTimeOf(newest), text: formatNewsTime(newest, now) }
}

/**
 * The moment of a source from the text it is saved as: the `Last-Modified` of a page, such as
 * `Sat, 24 Oct 2026 12:05:00 GMT`. A source that has none, or a text that is no moment, gives
 * undefined: we don't guess.
 */
export function momentOf(version: null | string | undefined) {
  if (version === null || version === undefined) {
    return undefined
  }

  const moment = new Date(version)

  return isValid(moment) ? moment : undefined
}

const isValid = (moment: Date) => !Number.isNaN(moment.getTime())
