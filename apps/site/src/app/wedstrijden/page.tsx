import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'

import { matchesMetadata, MatchesPage } from './matches-page'

// Render on each request, so the build never reads the database. getMatchData caches the data
// itself.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Promise<Metadata> => matchesMetadata(seasonOf(new Date()))

/** The matches page of the current season. Another season has an address of its own. */
export default function CurrentMatchesPage() {
  return MatchesPage({ season: seasonOf(new Date()) })
}
