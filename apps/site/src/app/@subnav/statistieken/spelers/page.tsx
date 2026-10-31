import type { SearchParams } from '../../../../season-page'

import { StatisticsBar } from '../../../../statisticsBar'

// Render on each request, like the page it belongs to: the bar reads `?competitie=`.
export const dynamic = 'force-dynamic'

/** The bar of /statistieken/spelers, with Spelers as the current sub-page. */
export default function PlayersSubnav({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return StatisticsBar({ current: 'players', searchParams })
}
