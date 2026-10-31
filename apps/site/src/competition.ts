/**
 * The choice of the statistics pages between the matches their cards count, and the address
 * that holds it. It is apart from `matches.ts`, so the code that only handles an address needs
 * no database.
 */

/**
 * Which matches the cards of the statistics pages count: `all` is the Eredivisie and the KNVB
 * Beker, the default, and `league` is the Eredivisie alone.
 */
export type CompetitionChoice = 'all' | 'league'

/** The name of the query parameter that holds the choice, and the one value it can have. */
export const competitionParam = 'competitie'
export const leagueValue = 'eredivisie'

/**
 * The choice an address asks for with `?competitie=`: no parameter is `all` and `eredivisie` is
 * `league`. Anything else is undefined, so the page is "niet gevonden": a value that is not
 * known, an empty one, `Eredivisie`, `alle` or `eredivisie` twice.
 */
export function parseCompetition(value: string | string[] | undefined): CompetitionChoice | undefined {
  if (value === undefined) {
    return 'all'
  }

  return value === leagueValue ? 'league' : undefined
}

/** The part of a query string that holds the choice: nothing for `all`, which has none. */
export const competitionQuery = (choice: CompetitionChoice) =>
  choice === 'league' ? `?${competitionParam}=${leagueValue}` : ''
