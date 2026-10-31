import { seasonOf } from '@fansite/db/season'

import { SeasonShortcuts } from './season-shortcuts'

// Render on each request, like the page it belongs to, so the build never reads the database.
export const dynamic = 'force-dynamic'

/** The bar of /statistieken, for the current season (see SeasonShortcuts). */
export default function StatisticsShortcuts() {
  return SeasonShortcuts({ season: seasonOf(new Date()) })
}
