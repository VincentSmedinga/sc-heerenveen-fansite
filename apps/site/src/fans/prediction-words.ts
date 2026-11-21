import type { PredictionListItem } from '@fansite/design-system'

import { type PartPoints, pointsPerPart } from '@fansite/shared/prediction-points'

import { matchMoment } from '#src/match-format'

import type { PredictionState, ScoredMatch, ScoredPrediction } from './prediction-results'

import { clubsOf } from './prediction'

// The words of the points of the game Prognose (issue 1449): the rows of the list, and the line
// that says why a part gave the points it gave.

/** The words of a match that gives no points: where it stands. */
export const stateText: Record<Exclude<PredictionState, 'played'>, string> = {
  cancelled: 'Afgelast',
  live: 'Bezig',
  postponed: 'Uitgesteld',
  upcoming: 'Nog niet gespeeld',
}

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

/** What the supporter predicted, in the words of the list: "Jij: 0–0 bij rust, 1–2 eind". */
export const guessText = ({ guess }: Pick<ScoredPrediction, 'guess'>) =>
  `Jij: ${scoreText(guess.halfTime)} bij rust, ${scoreText(guess.fullTime)} eind`

/** A row of the list "Jouw voorspellingen". */
export function listItemOf(item: ScoredPrediction, now: Date): PredictionListItem {
  const { match } = item
  const clubs = clubsOf(match)
  const score = match.state === 'played' ? playedScore(match) : undefined
  // The list shows the day alone, also for a match that has not begun.
  const moment = matchMoment({ ...match, status: 'played' }, now)

  return {
    ...clubs,
    date: moment.time,
    dateTime: moment.dateTime,
    prediction: guessText(item),
    ...(match.state === 'played' ? { points: item.points.total } : { status: stateText[match.state] }),
    ...(score === undefined ? {} : { score: scoreText(score) }),
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
