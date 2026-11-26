// Ties a goal of a played match to the player of ours who scored it, in the table `players`.
// The rules are in this file and nowhere else: the import of the matches asks `playerLinker`
// for each goal, and the log and `import:status` ask `isGoalOfOurPlayer` which goals should
// have a player. A goal that no rule can place is left without a player, never guessed.
import type { Player } from '@fansite/db/schema'

import { rowsByName } from '@fansite/db/shown-name'

import type { ReadGoal } from './read-wikipedia.ts'

import { nameKey } from './read-squad.ts'

/** What the rules need to know of a goal. */
export type LinkableGoal = Pick<ReadGoal, 'ours' | 'ownGoal' | 'player' | 'playerPage'> & {
  /** The person of the page the goal links to, or null or left out when there is none. */
  personId?: null | number
}

/** What the rules need to know of a player of the season, in the squad or not any more. */
export type LinkablePlayer = Pick<Player, 'id' | 'sourceName' | 'wikipediaPage'> & {
  /** The name of his person, when it may differ from the name of the source (`shownName`). */
  name?: string

  /** The person of the player, or null or left out when the player has none yet. */
  personId?: null | number
}

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
 * 1. the person of the page the goal links to is the person of a player (`person_id`), which
 *    finds a goal under a redirect of the page of the player. Two players of one person are
 *    not told apart, so this rule skips them;
 * 2. the page the goal links to is the page of a player (`wikipedia_page`);
 * 3. the name in the goal is the full name of a player, as a source wrote it or as his person
 *    has it;
 * 4. the name in the goal, usually the surname, ends a name, and only one player has such a
 *    name: `Oyen` for `Luca Oyen`, and `Van Hecke` for `Jan Paul van Hecke`. Two players with
 *    the same surname are not told apart here, so a goal that has no link to either of them is
 *    left alone.
 *
 * Capitals and accents don't count. The function gives the `id` of the player, or null when no
 * rule finds one, and for a goal that is not of a player of ours.
 */
export function playerLinker(squad: LinkablePlayer[]): (goal: LinkableGoal) => null | number {
  const byPage = new Map<string, number>()
  const byName = rowsByName(
    squad.map((player) => ({ ...player, name: player.name ?? player.sourceName })),
    nameKey,
  )
  const byPerson = new Map<number, number>()
  const sharedPersons = new Set<number>()

  for (const player of squad) {
    if (player.personId !== null && player.personId !== undefined) {
      if (byPerson.has(player.personId)) {
        sharedPersons.add(player.personId)
      }

      byPerson.set(player.personId, player.id)
    }

    if (player.wikipediaPage !== null) {
      byPage.set(nameKey(player.wikipediaPage), player.id)
    }
  }

  // A goal is placed by the name of the source of a row and by the name of its person.
  const namesOf = (player: LinkablePlayer) => [
    ...new Set([player.name ?? player.sourceName, player.sourceName].map(nameKey)),
  ]

  return (goal) => {
    if (!isGoalOfOurPlayer(goal)) {
      return null
    }

    const person =
      goal.personId === null || goal.personId === undefined || sharedPersons.has(goal.personId)
        ? undefined
        : byPerson.get(goal.personId)
    const page = goal.playerPage === null ? undefined : byPage.get(nameKey(goal.playerPage))
    const name = nameKey(goal.player)

    if (person !== undefined) {
      return person
    }
    if (page !== undefined) {
      return page
    }
    const full = byName.get(name)

    if (full !== undefined) {
      return full.id
    }

    const ending = squad.filter((player) => namesOf(player).some((full) => full.endsWith(` ${name}`)))

    return ending.length === 1 ? (ending[0]?.id ?? null) : null
  }
}
