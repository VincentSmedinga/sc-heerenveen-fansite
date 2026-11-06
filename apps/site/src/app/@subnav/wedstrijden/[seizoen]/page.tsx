import type { SearchParams } from '#src/season-page'

import { MatchesBar } from '#src/matchesBar'

// Render on each request, like the page it belongs to: the bar reads `?competitie=`.
export const dynamic = 'force-dynamic'

/**
 * The bar of the page of a season, such as /wedstrijden/2025-26: Cijfers of the same season and
 * Tegenstanders, both with the same choice. Tegenstanders counts every season, so the season of
 * the page is not in its link.
 */
export default async function SeasonMatchesSubnav({
  params,
  searchParams,
}: {
  params: Promise<{ seizoen: string }>
  searchParams: Promise<SearchParams>
}) {
  return MatchesBar({ current: undefined, searchParams, seasonSlug: (await params).seizoen })
}
