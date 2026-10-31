import type { Metadata } from 'next'

import type { SearchParams } from '../../../../season-page'

import { clubMetadata, ClubPage } from '../opponents-pages'

// Render on each request, so the build never reads the database. The readings are cached by
// opponents.ts.
export const dynamic = 'force-dynamic'

type Params = { club: string }

/** The page of one club, with our record against it. An unknown slug is "niet gevonden". */
export default async function ClubOpponentPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<SearchParams>
}) {
  return ClubPage({ searchParams, slug: (await params).club })
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  return clubMetadata((await params).club)
}
