import { SeasonShortcuts } from '#src/app/@shortcuts/wedstrijden/cijfers/season-shortcuts'
import { seasonFromSlug } from '#src/seasons'
import { playersShortcuts } from '#src/statisticsShortcuts'

// Render on each request, like the page it belongs to, so the build never reads the database.
export const dynamic = 'force-dynamic'

/**
 * The bar of the page Spelers of another season, such as /spelers/2025-26. An address that
 * isn't a season has no bar: the page is "niet gevonden". The current season is sent to
 * /spelers by the page, so it gets the bar there.
 */
export default async function SeasonPlayersShortcuts({ params }: { params: Promise<{ seizoen: string }> }) {
  const season = seasonFromSlug((await params).seizoen)

  return season === undefined
    ? null
    : SeasonShortcuts({ items: playersShortcuts, searchParams: Promise.resolve({}), season })
}
