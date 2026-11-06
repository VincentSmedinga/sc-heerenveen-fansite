import type { SearchParams } from '#src/season-page'

import { MatchesBar } from '#src/matchesBar'

// Render on each request, like the page it belongs to: the bar reads `?competitie=`.
export const dynamic = 'force-dynamic'

/** The bar of the page of a club, such as /tegenstanders/ado-den-haag. */
export default function ClubSubnav({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return MatchesBar({ current: 'opponents', searchParams })
}
