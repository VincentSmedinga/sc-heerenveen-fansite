// Ties a goal of a played match to the player of ours who scored it, in the table `players`.
// The rules are in this file and nowhere else: the import of the matches asks `playerLinker`
// for each goal, and the log and `import:status` ask `isGoalOfOurPlayer` which goals should
// have a player. A goal that no rule can place is left without a player, never guessed.
import type { Player } from '@fansite/db/schema'

import type { ReadGoal } from './read-wikipedia.ts'

import { nameKey } from './read-squad.ts'

/** What the rules need to know of a goal. */
export type LinkableGoal = Pick<ReadGoal, 'ours' | 'ownGoal' | 'player' | 'playerPage'>

/** What the rules need to know of a player of the season, in the squad or not any more. */
export type LinkablePlayer = Pick<Player, 'id' | 'name' | 'wikipediaPage'>

/**
 * Whether the goal was scored by a player of ours: a goal of sc Heerenveen that is not an own
 * goal, or an own goal listed under the opponent, who profits from it. A goal of an opponent
 * and an own goal of an opponent are of players of other clubs, who are not in `players`.
 */
export function isGoalOfOurPlayer(goal: Pick<ReadGoal, 'ours' | 'ownGoal'>): boolean {
  return goal.ours !== goal.ownGoal
}

/**
 * Makes the function that finds the player of a goal of ours, from the players of one season:
 * everybody who has a row, also a player who left the squad, since a goal of his stays.
 * It tries, in this order:
 *
 * 1. the page the goal links to is the page of a player (`wikipedia_page`);
 * 2. the name in the goal is the full name of a player;
 * 3. the name in the goal, usually the surname, ends a name, and only one player has such a
 *    name: `Oyen` for `Luca Oyen`, and `Van Hecke` for `Jan Paul van Hecke`. Two players with
 *    the same surname are not told apart here, so a goal that has no link to either of them is
 *    left alone.
 *
 * Capitals and accents don't count. The function gives the `id` of the player, or null when no
 * rule finds one, and for a goal that is not of a player of ours.
 */
export function playerLinker(squad: LinkablePlayer[]): (goal: LinkableGoal) => null | number {
  const byPage = new Map<string, number>()
  const byName = new Map<string, number>()

  for (const player of squad) {
    byName.set(nameKey(player.name), player.id)

    if (player.wikipediaPage !== null) {
      byPage.set(nameKey(player.wikipediaPage), player.id)
    }
  }

  return (goal) => {
    if (!isGoalOfOurPlayer(goal)) {
      return null
    }

    const page = goal.playerPage === null ? undefined : byPage.get(nameKey(goal.playerPage))
    const name = nameKey(goal.player)

    if (page !== undefined) {
      return page
    }
    if (byName.has(name)) {
      return byName.get(name) ?? null
    }

    const ending = squad.filter((player) => nameKey(player.name).endsWith(` ${name}`))

    return ending.length === 1 ? (ending[0]?.id ?? null) : null
  }
}
