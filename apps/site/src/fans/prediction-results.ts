import type { Database } from '@fansite/db/client'

import { clubs, matches, predictions, supporters } from '@fansite/db/schema'
import {
  type PredictionGuess,
  type PredictionPoints,
  predictionPoints,
  type PredictionResult,
  type PredictionScore,
} from '@fansite/shared/prediction-points'
import { desc, eq } from 'drizzle-orm'

import { cacheForKey } from '#src/cache'
import { getDatabase } from '#src/database'

// The points of the game Prognose (issue 1449): what a supporter predicted for each match, what
// was played, and the points that follow from the two. The points are never stored. They are
// worked out here each time they are read, by `predictionPoints` of `@fansite/shared`, so a
// corrected score corrects the points of everybody at once.

/** What the card "Zo deed iedereen het" says about a match that has a result. */
export type CrowdFigures = {
  /** The average of the points, or `undefined` while fewer than `crowdMinimum` predicted. */
  average: number | undefined
  count: number
  /** How many had the full-time score exactly right. */
  exact: number
  /** How many had the full-time outcome right. */
  outcome: number
}

/** What the list says of a match: where it stands. */
export type PredictionState = 'cancelled' | 'live' | 'played' | 'postponed' | 'upcoming'

/** A match of a prediction, with what the cards show of it. */
export type ScoredMatch = {
  clubSlug: string
  competition: string
  dateText: null | string
  goalsAgainst: null | number
  goalsFor: null | number
  home: boolean
  id: number
  kickoffAt: Date | null
  matchDate: string
  opponent: string
  round: string
  season: string
  state: PredictionState
}

/** One prediction of a supporter, with its match, and its points when there are any yet. */
export type ScoredPrediction = {
  guess: PredictionGuess
  match: ScoredMatch
  points: PredictionPoints
  /** What counts as played: the scores that are known, as home and away. */
  result: PredictionResult
}

/** Under this number of predictions the card says only how many there were. */
export const crowdMinimum = 5

const fiveMinutes = 5 * 60 * 1000

type Row = {
  afterNinetyAgainst: null | number
  afterNinetyFor: null | number
  clubSlug: string
  competition: string
  dateText: null | string
  fullTimeAway: number
  fullTimeHome: number
  goalsAgainst: null | number
  goalsFor: null | number
  halfTimeAgainst: null | number
  halftimeAway: number
  halfTimeFor: null | number
  halftimeHome: number
  home: boolean
  id: number
  kickoffAt: Date | null
  matchDate: string
  opponent: string
  round: string
  season: string
  status: 'cancelled' | 'played' | 'postponed' | 'scheduled'
}

/** A score of sc Heerenveen against the opponent, as the home and the away club. */
const inLineOrder = (home: boolean, goalsFor: number, goalsAgainst: number): PredictionScore =>
  home ? { away: goalsAgainst, home: goalsFor } : { away: goalsFor, home: goalsAgainst }

const stateOf = (row: Row, now: Date): PredictionState => {
  if (row.status === 'played') {
    return 'played'
  }

  if (row.status !== 'scheduled') {
    return row.status
  }

  return row.kickoffAt !== null && row.kickoffAt.getTime() <= now.getTime() ? 'live' : 'upcoming'
}

/**
 * What counts as played. The full-time score is the one after 90 minutes plus added time, also
 * in a match with extra time, so the score after extra time and the shoot-out never count. The
 * half-time score counts from any source as soon as it is known, before the match has ended.
 * A match that was called off has no result.
 */
export function resultOf(row: Pick<Row, Exclude<keyof Row, 'id'>>): PredictionResult {
  if (row.status === 'cancelled' || row.status === 'postponed') {
    return {}
  }

  const halfTime =
    row.halfTimeFor === null || row.halfTimeAgainst === null
      ? undefined
      : inLineOrder(row.home, row.halfTimeFor, row.halfTimeAgainst)
  const goalsFor = row.afterNinetyFor ?? row.goalsFor
  const goalsAgainst = row.afterNinetyAgainst ?? row.goalsAgainst

  return {
    fullTime:
      row.status === 'played' && goalsFor !== null && goalsAgainst !== null
        ? inLineOrder(row.home, goalsFor, goalsAgainst)
        : undefined,
    halfTime,
  }
}

