import type { Database } from '@fansite/db/client'
import type { ScoreField } from '@fansite/design-system'

import { clubs, matches, predictionMaxGoals, predictions } from '@fansite/db/schema'
import { and, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm'

// The game Prognose (issue 1447): which match a supporter can predict, the checks of the four
// numbers, and the write that keeps the deadline. The page and the action only call these.

/** The address of the page of the game. */
export const predictionPath = '/fans/prognose'

/** The name of the button that saves the form: its value is the number of the match. */
export const matchField = 'wedstrijd'

/** The four numbers of a prediction, in the order of the form: row by row. */
export const predictionFields: readonly ScoreField[] = ['halftimeHome', 'halftimeAway', 'fullTimeHome', 'fullTimeAway']

/** The name of sc Heerenveen in the words of the page. */
export const ourClub = 'sc Heerenveen'

/**
 * How long after the kick-off a match that has begun stays on the page as "Gesloten": a match
 * with extra time and a shoot-out takes about three hours.
 */
export const closedCardHours = 4

/** The match of a card: what the page shows of it and what the deadline needs. */
export type PredictionMatch = {
  clubSlug: string
  competition: string
  dateText: null | string
  home: boolean
  id: number
  kickoffAt: Date | null
  matchDate: string
  opponent: string
  round: string
  season: string
  status: 'cancelled' | 'played' | 'postponed' | 'scheduled'
}

/**
 * The matches of the page: `next` is the one match that can be predicted now, and `started` is
 * the match that began less than `closedCardHours` ago, shown as closed above it.
 */
export type PredictionMatches = { next?: PredictionMatch; started?: PredictionMatch }

/** What a supporter predicted: the four numbers as the form shows them. */
export type PredictionValues = Partial<Record<ScoreField, string>>

/** The clubs of a match in the order of the line, the home club first. */
export const clubsOf = (match: Pick<PredictionMatch, 'home' | 'opponent'>) =>
  match.home ? { away: match.opponent, home: ourClub } : { away: ourClub, home: match.opponent }

const columns = {
  clubSlug: clubs.slug,
  competition: matches.competition,
  dateText: matches.dateText,
  home: matches.home,
  id: matches.id,
  kickoffAt: matches.kickoffAt,
  matchDate: matches.matchDate,
  opponent: matches.opponent,
  round: matches.round,
  season: matches.season,
  status: matches.status,
}

const hour = 60 * 60 * 1000

/**
 * The first moment of a match, to put the matches in order: the kick-off, or the start of the
 * day while the time is not known, so a match without a time stands after the ones of its day
 * that have one.
 */
const orderOf = (match: PredictionMatch) =>
  `${match.matchDate} ${match.kickoffAt === null ? '99:99' : match.kickoffAt.toISOString().slice(11, 16)}`

/**
 * Which match the form is for. All matches of the first team count: the league, the cup, the
 * play-offs and Europe. A match that is cancelled, or postponed without a new date, doesn't
 * count, so the form moves on to the next one. A match that was postponed and got a new date
 * is the same match, so what was predicted stays. The next match is the first one that has not
 * begun; one without a known time counts while its day is not over. The deadline is the
 * kick-off by the clock of the server (`now`).
 */
export async function predictionMatches(db: Database, now = new Date()): Promise<PredictionMatches> {
  const since = new Date(now.getTime() - closedCardHours * hour)
  const today = now.toISOString().slice(0, 10)
  const found = await db
    .select(columns)
    .from(matches)
    .innerJoin(clubs, eq(clubs.id, matches.clubId))
    .where(
      and(
        inArray(matches.status, ['scheduled', 'played']),
        or(
          and(sql`${matches.kickoffAt} is not null`, gt(matches.kickoffAt, since)),
          and(isNull(matches.kickoffAt), eq(matches.status, 'scheduled'), sql`${matches.matchDate} >= ${today}`),
        ),
      ),
    )
  const sorted = found.toSorted((a, b) => orderOf(a).localeCompare(orderOf(b)))
  const next = sorted.find(
    (match) => match.status === 'scheduled' && (match.kickoffAt === null || match.kickoffAt.getTime() > now.getTime()),
  )
  const started = sorted.findLast((match) => match.kickoffAt !== null && match.kickoffAt.getTime() <= now.getTime())

  return {
    ...(next === undefined ? {} : { next }),
    ...(started === undefined ? {} : { started }),
  }
}

/** Whether the form of the match is open: its kick-off is known and has not come. */
export const isOpen = (match: Pick<PredictionMatch, 'kickoffAt'>, now = new Date()) =>
  match.kickoffAt !== null && match.kickoffAt.getTime() > now.getTime()

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
