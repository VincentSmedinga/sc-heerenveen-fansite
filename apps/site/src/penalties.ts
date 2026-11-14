import type { PublicMatch } from '@fansite/db/queries'

import { type CompetitionChoice } from './competition'
import { playedMatchesOf } from './matches'

/**
 * What the card Strafschoppen counts (#1215): the penalties that were scored in the played
 * matches of one choice of competition whose goals we know, the ones for sc Heerenveen and the
 * ones against. It counts as the card Bijzondere doelpunten and the list Strafschoppen benut
 * do: a goal that came from a penalty (`penalty`), by the side `ours` says. A penalty shoot-out
 * is not in the goals, so it is not counted, and a missed penalty is not stored (#408).
 * `played` is the number of played matches of the choice, `known` how many of them have their
 * goals: a match with a score and no goals has no penalties we can count.
 */
export function matchPenaltiesOf(matches: readonly PublicMatch[], choice: CompetitionChoice) {
  const played = playedMatchesOf(matches, choice)
  const known = played.filter((match) => match.goals.length > 0 || match.goalsFor + match.goalsAgainst === 0)
  const goals = known.flatMap((match) => match.goals).filter((goal) => goal.penalty)

  return {
    against: goals.filter((goal) => !goal.ours).length,
    for: goals.filter((goal) => goal.ours).length,
    known: known.length,
    played: played.length,
  }
}
