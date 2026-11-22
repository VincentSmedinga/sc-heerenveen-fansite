import { eq } from 'drizzle-orm'
import { createHash } from 'node:crypto'

import type { Database } from './client.ts'

import {
  playerRatings,
  supporterBlockedAddresses,
  supporterEmailChanges,
  supporterLoginLinks,
  supporters,
  supporterSessions,
} from './schema.ts'

/** The hash that is kept for a normalised address of a blocked account (issue 1458). */
export function blockedAddressHash(email: string) {
  return createHash('sha256').update(email).digest('hex')
}

/**
 * Removes the account of a supporter, in one transaction: the row with the screen name and the
 * address, every session, every link and code that is still open, and every request for a new
 * address. What the supporter filled in for the games stays, without a link to a person: the
 * tables of the games refer to the account with `ON DELETE SET NULL` (see my-data.ts). The
 * requests of the limits hold only a hash, and go after 15 minutes by themselves.
 *
 * It keeps nothing of the account, with one exception (issue 1458): of a blocked account it
 * keeps the SHA-256 of the address and the moment, in the same transaction, so the supporter
 * can't sign up again with it for 12 months, and it marks the grades of the account as
 * blocked, without a person, so they keep not counting (issue 1476). A caller doesn't have to
 * do anything for that. It writes one line in the log, without the number, the name or the
 * address. It gives whether there was an account to remove.
 */
export async function closeAccount(db: Database, supporterId: number, now = new Date()): Promise<boolean> {
  const removed = await db.transaction(async (tx) => {
    const [account] = await tx
      .select({ disabledAt: supporters.disabledAt, email: supporters.email })
      .from(supporters)
      .where(eq(supporters.id, supporterId))
      .for('update')

    if (account !== undefined && account.disabledAt !== null) {
      await tx
        .insert(supporterBlockedAddresses)
        .values({ addressHash: blockedAddressHash(account.email), blockedAt: now })
        .onDuplicateKeyUpdate({ set: { blockedAt: now } })
      // The grades stay without a person, and keep not counting (issue 1476).
      await tx.update(playerRatings).set({ blocked: true }).where(eq(playerRatings.supporterId, supporterId))
    }

    await tx.delete(supporterEmailChanges).where(eq(supporterEmailChanges.supporterId, supporterId))
    await tx.delete(supporterLoginLinks).where(eq(supporterLoginLinks.userId, supporterId))
    await tx.delete(supporterSessions).where(eq(supporterSessions.userId, supporterId))

    const [deleted] = await tx.delete(supporters).where(eq(supporters.id, supporterId))

    return deleted.affectedRows === 1
  })

  if (removed) {
    console.info('A supporter account was closed.')
  }

  return removed
}
