import type { Database } from '@fansite/db/client'

import { supporterBlockedAddresses } from '@fansite/db/schema'
import { eq, lt } from 'drizzle-orm'

import { hashOf } from '../login/tokens'

// The addresses of blocked accounts that were closed (issue 1458). Only the SHA-256 of the
// address and the moment are kept, so a blocked supporter can't sign up again with the same
// address. A row goes after 12 months, at the next sign-up, without a task of its own.

/** How many months a hash is kept. */
export const monthsKept = 12

/** The hash that is kept for a normalised address. */
export function blockedAddressHash(email: string) {
  return hashOf(email)
}

/**
 * Whether a normalised address belongs to a blocked account that was closed less than 12 months
 * ago. It removes the old hashes first, so an old block is gone from the first request after
 * its year.
 */
export async function isBlockedAddress(db: Database, email: string, now: Date): Promise<boolean> {
  await removeOldBlocks(db, now)

  const [row] = await db
    .select({ id: supporterBlockedAddresses.id })
    .from(supporterBlockedAddresses)
    .where(eq(supporterBlockedAddresses.addressHash, blockedAddressHash(email)))

  return row !== undefined
}

/** The moment before which a hash is too old to keep, for a check at `now`. */
export function oldestKept(now: Date) {
  const limit = new Date(now)

  limit.setUTCMonth(limit.getUTCMonth() - monthsKept)

  return limit
}

/** Removes the hashes older than 12 months. */
export async function removeOldBlocks(db: Pick<Database, 'delete'>, now: Date) {
  await db.delete(supporterBlockedAddresses).where(lt(supporterBlockedAddresses.blockedAt, oldestKept(now)))
}
