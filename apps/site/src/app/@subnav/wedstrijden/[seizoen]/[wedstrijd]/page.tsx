import type { SearchParams } from '#src/season-page'

import { MatchesBar } from '#src/matchesBar'

// Render on each request, like the page it belongs to: the bar reads `?competitie=`.
export const dynamic = 'force-dynamic'

/**
 * The bar of the page of one match, such as /wedstrijden/2025-26/<match>: the same as
 * on the page of its season, with no current sub-page and Cijfers of the season of the match.
 */
export default async function MatchSubnav({
  params,
  searchParams,
}: {
  params: Promise<{ seizoen: string }>
  searchParams: Promise<SearchParams>
}) {
  return MatchesBar({ current: undefined, searchParams, seasonSlug: (await params).seizoen })
}
