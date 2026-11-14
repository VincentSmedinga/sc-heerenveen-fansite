import type { NavigationSubitem } from '@fansite/design-system'

import { NavigationBar } from '@fansite/design-system'

import { type CompetitionChoice, competitionQuery, parseCompetition } from './competition'
import { matchSearchPath } from './match-search'
import { opponentsPath } from './opponents'
import { type SearchParams, statisticsPath } from './season-page'
import { allSeasonsAddress, allSeasonsSlug, seasonFromSlug, seasonSlug } from './seasons'

/** The sub-page of Wedstrijden that the visitor is on, or none (the page of a season). */
export type MatchesSubpage = 'figures' | 'opponents' | 'search' | undefined

/**
 * The bar of Wedstrijden for the page the visitor is on, built on the server from the address:
 * the choice in `?competitie=`. A choice that the page does not know is the page "niet
 * gevonden", and then the links go to the default choice instead of repeating it. It reads
 * no data, so it costs nothing next to the page.
 */
export async function MatchesBar({
  current,
  searchParams,
  seasonSlug: slug,
}: {
  current: MatchesSubpage
  searchParams: Promise<SearchParams>
  /** The season in the address of the page, when it has one (`/wedstrijden/2025-26`). */
  seasonSlug?: string
}) {
  const { competitie } = await searchParams
  const competition = parseCompetition(competitie) ?? 'all'
  const season = slug === undefined ? undefined : seasonFromSlug(slug)
  // On the page with all seasons, Cijfers is the page itself and keeps "Alle seizoenen".
  const allSeasons = current === 'figures' && slug === allSeasonsSlug

  return <NavigationBar subitems={matchesBarItems({ allSeasons, competition, current, season })} />
}

/**
 * The links in the bar under the main menu while the visitor is on Wedstrijden: Cijfers,
 * Tegenstanders and Zoeken. Cijfers and Tegenstanders keep the choice between all matches and
 * the Eredivisie, which is in the address of the page (`?competitie=eredivisie`); Zoeken has
 * its own filters and keeps nothing. Cijfers also keeps the season of the page, as
 * the main menu does for Wedstrijden, Cijfers and Spelers (see SiteNavigation); Tegenstanders
 * counts every season, so it has none.
 */
export function matchesBarItems({
  allSeasons = false,
  competition,
  current,
  season,
}: {
  /** The visitor is on the page with all seasons, which Cijfers then keeps. */
  allSeasons?: boolean
  competition: CompetitionChoice
  current: MatchesSubpage
  season?: string | undefined
}): NavigationSubitem[] {
  const query = competitionQuery(competition)
  const figures = allSeasons
    ? allSeasonsAddress(statisticsPath)
    : season === undefined
      ? statisticsPath
      : `${statisticsPath}/${seasonSlug(season)}`

  return [
    { current: current === 'figures', href: `${figures}${query}`, label: 'Cijfers' },
    { current: current === 'opponents', href: `${opponentsPath}${query}`, label: 'Tegenstanders' },
    // The search keeps no choice of competition: it has filters of its own.
    { current: current === 'search', href: matchSearchPath, label: 'Zoeken' },
  ]
}
