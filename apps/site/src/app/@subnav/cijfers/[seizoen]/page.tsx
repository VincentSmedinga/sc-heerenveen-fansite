import type { SearchParams } from '#src/season-page'

import { MatchesBar } from '#src/matchesBar'

// Render on each request, like the page it belongs to: the bar reads `?competitie=`.
export const dynamic = 'force-dynamic'

/** The bar of a season such as /cijfers/2025-26, with Cijfers as the current sub-page. */
export default async function SeasonFiguresSubnav({
  params,
  searchParams,
}: {
  params: Promise<{ seizoen: string }>
  searchParams: Promise<SearchParams>
}) {
  return MatchesBar({ current: 'figures', searchParams, seasonSlug: (await params).seizoen })
}
