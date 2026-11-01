export const matchesPath = '/beheer/wedstrijden'

/** The address of the form of a match, with what the last action left to say (`gedaan`). */
export function matchPath(id: number, done?: string) {
  return done === undefined ? `${matchesPath}/${id}` : `${matchesPath}/${id}?gedaan=${done}`
}