const columns = {
  afterNinetyAgainst: matches.afterNinetyAgainst,
  afterNinetyFor: matches.afterNinetyFor,
  clubSlug: clubs.slug,
  competition: matches.competition,
  dateText: matches.dateText,
  fullTimeAway: predictions.fullTimeAway,
  fullTimeHome: predictions.fullTimeHome,
  goalsAgainst: matches.goalsAgainst,
  goalsFor: matches.goalsFor,
  halfTimeAgainst: matches.halfTimeAgainst,
  halftimeAway: predictions.halftimeAway,
  halfTimeFor: matches.halfTimeFor,
  halftimeHome: predictions.halftimeHome,
  home: matches.home,
  id: matches.id,
  kickoffAt: matches.kickoffAt,
  matchDate: matches.matchDate,
  opponent: matches.opponent,
  round: matches.round,
  season: matches.season,
  status: matches.status,
}

/** The figures of one match for everybody, read without the cache. */
export async function loadCrowdFigures(db: Database, matchId: number): Promise<CrowdFigures | undefined> {
  const rows = await db
    .select({ ...columns, disabledAt: supporters.disabledAt })
    .from(predictions)
    .leftJoin(supporters, eq(supporters.id, predictions.supporterId))
    .innerJoin(matches, eq(matches.id, predictions.matchId))
    .innerJoin(clubs, eq(clubs.id, matches.clubId))
    .where(eq(predictions.matchId, matchId))
  // A blocked account is left out, as it is from the rankings; an account that was closed has
  // no supporter any more and stays, because its prediction was made.
  const open = rows.filter((row) => row.disabledAt === null)

  if (open.length === 0) {
    return undefined
  }

  const figures = open.map((row) => scored(row, new Date()).points)
  const count = open.length

  return {
    average: count < crowdMinimum ? undefined : figures.reduce((sum, points) => sum + points.total, 0) / count,
    count,
    exact: figures.filter((points) => points.fullTime?.exact === true).length,
    outcome: figures.filter((points) => points.fullTime?.outcome === true).length,
  }
}

/**
 * The predictions of a supporter with their points, the newest match first. It is read each
 * time and not cached, so a prediction that was just saved is in the list: it is the rows of
 * one supporter, found by the index on the supporter and the match. What all supporters share
 * and is heavy, such as the figures of a match, is cached (see `crowdFigures`).
 */
export async function scoredPredictions(db: Database, supporterId: number, now = new Date()) {
  const rows = await db
    .select(columns)
    .from(predictions)
    .innerJoin(matches, eq(matches.id, predictions.matchId))
    .innerJoin(clubs, eq(clubs.id, matches.clubId))
    .where(eq(predictions.supporterId, supporterId))
    .orderBy(desc(matches.matchDate), desc(matches.kickoffAt), desc(matches.id))

  return rows.map((row) => scored(row, now))
}

/** What the supporter scored over the matches that have points: their number and the sum. */
export function totalsOf(list: readonly ScoredPrediction[]) {
  const counted = list.filter((item) => item.match.state !== 'cancelled' && item.match.state !== 'postponed')

  return { count: counted.length, points: counted.reduce((sum, item) => sum + item.points.total, 0) }
}

function scored(row: Row, now: Date): ScoredPrediction {
  const guess = {
    fullTime: { away: row.fullTimeAway, home: row.fullTimeHome },
    halfTime: { away: row.halftimeAway, home: row.halftimeHome },
  }
  const result = resultOf(row)

  return {
    guess,
    match: {
      clubSlug: row.clubSlug,
      competition: row.competition,
      dateText: row.dateText,
      goalsAgainst: row.status === 'played' ? row.goalsAgainst : null,
      goalsFor: row.status === 'played' ? row.goalsFor : null,
      home: row.home,
      id: row.id,
      kickoffAt: row.kickoffAt,
      matchDate: row.matchDate,
      opponent: row.opponent,
      round: row.round,
      season: row.season,
      state: stateOf(row, now),
    },
    points: predictionPoints(guess, result),
    result,
  }
}

const getCrowdFigures = cacheForKey(fiveMinutes, (key) => loadCrowdFigures(getDatabase().db, Number(key)))

/**
 * The figures of one match for the card "Zo deed iedereen het", read once per five minutes for
 * each match, so a corrected score corrects them within that time. The caller asks only for
 * the match of a prediction of the supporter, so the keys are matches that exist.
 */
export const crowdFigures = (matchId: number) => getCrowdFigures(String(matchId))
