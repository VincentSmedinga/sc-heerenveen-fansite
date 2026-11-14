import { seasonOf } from '@fansite/db/season'

import type { SearchParams } from '#src/season-page'

import { SeasonShortcuts } from '#src/app/@shortcuts/wedstrijden/cijfers/season-shortcuts'
import { seasonHasReports } from '#src/season-report-figures'
import { playersShortcutsFor } from '#src/statisticsShortcuts'

// Render on each request, like the page it belongs to, so the build never reads the database.
export const dynamic = 'force-dynamic'

/** The bar of /spelers, for the current season (see SeasonShortcuts). */
export default async function PlayersShortcuts({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const season = seasonOf(new Date())

  return SeasonShortcuts({ items: playersShortcutsFor(await seasonHasReports(season)), searchParams, season })
}
