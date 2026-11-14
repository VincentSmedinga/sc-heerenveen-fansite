/** How a played match went for sc Heerenveen, whichever side it played on. */
export type Outcome = 'draw' | 'loss' | 'win'

/**
 * The outcome for sc Heerenveen from its own goals and the goals of the opponent. Match and
 * the other parts that colour a result use it, so they can't disagree.
 */
export const outcomeOf = (goalsFor: number, goalsAgainst: number): Outcome =>
  goalsFor > goalsAgainst ? 'win' : goalsFor < goalsAgainst ? 'loss' : 'draw'
