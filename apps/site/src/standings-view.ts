/**
 * The choice of the card Stand on the matches page between the table of the whole season and
 * the table over the latest five matches, and the address that holds it. It is apart from
 * `matches.ts`, so the code that only handles an address needs no database.
 */

/** Which table the card shows: the whole season (the default) or the latest five matches. */
export type StandingsView = 'last-five' | 'season'

/** The name of the query parameter that holds the choice, and the one value it can have. */
export const standingsViewParam = 'stand'
export const lastFiveValue = 'laatste-5'

/**
 * The choice an address asks for with `?stand=`: `laatste-5` is `last-five`, and anything else
 * is the whole season, also a value that is not known or one given twice. The page never shows
 * "niet gevonden" for it, because a link to another season or page has no choice to keep.
 */
export const parseStandingsView = (value: string | string[] | undefined): StandingsView =>
  value === lastFiveValue ? 'last-five' : 'season'

/** The part of the address that holds the choice: nothing for the whole season, the default. */
export const standingsViewQuery = (view: StandingsView) =>
  view === 'last-five' ? `?${standingsViewParam}=${lastFiveValue}` : ''
