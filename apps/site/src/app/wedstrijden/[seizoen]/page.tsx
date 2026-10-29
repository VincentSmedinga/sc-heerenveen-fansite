import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { notFound, redirect } from 'next/navigation'

import { seasonFromSlug } from '../../../seasons'
import { matchesMetadata, MatchesPage, matchesPath, type SearchParams } from '../matches-page'

// Render on each request, so the build never reads the database. getMatchData caches the data
// itself.
export const dynamic = 'force-dynamic'

type Params = { seizoen: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  return matchesMetadata(seasonOfAddress((await params).seizoen))
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
  return MatchesPage({ searchParams, season: seasonOfAddress((await params).seizoen) })
}

/**
 * The season of the address, or the page "niet gevonden" for an address that isn't a season.
 * The current season has one address, `/wedstrijden`, so this one goes there for now. The
 * redirect is not permanent: from 1 July the season that is the current one now is an address
 * of its own.
 */
function seasonOfAddress(slug: string) {
  const season = seasonFromSlug(slug)

  if (season === undefined) {
    notFound()
  }

  if (season === seasonOf(new Date())) {
    redirect(matchesPath)
  }

  return season
}
