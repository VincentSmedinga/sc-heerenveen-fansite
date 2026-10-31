import type { Metadata } from 'next'

import type { SearchParams } from '../../../season-page'

import { clubListMetadata, ClubListPage } from './opponents-pages'

// Render on each request, so the build never reads the database. The readings are cached by
// opponents.ts.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Promise<Metadata> => clubListMetadata()

/** The page Tegenstanders: every club we played, A to Z, with our record against each. */
export default function OpponentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return ClubListPage({ searchParams })
}
