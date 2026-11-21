import type { Database } from '@fansite/db/client'
import type { ScoreField } from '@fansite/design-system'

import { isOpen, type PredictionMatch, predictionMatches } from '@fansite/db/prediction-matches'
import { matches, predictionMaxGoals, predictions } from '@fansite/db/schema'
import { and, desc, eq, sql } from 'drizzle-orm'

import type { GameData } from './my-data'

// The game Prognose (issue 1447): which match a supporter can predict, the checks of the four
// numbers, and the write that keeps the deadline. The page and the action only call these. The
// rule of which match can be predicted is in `@fansite/db/prediction-matches`, so the importer
// can use it for the reminder (issue 1461).

export {
  closedCardHours,
  isOpen,
  type PredictionMatch,
  type PredictionMatches,
  predictionMatches,
} from '@fansite/db/prediction-matches'

/** The address of the page of the game. */
export const predictionPath = '/fans/prognose'

/** The name of the button that saves the form: its value is the number of the match. */
export const matchField = 'wedstrijd'

/** The four numbers of a prediction, in the order of the form: row by row. */
export const predictionFields: readonly ScoreField[] = ['halftimeHome', 'halftimeAway', 'fullTimeHome', 'fullTimeAway']

/** The name of sc Heerenveen in the words of the page. */
export const ourClub = 'sc Heerenveen'

/** The clubs of a match in the order of the line, the home club first. */
export const clubsOf = (match: Pick<PredictionMatch, 'home' | 'opponent'>) =>
  match.home ? { away: match.opponent, home: ourClub } : { away: ourClub, home: match.opponent }

/** What a supporter predicted: the four numbers as the form shows them. */
export type PredictionValues = Partial<Record<ScoreField, string>>

/** What a supporter predicted for a match, as the form shows it, or `undefined`. */
export async function findPrediction(
  db: Database,
  supporterId: number,
  matchId: number,
): Promise<PredictionValues | undefined> {
  const [row] = await db
    .select()
    .from(predictions)
    .where(and(eq(predictions.supporterId, supporterId), eq(predictions.matchId, matchId)))

  return row === undefined ? undefined : valuesOf(row)
}

const valuesOf = (row: Record<ScoreField, number>): PredictionValues => ({
  fullTimeAway: String(row.fullTimeAway),
  fullTimeHome: String(row.fullTimeHome),
  halftimeAway: String(row.halftimeAway),
  halftimeHome: String(row.halftimeHome),
})

/** The id of the field of a match, which the summary of the errors links to. */
export const fieldId = (matchId: number, field: ScoreField) => `voorspelling-${matchId}-${field}`

const standOf = (field: ScoreField) => (field.startsWith('halftime') ? 'rust' : 'eind')

/** What the form shows after a submit: the values, the errors, and what came of it. */
export type PredictionState = {
  errors: Partial<Record<ScoreField, string>>
  failure?: 'closed'
  /** Set when the prediction was stored: whether it replaced an earlier one. */
  saved?: { changed: boolean }
  values: PredictionValues
}

/** The words of an error of one field. */
export function errorMessage(field: ScoreField, club: string, problem: 'invalid' | 'missing') {
  return problem === 'missing'
    ? `Vul de goals van ${club} bij de ${standOf(field)}stand in.`
    : `Vul bij de ${standOf(field)}stand van ${club} één cijfer van 0 tot ${predictionMaxGoals} in.`
}

export const emptyPredictionState: PredictionState = { errors: {}, values: {} }

/** The words of a form that was submitted after the kick-off. */
export const closedMessage =
  'De wedstrijd is al begonnen of het formulier is dicht. Je voorspelling is niet opgeslagen.'

/** What reading the four fields gives: the goals, or an error for each field that is wrong. */
export type ParsedPrediction =
  | { errors: Partial<Record<ScoreField, string>>; goals?: never; values: PredictionValues }
  | { errors?: never; goals: Record<ScoreField, number>; values: PredictionValues }

/** What the writing of a prediction came to. */
export type SaveResult = { answer: 'closed' } | { answer: 'saved'; changed: boolean }

/**
 * Reads the four fields of the form. Each one is one digit from 0 to 9: an empty field is
 * missing, anything else is invalid. It names the club of the field in the error.
 */
export function parsePrediction(
  entries: Partial<Record<ScoreField, unknown>>,
  clubs: { away: string; home: string },
): ParsedPrediction {
  const values: PredictionValues = {}
  const errors: Partial<Record<ScoreField, string>> = {}
  const goals: Partial<Record<ScoreField, number>> = {}

  for (const field of predictionFields) {
    const entry = entries[field]
    const text = typeof entry === 'string' ? entry.trim() : ''
    const club = field.endsWith('Home') ? clubs.home : clubs.away

    values[field] = text

    if (text === '') {
      errors[field] = errorMessage(field, club, 'missing')
    } else if (!/^[0-9]$/.test(text)) {
      errors[field] = errorMessage(field, club, 'invalid')
    } else {
      goals[field] = Number(text)
    }
  }

  return Object.keys(errors).length > 0 ? { errors, values } : { goals: goals as Record<ScoreField, number>, values }
}

