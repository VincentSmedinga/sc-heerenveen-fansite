import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'

import type { SearchParams } from '#src/season-page'

import { playerFiguresMetadata, PlayerFiguresPage } from './figures-page'

// Render on each request, so the build never reads the database. getMatchData caches the data
// itself.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Promise<Metadata> => playerFiguresMetadata(seasonOf(new Date()))

/** The figures of the players of the current season. Another season has its own address. */
export default function CurrentPlayerFiguresPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return PlayerFiguresPage({ searchParams, season: seasonOf(new Date()) })
}
