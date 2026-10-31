import type { Metadata } from 'next'

import { type SearchParams, seasonOfAddress, statisticsPath } from '../../../season-page'
import { statisticsMetadata, StatisticsPage } from '../statistics-page'

// Render on each request, so the build never reads the database. getMatchData caches the data
// itself.
export const dynamic = 'force-dynamic'

type Params = { seizoen: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  return statisticsMetadata(seasonOfAddress((await params).seizoen, statisticsPath))
}

/**
 * The statistics page of a season other than the current one, such as `/statistieken/2025-26`.
 * A season that has no matches in the database is the page "niet gevonden" (see
 * StatisticsPage).
 */
export default async function SeasonStatisticsPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<SearchParams>
}) {
  return StatisticsPage({ searchParams, season: seasonOfAddress((await params).seizoen, statisticsPath) })
}
