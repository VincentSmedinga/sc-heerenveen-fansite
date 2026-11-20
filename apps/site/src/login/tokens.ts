import { createHash, randomBytes, randomInt } from 'node:crypto'

// A token is 256 random bits, so a hash without salt is enough: there is nothing to guess.

/** What the database keeps of a login code: bound to the reference of its request. */
export function codeHashOf(ref: string, code: string) {
  return hashOf(`${ref}:${code}`)
}

/** What the database keeps of a token. */
export function hashOf(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

/** A new login code: 6 digits, with the zeros in front kept. */
export function newCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

/** A new random token, for a login link or a session. */
export function newToken() {
  return randomBytes(32).toString('base64url')
}
