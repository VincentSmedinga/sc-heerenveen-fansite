import type { PublicPlayerStats } from '@fansite/db/queries'

import { type CompetitionChoice, countsFor } from './competition'
import { keyOf, type ScoredMatch } from './matches'

/** The competitions of the squad table on Wikipedia, so the only ones with appearances. */
const statsCompetitions = ['Eredivisie', 'KNVB Beker'] as const

/**
 * The goals per match of each player on a card with goal scorers, or undefined when the card
 * may not show the column D/W (all or nothing: a list with gaps invites a comparison on unequal
 * figures, and a wrong number is worse than none). The key of a figure is the key of the
 * scorer (`keyOf`), the same as `TopScorer.id`.
 *
 * The card shows the column when three things hold:
 *
 * 1. Every match it counts is a match of the Eredivisie or the cup, the two competitions the
 *    squad table has figures for. With the choices `league` and `cup` that is always so; with
 *    `all` it is not in a season with a played match of the play-offs or of Europe, and with
 *    `europe` the card has no column at all.
 * 2. Every scorer has at least one appearance in the competitions the card counts. The goals
 *    of a person count for all the players (titles) the person has, as the card does.
 * 3. For every scorer, the goals in the squad table, in those competitions, are the goals of
 *    the card. The two sources can differ, and then neither is trusted.
 *
 * A scorer with a goal that is not linked to a player (no `playerId`) can't be looked up, so
 * the card has no column either. A card without scorers has none.
 *
 * The value is the goals of the card divided by the appearances (also as a substitute) in the
 * competitions the card counts: the Eredivisie for the choice `league`, the cup for `cup`, and
 * the Eredivisie and the cup for `all`.
 */
export function goalsPerMatchOf(
  matches: ScoredMatch[],
  choice: CompetitionChoice,
  stats: Pick<PublicPlayerStats, 'appearances' | 'competition' | 'goals' | 'playerId'>[],
): Map<string, number> | undefined {
  // The squad table has no figures for Europe, so the choice Europa has no column.
  if (choice === 'europe') {
    return undefined
  }

  const counted = statsCompetitions.filter((competition) => countsFor(competition, choice))
  const isCounted = (match: ScoredMatch) => countsFor(match.competition, choice)
  const played = (match: ScoredMatch) => match.status === 'played' || match.goals.length > 0

  if (matches.some((match) => isCounted(match) && played(match) && !isStatsCompetition(match.competition))) {
    return undefined
  }

  const scorers = new Map<string, { goals: number; playerIds: Set<number>; unlinked: boolean }>()

  for (const goal of matches.filter(isCounted).flatMap((match) => match.goals)) {
    if (!goal.ours || goal.ownGoal) {
      continue
    }

    const scorer = scorers.get(keyOf(goal)) ?? { goals: 0, playerIds: new Set<number>(), unlinked: false }

    scorer.goals += 1

    if (goal.playerId === null) {
      scorer.unlinked = true
    } else {
      scorer.playerIds.add(goal.playerId)
    }

    scorers.set(keyOf(goal), scorer)
  }

  if (scorers.size === 0) {
    return undefined
  }

  const perMatch = new Map<string, number>()

  for (const [key, scorer] of scorers) {
    if (scorer.unlinked) {
      return undefined
    }

    const rows = stats.filter(
      (row) => scorer.playerIds.has(row.playerId) && (counted as readonly string[]).includes(row.competition),
    )
    const appearances = rows.reduce((total, row) => total + row.appearances, 0)
    const goals = rows.reduce((total, row) => total + row.goals, 0)

    if (appearances < 1 || goals !== scorer.goals) {
      return undefined
    }

    perMatch.set(key, scorer.goals / appearances)
  }

  return perMatch
}

const isStatsCompetition = (competition: ScoredMatch['competition']) =>
  (statsCompetitions as readonly string[]).includes(competition)
