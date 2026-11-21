import { hashOf } from '../login/tokens'

// Closing the account of a supporter (issue 1454). The one function that removes an account
// lives in `@fansite/db/close-account`, so the importer can call it too: the supporter closes
// the account on Mijn account, and the clean-up of unused accounts (#1460) closes it after a
// mail.
export { closeAccount } from '@fansite/db/close-account'

/** The three pages of closing: the consequences, the confirmation, and after. */
export const closePaths = {
  closed: '/fans/mijn-account/opgeheven',
  confirm: '/fans/mijn-account/opheffen/zeker',
  form: '/fans/mijn-account/opheffen',
} as const

/** How long the page "Weet je het zeker?" may be open before its button no longer works. */
export const confirmationLifetime = 10 * 60 * 1000

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
