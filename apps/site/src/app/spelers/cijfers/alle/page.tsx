import type { Metadata } from 'next'

import type { SearchParams } from '#src/season-page'

import { allSeasonsPlayersMetadata, AllSeasonsPlayersPage } from '../all-seasons-page'

// Render on each request, so the build never reads the database. getAllTimeMatches caches the
// data itself.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Promise<Metadata> => allSeasonsPlayersMetadata()

/** The figures of the players over all seasons since 1990/91. */
export default function AllSeasonsPlayerFiguresPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return AllSeasonsPlayersPage({ searchParams })
}
