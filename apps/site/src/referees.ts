import type { PublicMatch } from '@fansite/db/queries'

import { type CompetitionChoice } from './competition'
import { resultOf } from './match-result'
import { playedMatchesOf } from './matches'

/** One referee of the card Scheidsrechters: our matches under him and how they ended. */
export type RefereeRow = { drawn: number; lost: number; name: string; played: number; won: number }

/** How many places the card shows for all seasons, with every name that shares the last one. */
export const topRefereeCount = 5

/** The last word of a name, by which referees with as many matches are ordered. */
const lastName = (name: string) => name.split(/\s+/u).at(-1) ?? name

/**
 * What the card Scheidsrechters counts (#1214): our played matches of one choice of competition
 * by the referee the database has for them, as it has the name (two spellings of one name are
 * two referees), the one with the most matches first and, with as many, by last name. `played`
 * is the number of played matches of the choice, `known` how many of them have a referee.
 * `referees` is the number of different names. With `top` only the first `top` places are in
 * `rows`, and a name that shares the last place with another stays in: five places can be six
 * names.
 */
export function refereesOf(
  matches: readonly PublicMatch[],
  choice: CompetitionChoice,
  { top }: { top?: number } = {},
): { known: number; played: number; referees: number; rows: RefereeRow[] } {
  const played = playedMatchesOf(matches, choice)
  const tallies = new Map<string, RefereeRow>()
  let known = 0

  for (const match of played) {
    const name = match.referee?.trim() ?? ''

    if (name === '') {
      continue
    }

    const row = tallies.get(name) ?? { drawn: 0, lost: 0, name, played: 0, won: 0 }
    const result = resultOf(match)

    row.played += 1
    row.won += result === 'win' ? 1 : 0
    row.drawn += result === 'draw' ? 1 : 0
    row.lost += result === 'loss' ? 1 : 0
    tallies.set(name, row)
    known += 1
  }

  const sorted = [...tallies.values()].sort(
    (a, b) =>
      b.played - a.played ||
      lastName(a.name).localeCompare(lastName(b.name), 'nl') ||
      a.name.localeCompare(b.name, 'nl'),
  )
  const edge = top === undefined ? undefined : sorted[top - 1]?.played

  return {
    known,
    played: played.length,
    referees: sorted.length,
    rows: edge === undefined ? sorted : sorted.filter(({ played: count }) => count >= edge),
  }
}
