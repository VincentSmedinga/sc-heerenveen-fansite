import { Page } from '@fansite/design-system'

import type { SearchParams } from '#src/season-page'

import { parseCompetition } from '#src/competition'
import { getAllMatches } from '#src/matches'
import { allSeasonsStatisticsShortcuts } from '#src/statisticsShortcuts'

// Render on each request, like the page it belongs to, so the build never reads the database.
export const dynamic = 'force-dynamic'

/**
 * The bar of /wedstrijden/cijfers/alle: a link to each of the four groups, in the order of the
 * page. When the page can't read its data it shows the error page, which has no groups to jump
 * to, and a choice of competition the page does not know is the page "niet gevonden", so then
 * there is no bar either. `getAllMatches` keeps its answer for a few minutes, so asking again
 * costs nothing; the page logs the error.
 */
export default async function AllSeasonsStatisticsShortcuts({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { competitie } = await searchParams

  if (parseCompetition(competitie) === undefined) {
    return null
  }

  try {
    await getAllMatches()
  } catch {
    return null
  }

  return <Page.Shortcuts items={allSeasonsStatisticsShortcuts} label="Op deze pagina:" />
}
