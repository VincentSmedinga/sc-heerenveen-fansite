import { reasonMaxLength } from '@fansite/db/schema'

/**
 * A short text for a failure. A database error carries the whole query with its values, which
 * don't belong in a log.
 */
export function describeError(error: unknown): string {
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error

  if (cause instanceof Error && 'code' in cause && typeof cause.code === 'string') {
    return `database error ${cause.code}`
  }

  return cause instanceof Error ? cause.message : String(cause)
}

/** A moment as the import writes it, in UTC: `2026-10-22 14:07:01 UTC`. */
export function formatTime(time: Date): string {
  return `${time.toISOString().slice(0, 19).replace('T', ' ')} UTC`
}

/**
 * Text from outside that is safe to print on one line and fits a reason in the database: no
 * control characters, and no more than 300 characters.
 */
export function printable(text: string): string {
  const clean = text.replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, ' ').trim()

  return clean.length > reasonMaxLength ? `${clean.slice(0, reasonMaxLength - 1)}…` : clean
}
