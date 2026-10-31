import { seasonFromSlug } from '../../../../seasons'
import { SeasonShortcuts } from '../season-shortcuts'

// Render on each request, like the page it belongs to, so the build never reads the database.
export const dynamic = 'force-dynamic'

/**
 * The bar of the page of another season, such as /statistieken/2025-26. An address that isn't a
 * season has no bar: the page is "niet gevonden". The current season is sent to /statistieken
 * by the page, so it gets the bar there.
 */
export default async function SeasonStatisticsShortcuts({ params }: { params: Promise<{ seizoen: string }> }) {
  const season = seasonFromSlug((await params).seizoen)

  return season === undefined ? null : SeasonShortcuts({ season })
}
