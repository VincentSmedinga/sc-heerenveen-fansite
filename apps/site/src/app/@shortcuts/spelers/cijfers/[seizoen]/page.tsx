import type { SearchParams } from '#src/season-page'

import { SeasonShortcuts } from '#src/app/@shortcuts/wedstrijden/cijfers/season-shortcuts'
import { seasonHasReports } from '#src/season-report-figures'
import { seasonFromSlug } from '#src/seasons'
import { playerFiguresShortcutsFor } from '#src/statisticsShortcuts'

// Render on each request, like the page it belongs to, so the build never reads the database.
export const dynamic = 'force-dynamic'

/**
 * The bar of the figures of the players of another season, such as /spelers/cijfers/2025-26. An
 * address that isn't a season has no bar: the page is "niet gevonden". The current season is
 * sent to /spelers/cijfers by the page, so it gets the bar there.
 */
export default async function SeasonPlayerFiguresShortcuts({
  params,
  searchParams,
}: {
  params: Promise<{ seizoen: string }>
  searchParams: Promise<SearchParams>
}) {
  const season = seasonFromSlug((await params).seizoen)

  return season === undefined
    ? null
    : SeasonShortcuts({ items: playerFiguresShortcutsFor(await seasonHasReports(season)), searchParams, season })
}
