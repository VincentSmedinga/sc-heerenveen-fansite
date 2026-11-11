import { overviewShortcuts } from '#src/app/spelers/overview-page'

// Render on each request, like the page it belongs to, so the build never reads the database.
export const dynamic = 'force-dynamic'

/** The bar of the overview of all players, land. */
export default function PlayersOverviewShortcutsByCountry() {
  return overviewShortcuts('land')
}
