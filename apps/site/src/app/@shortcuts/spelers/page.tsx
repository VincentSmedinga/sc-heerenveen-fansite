import { seasonOf } from '@fansite/db/season'

import { SeasonShortcuts } from '#src/app/@shortcuts/cijfers/season-shortcuts'
import { playersShortcuts } from '#src/statisticsShortcuts'

// Render on each request, like the page it belongs to, so the build never reads the database.
export const dynamic = 'force-dynamic'

/** The bar of /spelers, for the current season (see SeasonShortcuts). */
export default function PlayersShortcuts() {
  return SeasonShortcuts({ items: playersShortcuts, searchParams: Promise.resolve({}), season: seasonOf(new Date()) })
}
