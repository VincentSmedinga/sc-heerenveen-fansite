import type { SearchParams } from '../../../season-page'

import { StatisticsBar } from '../../../statisticsBar'

// Render on each request, like the page it belongs to: the bar reads `?competitie=`.
export const dynamic = 'force-dynamic'

/** The bar of /statistieken: Spelers and Tegenstanders, with the choice of the page. */
export default function StatisticsSubnav({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return StatisticsBar({ current: undefined, searchParams })
}
