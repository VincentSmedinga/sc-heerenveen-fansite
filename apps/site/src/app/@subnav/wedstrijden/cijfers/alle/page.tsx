import type { SearchParams } from '#src/season-page'

import { MatchesBar } from '#src/matchesBar'
import { allSeasonsSlug } from '#src/seasons'

// Render on each request, like the page it belongs to: the bar reads `?competitie=`.
export const dynamic = 'force-dynamic'

/**
 * The bar of the page with all seasons, /wedstrijden/cijfers/alle, with Cijfers as the current
 * sub-page. The page has a fixed folder next to `[seizoen]`, so it needs a route of its own
 * here.
 */
export default function AllSeasonsFiguresSubnav({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return MatchesBar({ current: 'figures', searchParams, seasonSlug: allSeasonsSlug })
}
