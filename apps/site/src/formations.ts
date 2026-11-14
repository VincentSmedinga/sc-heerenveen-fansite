import type { PublicMatch } from '@fansite/db/queries'
import type { Competition } from '@fansite/db/schema'

import { type CompetitionChoice, countsFor } from './competition'
import { resultOf, type Scored } from './match-result'
import { playedMatchesOf } from './matches'

/** One formation of the card Formaties: the matches we played in it and how they ended. */
export type FormationRow = { drawn: number; formation: string; lost: number; played: number; won: number }

/** The formation of ours in a played match with a finished report (`listSeasonFormations`). */
export type MatchFormation = Scored & { competition: Competition; formation: string }

/**
 * What the card Formaties counts (#1216): our formations in the played matches of one choice of
 * competition, the one with the most matches first and then by name. `played` is the number of
 * played matches of the choice, `known` how many of them have a formation. A match without a
 * finished report or without a formation counts in `played` only, so the card can say it.
 * `formations` has the formation of each played match that has one (`listSeasonFormations`).
 */
export function formationsOf(
  matches: readonly PublicMatch[],
  formations: readonly MatchFormation[],
  choice: CompetitionChoice,
): { known: number; played: number; rows: FormationRow[] } {
  const played = playedMatchesOf(matches, choice)
  const tallies = new Map<string, FormationRow>()
  let known = 0

  for (const match of formations) {
    const formation = match.formation.trim()

    if (formation === '' || !countsFor(match.competition, choice)) {
      continue
    }

    const row = tallies.get(formation) ?? { drawn: 0, formation, lost: 0, played: 0, won: 0 }
    const result = resultOf(match)

    row.played += 1
    row.won += result === 'win' ? 1 : 0
    row.drawn += result === 'draw' ? 1 : 0
    row.lost += result === 'loss' ? 1 : 0
    tallies.set(formation, row)
    known += 1
  }

  return {
    known,
    played: played.length,
    rows: [...tallies.values()].sort((a, b) => b.played - a.played || a.formation.localeCompare(b.formation, 'nl')),
  }
}
