import type { Metadata } from 'next'

import { playersPath, type SearchParams, seasonOfAddress } from '../../../../season-page'
import { playersMetadata, PlayersPage } from '../players-page'

// Render on each request, so the build never reads the database. getMatchData caches the data
// itself.
export const dynamic = 'force-dynamic'

type Params = { seizoen: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  return playersMetadata(seasonOfAddress((await params).seizoen, playersPath))
}

/**
 * The page Spelers of a season other than the current one, such as
 * `/statistieken/spelers/2025-26`. A season that has no matches in the database is the page
 * "niet gevonden" (see PlayersPage).
 */
export default async function SeasonPlayersPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<SearchParams>
}) {
  return PlayersPage({ searchParams, season: seasonOfAddress((await params).seizoen, playersPath) })
}
