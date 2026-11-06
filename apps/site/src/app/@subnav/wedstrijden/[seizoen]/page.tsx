import type { SearchParams } from '#src/season-page'

import { MatchesBar } from '#src/matchesBar'

// Render on each request, like the page it belongs to: the bar reads `?competitie=`.
export const dynamic = 'force-dynamic'

/**
 * The bar of the page of a season, such as /wedstrijden/2025-26: Tegenstanders with the same
 * choice. It counts every season, so the season of the page is not in it.
 */
export default function SeasonMatchesSubnav({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return MatchesBar({ current: undefined, searchParams })
}
