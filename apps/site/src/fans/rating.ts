import type { PlayerPosition } from '@fansite/db/schema'

import { ratingLimits } from '@fansite/db/schema'

import type { PredictionMatch } from '#src/fans/prediction'

import { kickoffText } from '#src/fans/prediction'

// The game Uitblinker (issue 1470): the names of the form, the checks of the grades, and the
// words of the page. Which match can be rated, who is in the list and the write that keeps the
// window are in `@fansite/db/rating-window`; the page and the action only call these.

export {
  findOwnCoachRating,
  findOwnRatings,
  findRatingWindow,
  ratingMinimumMinutes,
  saveRatings,
} from '@fansite/db/rating-window'
export type { RatingCoach, RatingMatch, RatingPlayer, RatingWindow } from '@fansite/db/rating-window'

/** The address of the page of the game. */
export const ratingPath = '/fans/uitblinker'

/** The name of the button that saves the form: its value is the number of the match. */
export const ratingMatchField = 'wedstrijd'

/** The name of the form field of one player: the number of the appearance in the report. */
export const gradeField = (appearanceId: number) => `cijfer-${appearanceId}`

/** The `id` of the rating scale of a player, which the summary of the errors links to. */
export const scaleId = (appearanceId: number) => `cijfer-${appearanceId}`

/**
 * The name of the form field of the head coach, and the `id` of his rating scale (issue 1478).
 * It has no number of an appearance, so it can't be taken for a player.
 */
export const coachField = 'cijfer-trainer'

/** The name of the group of the head coach: "Cijfer voor trainer Robin Veldman". */
export const coachLabel = (name: string) => `Cijfer voor trainer ${name}`

/** The line under the name of the head coach. */
export const coachLine = 'Trainer'

/** The row of the head coach in the table of the grades: "Robin Veldman (trainer)". */
export const coachRow = (name: string) => `${name} (trainer)`

/** What the form shows after a submit: the grades, the errors, and what came of it. */
export type RatingState = {
  /** The error of the head coach when he has no grade. */
  coachError?: string
  /** The grade of the head coach as it was chosen. */
  coachValue?: string
  /** The error of each player without a grade, by the number of the appearance. */
  errors: Record<number, string>
  failure?: 'closed' | 'late'
  /** The grades as they were chosen, by the number of the appearance. */
  values: Record<number, string>
}

export const emptyRatingState: RatingState = { errors: {}, values: {} }

/** The words of a form that was submitted after the window had closed. */
export const closedMessage = 'Het venster is dicht. Je cijfers zijn niet opgeslagen.'

/** The words for an account that was made after the match began. */
export const lateMessage = 'Je account is gemaakt nadat deze wedstrijd begon. Je doet mee vanaf de volgende wedstrijd.'

/** What the page shows when the report of the match is not finished. */
export const waitingText =
  'Het verslag van deze wedstrijd is nog niet af. Zodra de redactie weet wie hoe lang speelde, kun je hier cijfers geven.'

/** The words of the error of a player without a grade. */
export const errorMessage = (name: string) => `Geef ${name} een cijfer.`

/** The heading of the summary of the errors: "Nog 2 cijfers". */
export const summaryTitle = (missing: number) => `Nog ${missing} ${missing === 1 ? 'cijfer' : 'cijfers'}`

/** What stays true after an error, under the summary. */
export const keptText = 'Je andere cijfers staan nog ingevuld.'

/** The counter next to the button: "Nog 9 van 15 te gaan". */
export const counterText = (left: number, total: number) => `Nog ${left} van ${total} te gaan`

/** The text of the Tag of an open form: "Open tot do 20.00". */
export const deadlineTag = (closesAt: Date, now = new Date()) => `Open tot ${kickoffText(closesAt, now)}`

const positionWords: Record<PlayerPosition, string> = {
  aanvaller: 'Aanvaller',
  doelman: 'Keeper',
  middenvelder: 'Middenvelder',
  verdediger: 'Verdediger',
}

/** The line under a player's name: "Keeper · 90 min", with "doelpunt" or "assist" after it. */
export function playerLine(player: {
  assist: boolean
  goal: boolean
  minutes: number
  position: null | PlayerPosition
}) {
  return [
    ...(player.position === null ? [] : [positionWords[player.position]]),
    `${player.minutes} min`,
    ...(player.goal ? ['doelpunt'] : []),
    ...(player.assist ? ['assist'] : []),
  ].join(' · ')
}

const timeZone = 'Europe/Amsterdam'
const closingDay = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', timeZone, weekday: 'long' })
const closingTime = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', hourCycle: 'h23', minute: '2-digit', timeZone })

/** The moment the window closes, in a sentence: "donderdag 26 november, 20.00 uur". */
export const closingText = (closesAt: Date) =>
  `${closingDay.format(closesAt)}, ${closingTime.format(closesAt).replace(':', '.')} uur`

/** The day of the next match in a sentence: "zaterdag 28 november". */
export const nextDayText = (match: Pick<PredictionMatch, 'kickoffAt' | 'matchDate'>) =>
  closingDay.format(match.kickoffAt ?? new Date(`${match.matchDate}T12:00:00Z`))

/** What reading the form gives: the grades, or an error for each player who has none. */
export type ParsedRatings =
  | {
      coachError?: never
      coachGrade?: number
      coachValue?: string
      errors?: never
      grades: Map<number, number>
      values: Record<number, string>
    }
  | {
      coachError?: string
      coachGrade?: never
      coachValue?: string
      errors: Record<number, string>
      grades?: never
      values: Record<number, string>
    }

const gradePattern = new RegExp(`^(?:[${ratingLimits.minGrade}-9]|${ratingLimits.maxGrade})$`)

/**
 * Reads the grades of the form for the players of the list, and for the head coach when the
 * match has one (`coach`). Each one is a whole number from 1 to 10: a player or coach without
 * one, or with anything else, is a gap, and the other grades are kept. Nothing is stored while
 * there is a gap.
 */
export function parseRatings(
  entries: ReadonlyMap<number, unknown>,
  players: readonly { appearanceId: number; name: string }[],
  coach?: { entry: unknown; name: string },
): ParsedRatings {
  const values: Record<number, string> = {}
  const errors: Record<number, string> = {}
  const grades = new Map<number, number>()

  for (const player of players) {
    const entry = entries.get(player.appearanceId)
    const text = typeof entry === 'string' ? entry.trim() : ''

    if (gradePattern.test(text)) {
      values[player.appearanceId] = text
      grades.set(player.appearanceId, Number(text))
    } else {
      errors[player.appearanceId] = errorMessage(player.name)
    }
  }

  const coachText = coach === undefined ? '' : typeof coach.entry === 'string' ? coach.entry.trim() : ''
  const coachGiven = gradePattern.test(coachText)
  const coachValue = coachGiven ? { coachValue: coachText } : {}

  if (coach !== undefined && !coachGiven) {
    return { coachError: errorMessage(coach.name), errors, values }
  }

  return Object.keys(errors).length > 0
    ? { errors, values, ...coachValue }
    : { grades, values, ...coachValue, ...(coachGiven ? { coachGrade: Number(coachText) } : {}) }
}
