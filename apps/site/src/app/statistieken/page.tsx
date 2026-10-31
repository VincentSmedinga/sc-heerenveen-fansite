import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'

import type { SearchParams } from '../../season-page'

import { statisticsMetadata, StatisticsPage } from './statistics-page'

// Render on each request, so the build never reads the database. getMatchData caches the data
// itself.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Promise<Metadata> => statisticsMetadata(seasonOf(new Date()))

/** The statistics page of the current season. Another season has an address of its own. */
export default function CurrentStatisticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return StatisticsPage({ searchParams, season: seasonOf(new Date()) })
}
