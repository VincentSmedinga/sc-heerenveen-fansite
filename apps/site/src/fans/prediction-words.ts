import type { MatchProps, PredictionListGuess, PredictionListItem } from '@fansite/design-system'

import { type PartPoints, pointsPerPart } from '@fansite/shared/prediction-points'

import { matchMoment } from '#src/match-format'
import { reportAddress } from '#src/report-data'

import type { PredictionState, ScoredMatch, ScoredPrediction } from './prediction-results'

// The words of the points of the game Prognose (issue 1449): the rows of the list, and the line
// that says why a part gave the points it gave.

/** Why a part gave its points: "Goede uitslag 10, goals van FC Twente goed 5". */
export function reasonText(part: PartPoints, which: 'fullTime' | 'halfTime', clubs: { away: string; home: string }) {
  const weights = pointsPerPart[which]

  if (part.exact) {
    return `Precies goed ${weights.exact}`
  }

  const reasons = [
    ...(part.outcome ? [`Goede uitslag ${weights.outcome}`] : []),
    ...(part.goals === undefined ? [] : [`goals van ${clubs[part.goals]} goed ${weights.goals}`]),
  ]

  if (reasons.length === 0) {
    return 'Niets goed'
  }

  // The first word of the line has a capital, also when the goals come first.
  return reasons.join(', ').replace(/^./, (letter) => letter.toUpperCase())
}

/** A score as it is written on the line: "2–1". */
export const scoreText = (score: { away: number; home: number }) => `${score.home}–${score.away}`

/** What the fan predicted, on the card of a match: "Jij: 0–0 bij rust, 1–2 eind". */
export const guessText = ({ guess }: Pick<ScoredPrediction, 'guess'>) =>
  `Jij: ${scoreText(guess.halfTime)} bij rust, ${scoreText(guess.fullTime)} eind`

/** A row of the list "Jouw voorspellingen". */
export function listItemOf(
  item: ScoredPrediction,
  now: Date,
): PredictionListItem & { prediction: PredictionListGuess } {
  const { match } = item
  const played = match.state === 'played'
  // Only a match that was played has parts that are right or wrong: it gives its points.
  const rightOf = (part: undefined | { points: number }) => (played && part !== undefined ? part.points > 0 : undefined)

  return {
    match: rowMatchOf(match, match.state, now),
    prediction: {
      fullTime: { right: rightOf(item.points.fullTime), score: scoreText(item.guess.fullTime) },
      halfTime: { right: rightOf(item.points.halfTime), score: scoreText(item.guess.halfTime) },
    },
    ...(played ? { points: item.points.total } : {}),
  }
}

/** The score of a match that was played, as the home and the away club, or `undefined`. */
export function playedScore(match: Pick<ScoredMatch, 'goalsAgainst' | 'goalsFor' | 'home'>) {
  if (match.goalsFor === null || match.goalsAgainst === null) {
    return undefined
  }

  return match.home
    ? { away: match.goalsAgainst, home: match.goalsFor }
    : { away: match.goalsFor, home: match.goalsAgainst }
}

/**
 * The match of a row of a list, as the `Match` takes it: played with its result and the link to
 * the report, called off or postponed, still to be played, or being played, which says "Bezig".
 * The list shows the day alone, also for a match that has not begun.
 */
export function rowMatchOf(match: Omit<ScoredMatch, 'state'>, state: PredictionState, now: Date): MatchProps {
  const { goalsAgainst, goalsFor } = match
  const base = { competition: match.competition, home: match.home, opponent: match.opponent, round: match.round }

  if (state === 'cancelled' || state === 'postponed') {
    return { ...base, status: state }
  }
  if (state === 'result_unknown') {
    return { ...base, ...matchMoment({ ...match, status: 'played' }, now), status: state }
  }

  const moment = matchMoment({ ...match, status: 'played' }, now)

  return state === 'played' && goalsFor !== null && goalsAgainst !== null
    ? {
        ...base,
        ...moment,
        goalsAgainst,
        goalsFor,
        reportHref: reportAddress(match.season, match.matchDate, match.clubSlug),
        status: 'played',
      }
    : { ...base, ...moment, ...(state === 'live' ? { note: 'Bezig' } : {}), status: 'scheduled' }
}
