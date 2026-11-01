import type { Database } from './client.ts'
import type { AuditAction } from './schema.ts'

import { auditDetailMaxLength, auditLog } from './schema.ts'

/**
 * What a row of the log says: who did what to which item, article or match, and why. Nothing
 * else of the request goes in.
 */
export type AuditEntry = {
  action: AuditAction
  /** What changed, for an action that changes values: the part and its values. */
  detail?: string
  itemId: number
  /** Why, for an action that has a reason, such as hiding an item. */
  reason?: string
  /**
   * The account that did it: its id, not its address. `null` is the importer, which has no
   * account: the log then says "de import".
   */
  userId: null | number
}

/**
 * The one function that writes to the log of the admin, and the only code that touches the
 * table `audit_log`: every action of the admin calls it, in the same transaction as the change
 * itself, so there is no change without a row and no row without a change. The importer calls
 * it too, for what it does to a match an editor filled in. It only adds. Nothing in the site or
 * the importer changes or removes a row, and a test of the site keeps it that way.
 *
 * It copies the five fields it knows and nothing else, so a request body or a token can't end
 * up in the log by accident. A `detail` that is too long is cut off with an ellipsis.
 */
export async function recordAction(
  db: Pick<Database, 'insert'>,
  { action, detail, itemId, reason, userId }: AuditEntry,
  now = new Date(),
) {
  await db.insert(auditLog).values({
    action,
    createdAt: now,
    detail: detail === undefined ? null : shorten(detail),
    itemId,
    reason: reason ?? null,
    userId,
  })
}

/** The text, or its start and an ellipsis when it does not fit in a `detail`. */
function shorten(text: string): string {
  return text.length <= auditDetailMaxLength ? text : `${text.slice(0, auditDetailMaxLength - 1)}…`
}
