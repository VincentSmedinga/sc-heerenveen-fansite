import { seasonSlug } from '#src/seasons'

export const playersPath = '/beheer/spelers'

/**
 * The address of the form that adds a player to a season, with the search for a person we
 * know (`q`).
 */
export function addPlayerPath(season: string, search?: string) {
  const query = new URLSearchParams({ seizoen: seasonSlug(season) })

  if (search !== undefined && search !== '') {
    query.set('q', search)
  }

  return `${playersPath}/nieuw?${query}`
}

/**
 * The address of the list of the players of a season (none is the current one), with what the
 * last action left to say (`gedaan`).
 */
export function listPath(season?: string, done?: string) {
  const query = new URLSearchParams()

  if (season !== undefined) {
    query.set('seizoen', seasonSlug(season))
  }
  if (done !== undefined) {
    query.set('gedaan', done)
  }

  return query.size === 0 ? playersPath : `${playersPath}?${query}`
}

/** The address of the form of a player, with what the last action left to say (`gedaan`). */
export function playerPath(id: number, done?: string) {
  return done === undefined ? `${playersPath}/${id}` : `${playersPath}/${id}?gedaan=${done}`
}
