import type { Metadata } from 'next'

import { playerFiguresPath, type SearchParams, seasonOfAddress } from '#src/season-page'

import { playerFiguresMetadata, PlayerFiguresPage } from '../figures-page'

// Render on each request, so the build never reads the database. getMatchData caches the data
// itself.
export const dynamic = 'force-dynamic'

type Params = { seizoen: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  return playerFiguresMetadata(seasonOfAddress((await params).seizoen, playerFiguresPath))
}

/**
 * The figures of the players of a season other than the current one, such as
 * `/spelers/cijfers/2025-26`. An address that isn't a season, or a season that has no matches
 * in the database, is the page "niet gevonden" (see PlayerFiguresPage).
 */
export default async function SeasonPlayerFiguresPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<SearchParams>
}) {
  return PlayerFiguresPage({ searchParams, season: seasonOfAddress((await params).seizoen, playerFiguresPath) })
}
