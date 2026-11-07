import type { FormResult } from '@fansite/design-system'

/** How a played match went for sc Heerenveen, whichever side it played on. */
export type MatchResult = 'draw' | 'loss' | 'win'

/**
 * What the result of a match needs: our goals and the goals of the opponent, and the result of
 * the shoot-out when there was one. The shoot-out is `null` (or left out) for a match without.
 */
export type Scored = {
  goalsAgainst: number
  goalsFor: number
  penaltiesAgainst?: null | number | undefined
  penaltiesFor?: null | number | undefined
}

/**
 * How a played match went for sc Heerenveen. It is the one rule for winning, drawing and
 * losing: every place that counts wins, draws and losses (the letters W, G and V, the streaks,
 * the records, the results per head coach) asks it, so they can't disagree. A shoot-out decides
 * the match when there was one, because a cup tie knows no draw. Otherwise the goals decide.
 * The goals and the goal difference keep counting the score after extra time, shoot-out left
 * out, so a match won on penalties is a win with level goals.
 */
export function resultOf({ goalsAgainst, goalsFor, penaltiesAgainst, penaltiesFor }: Scored): MatchResult {
  const [ours, theirs] =
    penaltiesFor !== null && penaltiesFor !== undefined && penaltiesAgainst !== null && penaltiesAgainst !== undefined
      ? [penaltiesFor, penaltiesAgainst]
      : [goalsFor, goalsAgainst]

  return ours > theirs ? 'win' : ours < theirs ? 'loss' : 'draw'
}

const letters = { draw: 'G', loss: 'V', win: 'W' } as const satisfies Record<MatchResult, FormResult>

/** The letter of the form for a match: `W` won, `G` drawn and `V` lost. */
export const letterOf = (match: Scored): FormResult => letters[resultOf(match)]

/**
 * The shoot-out of a match as the props of `ShortMatch`: both scores when it had one, and
 * nothing when it had none, so a list passes it on with a spread.
 */
export const shootOutOf = ({
  penaltiesAgainst,
  penaltiesFor,
}: Pick<Scored, 'penaltiesAgainst' | 'penaltiesFor'>): object | { penaltiesAgainst: number; penaltiesFor: number } =>
  penaltiesFor !== null && penaltiesFor !== undefined && penaltiesAgainst !== null && penaltiesAgainst !== undefined
    ? { penaltiesAgainst, penaltiesFor }
    : {}
