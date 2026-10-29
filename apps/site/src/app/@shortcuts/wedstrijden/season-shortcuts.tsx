import { seasonOf } from '@fansite/db/season'
import { Page } from '@fansite/design-system'

import { getMatchData, getMatchSeasons } from '../../../matches'
import { matchShortcutsOf } from '../../../matchShortcuts'

/**
 * The bar of the page of a season: a link to each card the page has, in the order of a narrow
 * screen, which is the screen the bar is for (the bar is gone where the cards sit side by
 * side). A season that is over has no Programma, so no link to it. When the page can't read its
 * data it shows the error page, which has no cards to jump to, and a season the page doesn't
 * have is the page "niet gevonden", so then there is no bar either. `getMatchData` keeps its
 * answer for a few minutes, so asking again costs nothing; the page logs the error. The season
 * is only asked for after it is found among the seasons that have matches, as the page does.
 */
export async function SeasonShortcuts({ season }: { season: string }) {
  const current = season === seasonOf(new Date())

  try {
    if (!current && !(await getMatchSeasons()).includes(season)) {
      return null
    }

    await getMatchData(season)
  } catch {
    return null
  }

  return <Page.Shortcuts items={matchShortcutsOf(current)} label="Op deze pagina:" />
}
