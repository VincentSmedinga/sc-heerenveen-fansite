import type { NavigationSubitem } from '@fansite/design-system'

import { seasonOf } from '@fansite/db/season'
import { NavigationBar } from '@fansite/design-system'

import { type CompetitionChoice, competitionQuery, parseCompetition } from './competition'
import { opponentsPath } from './opponents'
import { playersPath, type SearchParams } from './season-page'
import { seasonAddress } from './seasons'

/** The sub-page of Statistieken that the visitor is on, or none (the page of a season). */
export type StatisticsSubpage = 'opponents' | 'players' | undefined

/**
 * The bar of Statistieken for the page the visitor is on, built on the server from the address:
 * the season of the page (without one it is the current season) and the choice in
 * `?competitie=`. A choice that the page does not know is the page "niet gevonden", and then
 * the links go to the default choice instead of repeating it. It reads no data, so it costs
 * nothing next to the page.
 */
export async function StatisticsBar({
  current,
  searchParams,
  season,
}: {
  current: StatisticsSubpage
  searchParams: Promise<SearchParams>
  season?: string | undefined
}) {
  const { competitie } = await searchParams
  const competition = parseCompetition(competitie) ?? 'all'

  return <NavigationBar subitems={statisticsBarItems({ competition, current, season })} />
}

/**
 * The links in the bar under the main menu while the visitor is on Statistieken: Spelers and
 * Tegenstanders. Spelers keeps the season of the page and the choice between all matches and
 * the Eredivisie, which are in the address of the page (`/statistieken/2025-26?competitie=
 * eredivisie` is `/statistieken/spelers/2025-26?competitie=eredivisie`). Tegenstanders counts
 * every season, so it only keeps the choice. The current season is the address without a
 * season, as on the pages themselves. The main menu does not do this: its links have fixed
 * addresses (see SiteNavigation).
 */
export function statisticsBarItems({
  competition,
  current,
  season = seasonOf(new Date()),
}: {
  competition: CompetitionChoice
  current: StatisticsSubpage
  season?: string | undefined
}): NavigationSubitem[] {
  const query = competitionQuery(competition)

  return [
    {
      current: current === 'players',
      href: `${seasonAddress(playersPath, season, seasonOf(new Date()))}${query}`,
      label: 'Spelers',
    },
    { current: current === 'opponents', href: `${opponentsPath}${query}`, label: 'Tegenstanders' },
  ]
}
