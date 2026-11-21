import type { Database } from '@fansite/db/client'

import { supporterEmailChanges, supporterLoginLinks, supporters, supporterSessions } from '@fansite/db/schema'
import { eq } from 'drizzle-orm'

import { hashOf } from '../login/tokens'

// Closing the account of a supporter (issue 1454). The one function that removes an account:
// the supporter closes it on Mijn account, and later the editors (#1458) and the clean-up of
// unused accounts (#1460) call it too.

/** The three pages of closing: the consequences, the confirmation, and after. */
export const closePaths = {
  closed: '/fans/mijn-account/opgeheven',
  confirm: '/fans/mijn-account/opheffen/zeker',
  form: '/fans/mijn-account/opheffen',
} as const

/** How long the page "Weet je het zeker?" may be open before its button no longer works. */
export const confirmationLifetime = 10 * 60 * 1000

/**
 * Removes the account of a supporter, in one transaction: the row with the screen name and the
 * address, every session, every link and code that is still open, and every request for a new
 * address. What the supporter filled in for the games stays, without a link to a person: the
 * tables of the games refer to the account with `ON DELETE SET NULL` (see my-data.ts). The
 * requests of the limits hold only a hash, and go after 15 minutes by themselves.
 *
 * It keeps nothing of the account. A caller that must keep something, such as the hash of the
 * address of a blocked account (#1458), does that before it calls this. It writes one line in
 * the log, without the number, the name or the address. It gives whether there was an account
 * to remove.
 */
export async function closeAccount(db: Database, supporterId: number): Promise<boolean> {
  const removed = await db.transaction(async (tx) => {
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

/**
 * The proof that the page "Weet je het zeker?" was opened in this session, at `issuedAt`: the
 * SHA-256 of the token of the session and the time. Only the server and the browser of the
 * session know the token, so another site can't make the proof, and an old page stops working
 * after `confirmationLifetime`.
 */
export function confirmationProof(sessionToken: string, issuedAt: number) {
  return hashOf(`close:${sessionToken}:${issuedAt}`)
}

/** Whether a proof from the page "Weet je het zeker?" is right and fresh. */
export function isFreshConfirmation(sessionToken: string, issuedAt: number, proof: string, now = Date.now()) {
  return (
    Number.isSafeInteger(issuedAt) &&
    issuedAt <= now &&
    now - issuedAt < confirmationLifetime &&
    proof === confirmationProof(sessionToken, issuedAt)
  )
}

/** The moment and the proof for the form of the page "Weet je het zeker?", made now. */
export function newConfirmation(sessionToken: string, now = Date.now()) {
  return { issuedAt: String(now), proof: confirmationProof(sessionToken, now) }
}
