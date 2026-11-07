/** How a kick of a penalty shoot-out ended: in the goal, past it or stopped by the keeper. */
export const matchPenaltyResults = ['scored', 'missed', 'saved'] as const

/** One round of the series: the kick of each team, or none when a team did not take one. */
export type CountedRound = { ours?: CountedKick; theirs?: CountedKick }

export type MatchPenaltyResult = (typeof matchPenaltyResults)[number]

/** A round with the score after it, sc Heerenveen first. */
export type PenaltySeriesRound<Round extends CountedRound> = {
  /** The place in the series, from 1. */
  number: number
  round: Round
  /** The score of the series after this round: our goals, then the goals of the opponent. */
  standing: readonly [number, number]
}

/** What the figures of a series need of a kick. */
type CountedKick = undefined | { result: MatchPenaltyResult }

/**
 * The figures of a shoot-out: the score after every round and the totals. A kick counts only
 * when it scored, and a round in which a team did not kick gives that team nothing, so a
 * series that ended early still adds up.
 */
export function penaltySeriesFigures<Round extends CountedRound>(rounds: readonly Round[]) {
  let ours = 0
  let theirs = 0

  const withStanding = rounds.map((round, index): PenaltySeriesRound<Round> => {
    ours += round.ours?.result === 'scored' ? 1 : 0
    theirs += round.theirs?.result === 'scored' ? 1 : 0

    return { number: index + 1, round, standing: [ours, theirs] }
  })

  return { ours, rounds: withStanding, theirs }
}
