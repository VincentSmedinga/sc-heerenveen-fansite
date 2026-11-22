import type { PageShortcutsItem } from '@fansite/design-system'

import type { PlayerPage } from './player-page'
import type { PlayerSeason } from './player-seasons'

import { goalQuartersOf, playerRecordOf, seasonBarsOf } from './player-charts'
import { playerCareerCardId } from './PlayerCareerCard'
import { playerChartIds } from './PlayerChartsCards'
import { playerRatingsCardId } from './PlayerRatingsCard'
import { playerSeasonsCardId, playerSeasonsTable } from './PlayerSeasonsCard'

/**
 * The links in the bar "Op deze pagina:" of the page of a player: one to each card his page
 * has, in the order of a narrow screen, with short labels that don't break on a phone. A card
 * he has no data for is not on the page, so it has no link (see `PlayerPageView`); with fewer
 * than two links there is no bar. The ids are those of the headings (a test checks it). The
 * card Cijfers van de fans (#1466) is there when the page has it (`ratings`), between Per
 * seizoen and Loopbaan, as on the page.
 */
export function playerShortcutsOf(
  seasons: readonly PlayerSeason[],
  line: PlayerPage['line'],
  ratings = false,
): PageShortcutsItem[] {
  const goalkeeper = line === 'doelman'
  const bars = seasonBarsOf(seasons, line)
  const items: PageShortcutsItem[] = [
    ...(seasons.length > 0 && playerSeasonsTable(seasons, goalkeeper).columns.length > 0
      ? [{ href: `#${playerSeasonsCardId}`, label: 'Per seizoen' }]
      : []),
    ...(seasons.length > 0 && ratings ? [{ href: `#${playerRatingsCardId}`, label: 'Cijfers van de fans' }] : []),
    ...(seasons.length > 0 ? [{ href: `#${playerCareerCardId}`, label: 'Loopbaan' }] : []),
    ...(bars === undefined ? [] : [{ href: `#${playerChartIds.seasons}`, label: bars.title }]),
    ...(goalQuartersOf(seasons) === undefined
      ? []
      : [{ href: `#${playerChartIds.quarters}`, label: 'Wanneer hij scoort' }]),
    ...(playerRecordOf(seasons, goalkeeper) === undefined
      ? []
      : [{ href: `#${playerChartIds.record}`, label: 'Record' }]),
  ]

  return items.length < 2 ? [] : items
}
