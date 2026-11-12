import { seasonSlug } from '#src/seasons'

export const playersPath = '/beheer/spelers'

/** The page that merges two persons. */
export const mergePagePath = `${playersPath}/samenvoegen`

/**
 * The address of the form that adds a player to a season, with the search for a person we
 * know (`q`) and the match the editor comes from and goes back to after the save
 * (`wedstrijd`).
 */
export function addPlayerPath(season: string, search?: string, matchId?: number, toGoals = false) {
  const query = new URLSearchParams({ seizoen: seasonSlug(season) })

  if (search !== undefined && search !== '') {
    query.set('q', search)
  }
  if (matchId !== undefined) {
    query.set('wedstrijd', String(matchId))
  }
  // From the part Doelpunten of a match (issue 1162), the way back goes to that part.
  if (matchId !== undefined && toGoals) {
    query.set('deel', 'doelpunten')
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

/**
 * The address of the page that merges two persons (issue 977): the person of the player the
 * editor came from (`personId`), the other person (`withId`), which of the two stays (`keptId`,
 * none for the default) and the player to go back to.
 */
export function mergePath({
  keptId,
  personId,
  playerId,
  withId,
}: {
  keptId?: number | undefined
  personId: number
  playerId?: number | undefined
  withId: number
}) {
  const query = new URLSearchParams({ met: String(withId), persoon: String(personId) })

  if (keptId !== undefined) {
    query.set('blijft', String(keptId))
  }
  if (playerId !== undefined) {
    query.set('speler', String(playerId))
  }

  return `${mergePagePath}?${query}`
}

/** The address of the form of a player, with what the last action left to say (`gedaan`). */
export function playerPath(id: number, done?: string) {
  return done === undefined ? `${playersPath}/${id}` : `${playersPath}/${id}?gedaan=${done}`
}
