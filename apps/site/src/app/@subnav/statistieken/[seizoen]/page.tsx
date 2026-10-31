import type { SearchParams } from '../../../../season-page'

import { seasonFromSlug } from '../../../../seasons'
import { StatisticsBar } from '../../../../statisticsBar'

// Render on each request, like the page it belongs to: the bar reads `?competitie=`.
export const dynamic = 'force-dynamic'

/**
 * The bar of the page of a season, such as /statistieken/2025-26: Spelers with the same
 * season and choice. An address that isn't a season is the page "niet gevonden", and its bar
 * goes to the current season.
 */
export default async function SeasonStatisticsSubnav({
  params,
  searchParams,
}: {
  params: Promise<{ seizoen: string }>
  searchParams: Promise<SearchParams>
}) {
  return StatisticsBar({
    current: undefined,
    searchParams,
    season: seasonFromSlug((await params).seizoen),
  })
}
