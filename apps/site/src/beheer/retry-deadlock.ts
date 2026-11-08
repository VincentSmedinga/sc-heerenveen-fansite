// MariaDB picks one transaction to stop with a deadlock (`ER_LOCK_DEADLOCK`, 1213) when several
// inserts on the same unique key meet, and says that the transaction can simply be tried again.
// The retry then meets the row of the winner and gets the usual answer, a duplicate key.

/** How many times a transaction runs in all, the first try included. */
export const deadlockTries = 5

/** Whether the error is the database ending a transaction because of a deadlock. */
export function isDeadlock(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const { cause, code, errno } = error as { cause?: unknown; code?: unknown; errno?: unknown }

  return code === 'ER_LOCK_DEADLOCK' || errno === 1213 || isDeadlock(cause)
}

/**
 * Runs `run` again when it fails on a deadlock, up to `deadlockTries` runs in all. Any other
 * error goes on at once, and so does the deadlock of the last run. `run` must be a whole
 * transaction, so a try that failed leaves nothing behind.
 */
export async function retryOnDeadlock<Result>(run: () => Promise<Result>): Promise<Result> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await run()
    } catch (error) {
      if (attempt >= deadlockTries || !isDeadlock(error)) {
        throw error
      }
    }
  }
}
