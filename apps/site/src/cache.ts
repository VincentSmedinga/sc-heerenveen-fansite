/**
 * Wraps a function that loads data, so it runs at most once per period. Calls within the period share the result,
 * also while it is still loading. A load that fails isn't kept, so the next call tries again.
 *
 * The result lives in the memory of the server process. The period starts when the load starts, so a result is never
 * older than the period.
 */
export function cacheFor<T>(milliseconds: number, load: () => Promise<T>) {
  let entry: undefined | { result: Promise<T>; since: number }

  return () => {
    const now = Date.now()

    if (entry === undefined || now - entry.since >= milliseconds) {
      const current = { result: load(), since: now }

      entry = current
      current.result.catch(() => {
        if (entry === current) {
          entry = undefined
        }
      })
    }

    return entry.result
  }
}
