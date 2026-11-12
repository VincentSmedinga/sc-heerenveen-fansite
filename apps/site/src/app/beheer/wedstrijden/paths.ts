import { seasonSlug } from '#src/seasons'

export const matchesPath = '/beheer/wedstrijden'

/** The address of the form that adds a match no import reads. */
export const addPath = `${matchesPath}/nieuw`

/**
 * Where "Annuleren" goes back to: the address in `terug` when it is a page of the admin, and
 * otherwise the list of the matches. Anything else, such as another site, is ignored.
 */
export function backPathOf(back: unknown): string | undefined {
  return typeof back === 'string' && /^\/beheer(?:[/?#]|$)/u.test(back) && !back.includes('\\') ? back : undefined
}

/** The address of the screen that ends a match that is still being played. */
export function finishPath(id: number) {
  return `${matchesPath}/${id}/verslag/afgelopen`
}

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

/** The address of the quick screen that keeps a report up to date during the match. */
export function livePath(id: number) {
  return `${matchesPath}/${id}/verslag/live`
}

/**
 * The address of a part of the form of a match (issue 1162), with what the last action left to
 * say and where the editor came from (`terug`): `/beheer/wedstrijden/412/doelpunten`.
 */
export function matchPartPath(
  id: number,
  part: string,
  query: { back?: string | undefined; done?: string | undefined } = {},
) {
  const search = new URLSearchParams()

  if (query.done !== undefined) {
    search.set('gedaan', query.done)
  }
  if (query.back !== undefined) {
    search.set('terug', query.back)
  }

  return search.size === 0 ? `${matchesPath}/${id}/${part}` : `${matchesPath}/${id}/${part}?${search}`
}

/** The address of the form of a match, with what the last action left to say (`gedaan`). */
export function matchPath(id: number, done?: string) {
  return done === undefined ? `${matchesPath}/${id}` : `${matchesPath}/${id}?gedaan=${done}`
}

/** The address of the screen that reads a pasted text into the report of a match. */
export function pastePath(id: number) {
  return `${matchesPath}/${id}/verslag/plakken`
}

/** The address of the report screen of a match, with what the last action left to say. */
export function reportPath(id: number, done?: string) {
  return done === undefined ? `${matchesPath}/${id}/verslag` : `${matchesPath}/${id}/verslag?gedaan=${done}`
}
