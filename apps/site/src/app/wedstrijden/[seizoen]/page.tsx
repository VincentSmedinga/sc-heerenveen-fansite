import type { Metadata } from 'next'

import { matchesPath, type SearchParams, seasonOfAddress } from '#src/season-page'

import { matchesMetadata, MatchesPage } from '../matches-page'

// Render on each request, so the build never reads the database. getMatchData caches the data
// itself.
export const dynamic = 'force-dynamic'

type Params = { seizoen: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  return matchesMetadata(seasonOfAddress((await params).seizoen, matchesPath))
}

/**
 * The matches page of a season other than the current one, such as `/wedstrijden/2025-26`. A
 * season that has no matches in the database is the page "niet gevonden" (see MatchesPage).
 */
export default async function SeasonMatchesPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<SearchParams>
}) {
  return MatchesPage({ searchParams, season: seasonOfAddress((await params).seizoen, matchesPath) })
}
