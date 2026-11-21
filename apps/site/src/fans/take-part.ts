import type { Database } from '@fansite/db/client'

import { supporters } from '@fansite/db/schema'
import { eq, isNull } from 'drizzle-orm'

// The one place that says whether a supporter may take part in a game (issue 1458). The games
// use it, in code or as a condition of a query, so no game decides for itself what a blocked
// account may do. A blocked account can log in, see its data and close its account; it can't
// take part, can't change its name and has no row in a ranking.

/** The condition for a query: only accounts that may take part. */
export const mayTakePartCondition = isNull(supporters.disabledAt)

/** Whether the supporter with this number may take part in a game. A gone account may not. */
export async function maySupporterTakePart(db: Database, supporterId: number): Promise<boolean> {
  const [account] = await db
    .select({ disabledAt: supporters.disabledAt })
    .from(supporters)
    .where(eq(supporters.id, supporterId))

  return mayTakePart(account)
}

/** Whether an account, as it is stored, may take part: it is there and not blocked. */
export function mayTakePart(account: undefined | { disabledAt: Date | null }): boolean {
  return account !== undefined && account.disabledAt === null
}
