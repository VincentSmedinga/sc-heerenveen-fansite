import { seasonOf } from '@fansite/db/season'

import type { SearchParams } from '#src/season-page'

import { SeasonShortcuts } from '#src/app/@shortcuts/cijfers/season-shortcuts'
import { playersShortcuts } from '#src/statisticsShortcuts'

// Render on each request, like the page it belongs to, so the build never reads the database.
export const dynamic = 'force-dynamic'

/** The bar of /spelers, for the current season (see SeasonShortcuts). */
export default function PlayersShortcuts({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return SeasonShortcuts({ items: playersShortcuts, searchParams, season: seasonOf(new Date()) })
}
