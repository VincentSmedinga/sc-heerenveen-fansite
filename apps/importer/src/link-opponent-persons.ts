// Gives the players of the opponent in the match reports their person (#1544), in the style
// of `link-players.ts`: the rules are `linkOpponentPersons` in `@fansite/db/opponent-persons`,
// and this file is the step of the hourly import and the lines for its log. The step runs
// after the steps that make persons, and a second run finds nothing left to link.
import type { Database } from '@fansite/db/client'
import type { OpponentPersonCounts } from '@fansite/db/opponent-persons'

import { linkOpponentPersons } from '@fansite/db/opponent-persons'

/**
 * The line for the log: how many rows got a person through a goal, through the name and through
 * the squad of the club, and how many stayed empty because the name fits nobody or more than
 * one person. It says nothing when there was no row without a person to look at.
 */
export function describeOpponentPersons(counts: OpponentPersonCounts): string[] {
  const { excepted, goal, name, nobody, several, squad } = counts

  if (goal + name + nobody + several + excepted + squad === 0) {
    return []
  }

  return [
    `Opponents' players: ${goal} got a person through a goal, ${name} through the name, ` +
      `${squad === 0 ? '' : `${squad} through the squad of the club, `}` +
      `${nobody} left without (the name fits nobody), ${several} left without (the name fits more than one person)` +
      `${excepted === 0 ? '' : `, ${excepted} left without (on the list of namesakes)`}.`,
  ]
}

/**
 * Runs the step on an open database, for the regular import, which holds the lock. A failure
 * is a warning and no failed import.
 */
export async function importOpponentPersons(db: Database): Promise<string[]> {
  try {
    return describeOpponentPersons(await linkOpponentPersons(db))
  } catch (error) {
    return [`Opponents' players: warning, no persons linked: ${error instanceof Error ? error.message : String(error)}`]
  }
}
