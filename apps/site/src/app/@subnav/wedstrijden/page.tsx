import type { SearchParams } from '#src/season-page'

import { MatchesBar } from '#src/matchesBar'

// Render on each request, like the page it belongs to: the bar reads `?competitie=`.
export const dynamic = 'force-dynamic'

/** The bar of /wedstrijden: Tegenstanders, with the choice of the page. */
export default function MatchesSubnav({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return MatchesBar({ current: undefined, searchParams })
}
