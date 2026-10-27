import { Page } from '@fansite/design-system'

import { getMatchData } from '../../../matches'
import { matchShortcuts } from '../../../matchShortcuts'

// Render on each request, like the page it belongs to, so the build never reads the database.
export const dynamic = 'force-dynamic'

/**
 * The bar of /wedstrijden: a link to each card, in the order of a narrow screen, which is the
 * screen the bar is for (the bar is gone where the cards sit side by side). When the page can't
 * read its data it shows the error page, which has no cards to jump to, so then there is no bar
 * either. `getMatchData` keeps its answer for a few minutes, so asking again costs nothing; the
 * page logs the error.
 */
export default async function MatchesShortcuts() {
  try {
    await getMatchData()
  } catch {
    return null
  }

  return <Page.Shortcuts items={matchShortcuts} label="Op deze pagina:" />
}