/**
 * Stores the prediction of a supporter for the match, and replaces an earlier one. It writes
 * only for the match that can be predicted now (`predictionMatches`), and the write checks the
 * deadline once more with the clock of the database (`kickoff_at > UTC_TIMESTAMP()`), so a slow
 * request that began before the kick-off can't get in after it.
 */
export async function savePrediction(
  db: Database,
  input: { goals: Record<ScoreField, number>; matchId: number; supporterId: number },
  now = new Date(),
): Promise<SaveResult> {
  const { next } = await predictionMatches(db, now)

  if (next === undefined || next.id !== input.matchId || !isOpen(next, now)) {
    return { answer: 'closed' }
  }

  const earlier = await findPrediction(db, input.supporterId, input.matchId)
  const { goals } = input
  const [result] = await db.execute(sql`
    INSERT INTO predictions
      (supporter_id, match_id, halftime_home, halftime_away, full_time_home, full_time_away, created_at, updated_at)
    SELECT ${input.supporterId}, m.id, ${goals.halftimeHome}, ${goals.halftimeAway}, ${goals.fullTimeHome},
      ${goals.fullTimeAway}, UTC_TIMESTAMP(), UTC_TIMESTAMP()
    FROM matches m
    WHERE m.id = ${input.matchId} AND m.status = 'scheduled' AND m.kickoff_at > UTC_TIMESTAMP()
    ON DUPLICATE KEY UPDATE halftime_home = VALUES(halftime_home), halftime_away = VALUES(halftime_away),
      full_time_home = VALUES(full_time_home), full_time_away = VALUES(full_time_away), updated_at = UTC_TIMESTAMP()
  `)

  // With nothing selected, because the kick-off had come, nothing is written or matched.
  return (result as { affectedRows: number }).affectedRows === 0
    ? { answer: 'closed' }
    : { answer: 'saved', changed: earlier !== undefined }
}

const timeZone = 'Europe/Amsterdam'
const weekdayFormat = new Intl.DateTimeFormat('nl-NL', { timeZone, weekday: 'short' })
const dayFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', timeZone, weekday: 'short' })
const timeFormat = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', hourCycle: 'h23', minute: '2-digit', timeZone })
const hour = 60 * 60 * 1000
const days = 24 * hour

/**
 * The moment of the kick-off in the words of the page, in Dutch time: "za 16.45" within the
 * coming week, and "za 5 dec 16.45" further away, where the weekday alone would be unclear.
 * The time has a dot, as "16.45".
 */
export function kickoffText(kickoffAt: Date, now = new Date()) {
  const day = (kickoffAt.getTime() - now.getTime() < 6 * days ? weekdayFormat : dayFormat).format(kickoffAt)

  return `${day} ${timeFormat.format(kickoffAt).replace(':', '.')}`
}

/** The words of the Tag of an open form: "Open tot za 16.45". */
export const deadlineText = (kickoffAt: Date, now = new Date()) => `Open tot ${kickoffText(kickoffAt, now)}`

/** The two scores of the notice, in the order of the clubs on the line: "Rust 1–0, eind 2–1" */
export const standsText = (values: PredictionValues) =>
  `Rust ${values.halftimeHome}–${values.halftimeAway}, eind ${values.fullTimeHome}–${values.fullTimeAway}`

/** The words of the notice above a form that was stored. */
export const savedMessage = (values: PredictionValues, changed: boolean) =>
  `${changed ? 'Je voorspelling is gewijzigd' : 'Je voorspelling staat'}. ${standsText(values)}. Je kunt hem wijzigen tot de aftrap.`

const dateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', timeZone, year: 'numeric' })

/**
 * What a supporter predicted, for Mijn account and the page "Alles wat we van je bewaren": one
 * row per match, the newest first, with the match and the two scores in the order of the clubs
 * on the line. `undefined` when the supporter predicted nothing.
 */
export async function predictionData(db: Database, supporterId: number) {
  const found = await db
    .select({
      fullTimeAway: predictions.fullTimeAway,
      fullTimeHome: predictions.fullTimeHome,
      halftimeAway: predictions.halftimeAway,
      halftimeHome: predictions.halftimeHome,
      home: matches.home,
      matchDate: matches.matchDate,
      opponent: matches.opponent,
    })
    .from(predictions)
    .innerJoin(matches, eq(matches.id, predictions.matchId))
    .where(eq(predictions.supporterId, supporterId))
    .orderBy(desc(matches.matchDate), desc(matches.id))

  if (found.length === 0) {
    return undefined
  }

  return {
    columns: ['Wedstrijd', 'Rust', 'Eind'],
    rows: found.map((row) => {
      const clubs = clubsOf(row)

      return {
        cells: [`${row.halftimeHome}–${row.halftimeAway}`, `${row.fullTimeHome}–${row.fullTimeAway}`],
        header: `${clubs.home} – ${clubs.away}, ${dateFormat.format(new Date(`${row.matchDate}T12:00:00Z`))}`,
      }
    }),
    summary: found.length === 1 ? '1 voorspelling' : `${found.length} voorspellingen`,
  } satisfies GameData
}
