import type { Metadata } from 'next'

import { playersPath, type SearchParams, seasonOfAddress } from '#src/season-page'

import { playerMetadata, PlayerPageView } from '../player-page'
import { playersMetadata, PlayersPage } from '../players-page'

// Render on each request, so the build never reads the database. getMatchData caches the data
// itself.
export const dynamic = 'force-dynamic'

// The folder is named after the season, but the address is also the page of a player
// (`/spelers/jan-de-vries`, #1079): Next.js allows one dynamic part here. A slug of a player
// never looks like a season (`isPlayerSlug`), and anything that looks like one is a season.
type Params = { seizoen: string }

/** Whether the part of the address looks like a season, such as `2025-26`. */
const isSeasonAddress = (part: string) => /^\d{4}-\d{2}$/u.test(part)

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const part = (await params).seizoen

  return isSeasonAddress(part) ? playersMetadata(seasonOfAddress(part, playersPath)) : playerMetadata(part)
}

/**
 * The page Spelers of a season other than the current one, such as `/spelers/2025-26`, or the
 * page of a player, such as `/spelers/jan-de-vries`. A season that has no matches in the
 * database is the page "niet gevonden" (see PlayersPage), and so is a name of nobody (see
 * PlayerPageView).
 */
export default async function SeasonPlayersPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<SearchParams>
}) {
  const part = (await params).seizoen

  return isSeasonAddress(part)
    ? PlayersPage({ searchParams, season: seasonOfAddress(part, playersPath) })
    : PlayerPageView({ slug: part })
}
