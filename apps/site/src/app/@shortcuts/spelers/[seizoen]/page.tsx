import { playerShortcuts } from '#src/app/spelers/player-page'
import { isSeasonAddress, type SearchParams } from '#src/season-page'

// Render on each request, like the page it belongs to, so the build never reads the database.
export const dynamic = 'force-dynamic'

/**
 * The bar of the page of a player (see `playerShortcutsOf`). The page Spelers of another
 * season, such as /spelers/2025-26, has no bar, and the slot is empty (see ../page.tsx).
 */
export default async function PlayerShortcuts({
  params,
  searchParams,
}: {
  params: Promise<{ seizoen: string }>
  searchParams: Promise<SearchParams>
}) {
  const slug = (await params).seizoen

  return isSeasonAddress(slug) ? null : playerShortcuts({ searchParams, slug })
}
