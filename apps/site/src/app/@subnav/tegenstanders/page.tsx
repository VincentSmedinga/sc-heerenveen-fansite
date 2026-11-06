import type { SearchParams } from '#src/season-page'

import { MatchesBar } from '#src/matchesBar'

// Render on each request, like the page it belongs to: the bar reads `?competitie=`.
export const dynamic = 'force-dynamic'

/** The bar of /tegenstanders, with Tegenstanders as the current sub-page. */
export default function OpponentsSubnav({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return MatchesBar({ current: 'opponents', searchParams })
}
