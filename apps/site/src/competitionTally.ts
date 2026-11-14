import { resultOf } from './match-result'
import { competitionGroups, type CompetitionValue } from './match-search'
import { type AllMatch, playedMatchesOf } from './matches'

/**
 * What sc Heerenveen did in one kind of competition (see `competitionGroups`), over all
 * seasons: the matches played, the results and the goals, ours first. `value` is the value of
 * the filter Competitie in the search of matches, so a row can link to the matches it counts.
 */
export type CompetitionTally = {
  drawn: number
  goalsAgainst: number
  goalsFor: number
  label: string
  lost: number
  played: number
  value: CompetitionValue
  won: number
}

/**
 * The tally of every kind of competition that has a played match with a score, in the order of
 * `competitionGroups`: the Eredivisie, the Eerste divisie, the KNVB Beker, Europa and the Johan
 * Cruijff Schaal. Europa is every European cup and the play-offs for them. A kind without such
 * a match is not in the list. A cup tie that a shoot-out decided is a win or a loss, as
 * everywhere (see `resultOf`), and the score is the one after extra time.
 */
export function competitionTalliesOf(matches: readonly AllMatch[]): CompetitionTally[] {
  const played = playedMatchesOf(matches, 'all')

  return competitionGroups.flatMap(({ label, members, value }) => {
    const own = played.filter((match) => (members as readonly string[]).includes(match.competition))

    if (own.length === 0) {
      return []
    }

    const results = own.map((match) => resultOf(match))

    return [
      {
        drawn: results.filter((result) => result === 'draw').length,
        goalsAgainst: own.reduce((sum, match) => sum + match.goalsAgainst, 0),
        goalsFor: own.reduce((sum, match) => sum + match.goalsFor, 0),
        label,
        lost: results.filter((result) => result === 'loss').length,
        played: own.length,
        value,
        won: results.filter((result) => result === 'win').length,
      },
    ]
  })
}
