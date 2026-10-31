/** How a played match went for sc Heerenveen, whichever side it played on. */
export type Outcome = 'draw' | 'loss' | 'win'

/**
 * The outcome for sc Heerenveen from its own goals and the goals of the opponent. Match and
 * ShortMatch both colour their result with it, so the two can't disagree.
 */
export const outcomeOf = (goalsFor: number, goalsAgainst: number): Outcome =>
  goalsFor > goalsAgainst ? 'win' : goalsFor < goalsAgainst ? 'loss' : 'draw'
