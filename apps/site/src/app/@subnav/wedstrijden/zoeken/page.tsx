import type { SearchParams } from '#src/season-page'

import { MatchesBar } from '#src/matchesBar'

// Render on each request, like the page it belongs to.
export const dynamic = 'force-dynamic'

/** The bar of /wedstrijden/zoeken, with Zoeken as the current sub-page. */
export default function MatchSearchSubnav({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return MatchesBar({ current: 'search', searchParams })
}
