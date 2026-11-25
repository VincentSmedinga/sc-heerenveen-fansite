import type { Database } from '@fansite/db/client'

import { fantasyPicks, quizEntries, supporters } from '@fansite/db/schema'
import { and, eq } from 'drizzle-orm'

import { countsInPrognose } from './prediction-results'
import { mayTakePartCondition } from './take-part'

// How many fans took part in a game, for the cards on the page Fans (issue 1646). A blocked
// account does not count, and a closed account counts as a number without a name.

/** How many fans saved a four for the match. */
export async function countFours(db: Database, matchId: number) {
  const rows = await db
    .select({ disabledAt: supporters.disabledAt, known: supporters.id })
    .from(fantasyPicks)
    .leftJoin(supporters, eq(supporters.id, fantasyPicks.supporterId))
    .where(eq(fantasyPicks.matchId, matchId))

  return rows.filter((row) => countsInPrognose(row.known === null ? null : { disabledAt: row.disabledAt })).length
}

/** How many fans sent in the quiz. */
export async function countParticipants(db: Database, quizId: number) {
  const rows = await db
    .select({ id: quizEntries.id })
    .from(quizEntries)
    .leftJoin(supporters, eq(supporters.id, quizEntries.supporterId))
    // An entry without an account has no supporter row, so the condition holds for it.
    .where(and(eq(quizEntries.quizId, quizId), eq(quizEntries.blocked, false), mayTakePartCondition))

  return rows.length
}
