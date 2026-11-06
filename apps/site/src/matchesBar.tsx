import type { NavigationSubitem } from '@fansite/design-system'

import { NavigationBar } from '@fansite/design-system'

import { type CompetitionChoice, competitionQuery, parseCompetition } from './competition'
import { opponentsPath } from './opponents'
import { type SearchParams } from './season-page'

/** The sub-page of Wedstrijden that the visitor is on, or none (the page of a season). */
export type MatchesSubpage = 'opponents' | undefined

/**
 * The bar of Wedstrijden for the page the visitor is on, built on the server from the address:
 * the choice in `?competitie=`. A choice that the page does not know is the page "niet
 * gevonden", and then the links go to the default choice instead of repeating it. It reads
 * no data, so it costs nothing next to the page.
 */
export async function MatchesBar({
  current,
  searchParams,
}: {
  current: MatchesSubpage
  searchParams: Promise<SearchParams>
}) {
  const { competitie } = await searchParams
  const competition = parseCompetition(competitie) ?? 'all'

  return <NavigationBar subitems={matchesBarItems({ competition, current })} />
}

/**
 * The links in the bar under the main menu while the visitor is on Wedstrijden: Tegenstanders.
 * Tegenstanders counts every season, so it only keeps the choice between all matches and the
 * Eredivisie, which is in the address of the page (`?competitie=eredivisie`). The main menu
 * keeps the season of the page for Wedstrijden, Statistieken and Spelers, but not the choice
 * (see SiteNavigation).
 */
export function matchesBarItems({
  competition,
  current,
}: {
  competition: CompetitionChoice
  current: MatchesSubpage
}): NavigationSubitem[] {
  const query = competitionQuery(competition)

  return [{ current: current === 'opponents', href: `${opponentsPath}${query}`, label: 'Tegenstanders' }]
}
