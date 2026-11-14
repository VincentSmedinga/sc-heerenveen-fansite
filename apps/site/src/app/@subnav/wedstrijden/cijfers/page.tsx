import type { SearchParams } from '#src/season-page'

import { MatchesBar } from '#src/matchesBar'

// Render on each request, like the page it belongs to: the bar reads `?competitie=`.
export const dynamic = 'force-dynamic'

/** The bar of /wedstrijden/cijfers, with Cijfers as the current sub-page. */
export default function FiguresSubnav({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return MatchesBar({ current: 'figures', searchParams })
}
