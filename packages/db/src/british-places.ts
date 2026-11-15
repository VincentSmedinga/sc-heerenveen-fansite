/** The Q-numbers an item of Wikidata is in, by Q-number of the item (`wikidata_places`). */
export type PlaceParents = ReadonlyMap<string, readonly string[]>

/** How far the importer follows the places from a club to a country (#1278). */
export const mostPlaceSteps = 6

/**
 * Where a club of the United Kingdom lies: `found` with the Q-number of its country, `none`
 * when no chain of at most `mostPlaceSteps` steps ends in one of `countryIds` or the chains end
 * in several, and `missing` with the items that `places` does not know yet, which the importer
 * asks about before it tries again.
 */
export type PlaceResolution =
  { countryId: string; kind: 'found' } | { ids: string[]; kind: 'missing' } | { kind: 'none' }

/**
 * Follows the places of an item (`P159` and `P131`) from `start`, a step at a time, until a
 * step reaches one of `countryIds`. The countries at the first step that reaches any are the
 * answer, and when there is more than one the answer is `none`: we cannot tell which country
 * it is. It asks nothing: an item that `places` does not have is `missing`.
 */
export function resolveBritishCountry(
  start: string,
  places: PlaceParents,
  countryIds: ReadonlySet<string>,
): PlaceResolution {
  const seen = new Set<string>([start])
  let level = [start]

  for (let step = 1; step <= mostPlaceSteps && level.length > 0; step++) {
    const missing = level.filter((id) => !places.has(id))

    if (missing.length > 0) {
      return { ids: missing, kind: 'missing' }
    }

    const reached = new Set<string>()
    const next: string[] = []

    for (const id of level) {
      for (const parent of places.get(id) ?? []) {
        if (countryIds.has(parent)) {
          reached.add(parent)
        } else if (!seen.has(parent)) {
          seen.add(parent)
          next.push(parent)
        }
      }
    }

    if (reached.size > 0) {
      const [only] = [...reached]

      return reached.size === 1 && only !== undefined ? { countryId: only, kind: 'found' } : { kind: 'none' }
    }

    level = next
  }

  return { kind: 'none' }
}
