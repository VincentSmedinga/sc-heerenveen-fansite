import type { Database } from '@fansite/db/client'

import { matches } from '@fansite/db/schema'
import { and, eq } from 'drizzle-orm'

import { parseItemId } from './items'

// The way back from the form that adds a player (issue 1021). An editor who misses a player in
// the form of a match goes to that form with the number of the match in the address, and comes
// back to the match after the save. The number is input from outside: only a match that exists
// and is of the season the player is added to counts, so the address never leads elsewhere.

/** The match an editor comes from, with its clubs in the order of the match. */
export type ReturnMatch = { clubs: string; id: number }

/**
 * The match to go back to after a player is added to `season`, from the number in the address
 * or bound to the action. Nothing for a number that is no number, a match that does not exist
 * and a match of another season.
 */
export async function findReturnMatch(
  db: Pick<Database, 'select'>,
  value: unknown,
  season: string,
): Promise<ReturnMatch | undefined> {
  const id = parseItemId(value)

  if (id === undefined) {
    return undefined
  }

  const [match] = await db
    .select({ home: matches.home, id: matches.id, opponent: matches.opponent })
    .from(matches)
    .where(and(eq(matches.id, id), eq(matches.season, season)))

  return match === undefined
    ? undefined
    : {
        clubs: match.home ? `sc Heerenveen - ${match.opponent}` : `${match.opponent} - sc Heerenveen`,
        id: match.id,
      }
}
