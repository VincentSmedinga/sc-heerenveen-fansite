import type { Metadata } from 'next'

import { overviewMetadata, OverviewPage } from '#src/app/spelers/overview-page'

// Render on each request, so the build never reads the database.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Promise<Metadata> => overviewMetadata('land')

/** The overview of all players, land (#1138). */
export default function PlayersOverviewByCountry() {
  return OverviewPage({ view: 'land' })
}
