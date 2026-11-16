export const clubsPath = '/beheer/clubs'

/** The address of the form of a club, with what the last action left to say (`gedaan`). */
export function clubPath(slug: string, done?: string) {
  return done === undefined ? `${clubsPath}/${slug}` : `${clubsPath}/${slug}?gedaan=${done}`
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

/** The address of the page that merges two clubs (#1345). */
export const mergePagePath = `${clubsPath}/samenvoegen`

/**
 * The address of the page that merges two clubs: the club the editor came from (`club`), the
 * other club (`met`) and which of the two stays (`blijft`, none for the default).
 */
export function mergePath({ clubId, keptId, withId }: { clubId: number; keptId?: number | undefined; withId: number }) {
  const query = new URLSearchParams({ club: String(clubId), met: String(withId) })

  if (keptId !== undefined) {
    query.set('blijft', String(keptId))
  }

  return `${mergePagePath}?${query}`
}
