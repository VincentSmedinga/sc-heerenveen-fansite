/**
 * A limit on how often something may happen, for everyone together, in the memory of this
 * server. It remembers the times, and nothing about who did it, so no IP addresses are kept. It
 * starts again from zero when the server restarts, and a server per process counts for itself;
 * that is fine for a simple guard against a flood.
 */
export function createLimit({ max, perMilliseconds }: { max: number; perMilliseconds: number }) {
  let times: number[] = []

  return {
    /**
     * Counts one more, and returns whether it fits in the limit. When it doesn't, nothing is
     * counted.
     */
    take(now = Date.now()) {
      times = times.filter((time) => now - time < perMilliseconds)

      if (times.length >= max) {
        return false
      }

      times.push(now)

      return true
    },
  }
}
