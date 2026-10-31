import { seasonOf } from '@fansite/db/season'

import { playersShortcuts } from '../../../../statisticsShortcuts'
import { SeasonShortcuts } from '../season-shortcuts'

// Render on each request, like the page it belongs to, so the build never reads the database.
export const dynamic = 'force-dynamic'

/** The bar of /statistieken/spelers, for the current season (see SeasonShortcuts). */
export default function PlayersShortcuts() {
  return SeasonShortcuts({ items: playersShortcuts, season: seasonOf(new Date()) })
}
