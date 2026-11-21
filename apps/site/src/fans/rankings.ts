import type { Database } from '@fansite/db/client'

import { supporters } from '@fansite/db/schema'
import { and, eq } from 'drizzle-orm'

import { mayTakePartCondition } from './take-part'

// The choice "Naam in de standen" of a supporter (issue 1452). Off means: the supporter plays
// and counts in the figures of all supporters together, but has no row in a ranking. The
// rankings themselves come with the games; they take their rows with `inRankings`.

/**
 * The condition for the supporters who have a row in a ranking: the name is in the rankings,
 * and the editors didn't block the account. A query of a ranking joins `supporters` and adds
 * it to its `where`. The figures of all supporters together leave it out.
 */
export function inRankings() {
  return and(eq(supporters.inRankings, true), mayTakePartCondition)
}

/** Puts the name of a supporter in the rankings, or takes it out; at once, both ways. */
export async function setInRankings(db: Database, supporterId: number, on: boolean) {
  await db.update(supporters).set({ inRankings: on }).where(eq(supporters.id, supporterId))
  console.info(`Supporter ${supporterId} changed the choice for the rankings.`)
}
