import type { Metadata } from 'next'

import type { SearchParams } from '#src/season-page'

import { allSeasonsMetadata, AllSeasonsPage } from '../all-seasons-page'

// Render on each request, so the build never reads the database. getAllMatches caches the data
// itself.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Promise<Metadata> => allSeasonsMetadata()

/** The figures of the matches of all seasons since 1990/91, which is not a season. */
export default function AllSeasonsStatisticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return AllSeasonsPage({ searchParams })
}
