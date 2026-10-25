import type { Database } from '@fansite/db/client'
import type { AuditAction } from '@fansite/db/schema'

import { auditLog } from '@fansite/db/schema'

/** What a row of the log says: who did what to which item, and why. Nothing else of the request goes in. */
export type AuditEntry = {
  action: AuditAction
  itemId: number
  /** Why, for an action that has a reason, such as hiding an item. */
  reason?: string
  /** The account that did it: its id, not its address. */
  userId: number
}

/**
 * The one function that writes to the log of the admin, and the only code that touches the table `audit_log`: every
 * action of the admin calls it, in the same transaction as the change itself, so there is no change without a row and no row
 * without a change. It only adds. Nothing in the site changes or removes a row, and `audit-log.test.ts` keeps it that way.
 *
 * It copies the four fields it knows and nothing else, so a request body or a token can't end up in the log by accident.
 */
export async function recordAction(
  db: Pick<Database, 'insert'>,
  { action, itemId, reason, userId }: AuditEntry,
  now = new Date(),
) {
  await db.insert(auditLog).values({ action, createdAt: now, itemId, reason: reason ?? null, userId })
}
