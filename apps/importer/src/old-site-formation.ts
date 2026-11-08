import type { OldSiteLine } from './old-site-file.ts'

/** The lines of the field players in the order of a line-up, as a number for each. */
const rank = { aanvaller: 2, middenvelder: 1, verdediger: 0 } as const

/** The number of players a team starts with, the goalkeeper included. */
const startersOfATeam = 11

/**
 * The formation of our team (`4-4-2`), derived from the lines of the eleven starters in the
 * order of the line-up (#899), or null when the order and the lines do not agree. The line is
 * a trait of the player's whole career (`speler.linie`), not a position in this match, so we
 * only say a formation when:
 *
 * - there are exactly eleven starters, the first is a goalkeeper and no other one is;
 * - the lines of the other ten never go back (defender, midfielder, attacker);
 * - every player without a line stands between two players of the same line. At the start a
 *   defender counts as the left neighbour and at the end an attacker as the right one.
 *
 * The formation is the number of defenders, midfielders and attackers, without a line that is
 * empty (`4-6` for a team without an attacker). The order of the players never changes. Ten
 * players of one line are no formation: a pitch needs at least two rows.
 */
export function deriveOldSiteFormation(lines: readonly (null | OldSiteLine)[]): null | string {
  if (lines.length !== startersOfATeam || lines[0] !== 'doelman') {
    return null
  }

  const field = lines.slice(1)
  const ranks: (null | number)[] = []

  for (const line of field) {
    if (line === 'doelman') {
      return null
    }
    ranks.push(line === null ? null : rank[line])
  }

  // The known lines never go back.
  let previous = 0

  for (const one of ranks) {
    if (one === null) {
      continue
    }
    if (one < previous) {
      return null
    }
    previous = one
  }

  // A player without a line takes the line of both neighbours, who must be the same.
  const filled = ranks.map((one, index) => {
    if (one !== null) {
      return one
    }

    const before = ranks.slice(0, index).findLast((other) => other !== null) ?? rank.verdediger
    const after = ranks.slice(index + 1).find((other) => other !== null) ?? rank.aanvaller

    return before === after ? before : null
  })

  if (filled.includes(null)) {
    return null
  }

  const numbers = [0, 1, 2].map((one) => filled.filter((other) => other === one).length).filter((count) => count > 0)

  return numbers.length < 2 ? null : numbers.join('-')
}
