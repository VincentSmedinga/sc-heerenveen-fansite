/*
 * The scoring of the game Prognose, which is the scoring of the old Fansite, unchanged. One
 * function scores one prediction, and the constants that it uses are the ones the page shows
 * in its card "Punten", so the table and the sum cannot drift apart. It needs no database.
 * The decisions are in docs/beslissingen/site.md, under _De telling van de Prognose is die van
 * de oude Fansite_.
 */

/** The points of one part, and why. */
export type PartPoints = {
  /** Whether the score was exactly right. */
  exact: boolean
  /** The side whose goals were right, when exactly one of the two numbers was right. */
  goals: 'away' | 'home' | undefined
  /** Whether the outcome (home win, draw or away win) was right. */
  outcome: boolean
  points: number
}

/** What a prediction holds: the half-time score and the full-time score. */
export type PredictionGuess = { fullTime: PredictionScore; halfTime: PredictionScore }

/** The points of a prediction. A part that cannot be scored yet is `undefined`, never 0. */
export type PredictionPoints = {
  fullTime: PartPoints | undefined
  halfTime: PartPoints | undefined
  /** The sum of the parts that can be scored. */
  total: number
}

/**
 * What was played. A score is `undefined` while it is not known: the half-time score comes
 * before the full-time score. The full-time score is the one after 90 minutes plus added time,
 * also in a match with extra time.
 */
export type PredictionResult = { fullTime?: PredictionScore | undefined; halfTime?: PredictionScore | undefined }

/** A score: the goals of the home club and of the away club. */
export type PredictionScore = { away: number; home: number }

/**
 * The points of one part: right to the number, the right outcome, and exactly one of the two
 * numbers right. The half-time score gives half of each, rounded down.
 */
export const pointsPerPart = {
  fullTime: { exact: 20, goals: 5, outcome: 10 },
  halfTime: { exact: 10, goals: 2, outcome: 5 },
} as const

/** The most a match gives: a perfect half-time score and a perfect full-time score. */
export const maxPredictionPoints = pointsPerPart.halfTime.exact + pointsPerPart.fullTime.exact

type Weights = { exact: number; goals: number; outcome: number }

const outcomeOf = ({ away, home }: PredictionScore) => Math.sign(home - away)

/**
 * The points of a prediction for what was played. The goal difference gives nothing. A match
 * without a known half-time score gives points for the full-time score only, and a match that
 * is still being played gives the half-time points only: points that are not known yet are
 * `undefined`, which is not the same as none.
 */
export function predictionPoints(guess: PredictionGuess, result: PredictionResult): PredictionPoints {
  const fullTime =
    result.fullTime === undefined ? undefined : scorePart(guess.fullTime, result.fullTime, pointsPerPart.fullTime)
  const halfTime =
    result.halfTime === undefined ? undefined : scorePart(guess.halfTime, result.halfTime, pointsPerPart.halfTime)

  return { fullTime, halfTime, total: (fullTime?.points ?? 0) + (halfTime?.points ?? 0) }
}

function scorePart(guess: PredictionScore, played: PredictionScore, weights: Weights): PartPoints {
  const exact = guess.home === played.home && guess.away === played.away

  if (exact) {
    return { exact, goals: undefined, outcome: true, points: weights.exact }
  }

  const outcome = outcomeOf(guess) === outcomeOf(played)
  const homeRight = guess.home === played.home
  const awayRight = guess.away === played.away
  // Both numbers right is an exact score, so here at most one of them is.
  const goals = homeRight ? 'home' : awayRight ? 'away' : undefined

  return {
    exact,
    goals,
    outcome,
    points: (outcome ? weights.outcome : 0) + (goals === undefined ? 0 : weights.goals),
  }
}
