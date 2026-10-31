import { seasonOf } from '@fansite/db/season'

import type { SearchParams } from '../../../../season-page'

import { playersShortcuts } from '../../../../statisticsShortcuts'
import { SeasonShortcuts } from '../season-shortcuts'

// Render on each request, like the page it belongs to, so the build never reads the database.
export const dynamic = 'force-dynamic'

/** The bar of /statistieken/spelers, for the current season (see SeasonShortcuts). */
export default function PlayersShortcuts({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return SeasonShortcuts({ items: playersShortcuts, searchParams, season: seasonOf(new Date()) })
}
