import { seasonOf } from '@fansite/db/season'
import { Page, type PageShortcutsItem } from '@fansite/design-system'

import { getMatchData, getMatchSeasons } from '../../../matches'
import { statisticsShortcuts } from '../../../statisticsShortcuts'

/**
 * The bar of the page of a season: a link to each of the nine cards, in the order of a narrow
 * screen, which is the screen the bar is for (the bar is gone where the cards sit side by
 * side). The cards are the same for every season, so the bar is too. When the page can't read
 * its data it shows the error page, which has no cards to jump to, and a season the page
 * doesn't have is the page "niet gevonden", so then there is no bar either. `getMatchData`
 * keeps its answer for a few minutes, so asking again costs nothing; the page logs the error.
 * The season is only asked for after it is found among the seasons that have matches, as the
 * page does.
 *
 * The page Spelers has a bar of its own, with `items`: the same checks, and a link to its card.
 */
export async function SeasonShortcuts({
  items = statisticsShortcuts,
  season,
}: {
  items?: readonly PageShortcutsItem[]
  season: string
}) {
  try {
    if (season !== seasonOf(new Date()) && !(await getMatchSeasons()).includes(season)) {
      return null
    }

    await getMatchData(season)
  } catch {
    return null
  }

  return <Page.Shortcuts items={items} label="Op deze pagina:" />
}
