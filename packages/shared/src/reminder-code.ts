import { createHmac, timingSafeEqual } from 'node:crypto'

// The code in the link to turn the reminder off (issue 1461): the number of the supporter, the
// moment it stops working and a signature with the secret of the server. Anybody can read the
// number, but nobody can make a code for another supporter without the secret. The link opens
// a page with a button, so a mail scanner that follows the link changes nothing.

/** How long the link in a mail works: 60 days. */
export const reminderCodeLifetime = 60 * 24 * 60 * 60 * 1000

const signatureOf = (supporterId: number, expiresAt: number, secret: string) =>
  createHmac('sha256', secret).update(`reminder:${supporterId}:${expiresAt}`).digest('base64url')

/** The code for the link in a mail sent at `now`. */
export function makeReminderCode(supporterId: number, secret: string, now = new Date()): string {
  const expiresAt = now.getTime() + reminderCodeLifetime

  return `${supporterId}.${expiresAt}.${signatureOf(supporterId, expiresAt, secret)}`
}

/** The number of the supporter in a code that is signed with the secret and has not expired. */
export function readReminderCode(code: string, secret: string, now = new Date()): number | undefined {
  const [id, expiry, signature, ...rest] = code.split('.')
  const supporterId = Number(id)
  const expiresAt = Number(expiry)

  if (
    rest.length > 0 ||
    signature === undefined ||
    !/^[1-9][0-9]*$/.test(id ?? '') ||
    !/^[0-9]{1,15}$/.test(expiry ?? '') ||
    !Number.isSafeInteger(supporterId)
  ) {
    return undefined
  }

  const expected = Buffer.from(signatureOf(supporterId, expiresAt, secret))
  const given = Buffer.from(signature)

  if (given.length !== expected.length || !timingSafeEqual(given, expected) || expiresAt <= now.getTime()) {
    return undefined
  }

  return supporterId
}
