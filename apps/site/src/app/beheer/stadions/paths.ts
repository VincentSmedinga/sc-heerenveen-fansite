/** The list of the stadiums. */
export const stadiumsPath = '/beheer/stadions'

/** The list of the clubs, each with the form of its stadiums. */
export const clubsPath = `${stadiumsPath}/clubs`

/** The address of the form of a club, with what the last action left to say (`gedaan`). */
export function clubPath(slug: string, done?: string) {
  return done === undefined ? `${stadiumsPath}/${slug}` : `${stadiumsPath}/${slug}?gedaan=${done}`
}

/** The address of the form of a stadium (or `nieuw`), with what the last action left to say. */
export function groundPath(id: 'nieuw' | number, done?: string) {
  const path = `${stadiumsPath}/stadion/${id}`

  return done === undefined ? path : `${path}?gedaan=${done}`
}

/**
 * The address of the list of the clubs with a filter (`tonen`, none is the default one: all
 * the clubs) and a search (`q`).
 */
export function listPath(show?: string, search?: string) {
  const query = new URLSearchParams()

  if (show !== undefined) {
    query.set('tonen', show)
  }
  if (search !== undefined && search !== '') {
    query.set('q', search)
  }

  return query.size === 0 ? clubsPath : `${clubsPath}?${query}`
}
