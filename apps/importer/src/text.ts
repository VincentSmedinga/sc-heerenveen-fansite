import { reasonMaxLength } from '@fansite/db/schema'

/** A moment as the import writes it, in UTC: `2026-10-22 14:07:01 UTC`. */
export function formatTime(time: Date): string {
  return `${time.toISOString().slice(0, 19).replace('T', ' ')} UTC`
}

/**
 * Text from outside that is safe to print on one line and fits a reason in the database: no control characters, and no
 * more than 300 characters.
 */
export function printable(text: string): string {
  const clean = text.replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, ' ').trim()

  return clean.length > reasonMaxLength ? `${clean.slice(0, reasonMaxLength - 1)}…` : clean
}
