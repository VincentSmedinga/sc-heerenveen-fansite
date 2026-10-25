/**
 * Wraps a function that loads data, so it runs at most once per period. Calls within the period
 * share the result, also while it is still loading. A load that fails isn't kept, so the next
 * call tries again.
 *
 * The result lives in the memory of the server process. The period starts when the load starts,
 * so a result is never older than the period.
 *
 * The load may return a thenable that does its work each time it is awaited, as a Drizzle query
 * does. So the cache keeps a promise that has taken over the result, and never the thenable
 * itself.
 */
export function cacheFor<T>(milliseconds: number, load: () => PromiseLike<T>) {
  const get = cacheForKey(milliseconds, () => load())

  return () => get('')
}

/**
 * Like `cacheFor`, for a load that depends on a key, such as a page number: each key has its
 * own result and its own period. The cache keeps an entry for every key it has been asked for,
 * so the caller must only ask for keys that it has checked: a visitor can make up any address,
 * and a key per address would fill the memory of the server.
 */
export function cacheForKey<T>(milliseconds: number, load: (key: string) => PromiseLike<T>) {
  const entries = new Map<string, { result: Promise<T>; since: number }>()

  return (key: string) => {
    const now = Date.now()
    let entry = entries.get(key)

    if (entry === undefined || now - entry.since >= milliseconds) {
      const current = { result: Promise.resolve(load(key)), since: now }

      entry = current
      entries.set(key, current)
      current.result.catch(() => {
        if (entries.get(key) === current) {
          entries.delete(key)
        }
      })
    }

    return entry.result
  }
}
