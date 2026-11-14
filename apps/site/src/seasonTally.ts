import type { CompetitionChoice } from './competition'

import { resultOf } from './match-result'
import { type AllMatch, playedMatchesOf } from './matches'

/** What sc Heerenveen did in one season: the results and the goals, ours first. */
export type SeasonTally = {
  drawn: number
  goalsAgainst: number
  goalsFor: number
  lost: number
  won: number
}

/**
 * The results and goals of every season that has a played match with a score, for the
 * competitions the choice counts (see `playedMatchesOf`). A cup tie that a shoot-out decided is
 * a win or a loss, as everywhere (see `resultOf`). A season without such a match is not in the
 * map, so the card can say "geen wedstrijden" for it instead of a row of zeros.
 */
export function seasonTalliesOf(matches: readonly AllMatch[], choice: CompetitionChoice): Map<string, SeasonTally> {
  const tallies = new Map<string, SeasonTally>()

  for (const match of playedMatchesOf(matches, choice)) {
    const { season } = match
    const tally = tallies.get(season) ?? { drawn: 0, goalsAgainst: 0, goalsFor: 0, lost: 0, won: 0 }
    const result = resultOf(match)

    tally.won += result === 'win' ? 1 : 0
    tally.drawn += result === 'draw' ? 1 : 0
    tally.lost += result === 'loss' ? 1 : 0
    tally.goalsFor += match.goalsFor
    tally.goalsAgainst += match.goalsAgainst
    tallies.set(season, tally)
  }

  return tallies
}
