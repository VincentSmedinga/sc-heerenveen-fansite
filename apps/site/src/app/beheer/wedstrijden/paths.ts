import { seasonSlug } from '#src/seasons'

export const matchesPath = '/beheer/wedstrijden'

/**
 * The address of the list of the matches of a season (none is the current one) with a filter
 * (`tonen`, none is the default one: the matches without a result).
 */
export function listPath(season?: string, show?: string) {
  const query = new URLSearchParams()

  if (season !== undefined) {
    query.set('seizoen', seasonSlug(season))
  }
  if (show !== undefined) {
    query.set('tonen', show)
  }

  return query.size === 0 ? matchesPath : `${matchesPath}?${query}`
}

/** The address of the form of a match, with what the last action left to say (`gedaan`). */
export function matchPath(id: number, done?: string) {
  return done === undefined ? `${matchesPath}/${id}` : `${matchesPath}/${id}?gedaan=${done}`
}
