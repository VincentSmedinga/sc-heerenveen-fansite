import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'

import type { SearchParams } from '../../../season-page'

import { playersMetadata, PlayersPage } from './players-page'

// Render on each request, so the build never reads the database. getMatchData caches the data
// itself.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Promise<Metadata> => playersMetadata(seasonOf(new Date()))

/** The page Spelers of the current season. Another season has an address of its own. */
export default function CurrentPlayersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return PlayersPage({ searchParams, season: seasonOf(new Date()) })
}
