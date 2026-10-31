import type { SearchParams } from '../../../../../season-page'

import { StatisticsBar } from '../../../../../statisticsBar'

// Render on each request, like the page it belongs to: the bar reads `?competitie=`.
export const dynamic = 'force-dynamic'

/** The bar of the page of a club, such as /statistieken/tegenstanders/ado-den-haag. */
export default function ClubSubnav({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return StatisticsBar({ current: 'opponents', searchParams })
}
