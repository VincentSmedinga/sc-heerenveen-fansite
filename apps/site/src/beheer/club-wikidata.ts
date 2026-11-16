// The Wikidata number of a club in the admin (#1299): what an editor typed, checked. The number
// is the Q-number of the item, such as `Q1234`. An empty answer takes the number away.

/** The state a form of the number shows: an error, or what was saved (`''` for none). */
export type ClubWikidataState = { error?: string; saved?: string; value?: string }

/** The number, empty for none, or an error to show at the field. */
export function readWikidataNumber(text: string): { error: string } | { id: null | string } {
  const id = text.replaceAll(/\s+/gu, '').toUpperCase()

  if (id === '') {
    return { id: null }
  }

  return /^Q[1-9]\d{0,17}$/u.test(id)
    ? { id }
    : { error: 'Schrijf het nummer zoals Q1234: een Q en cijfers, zonder nul vooraan.' }
}
