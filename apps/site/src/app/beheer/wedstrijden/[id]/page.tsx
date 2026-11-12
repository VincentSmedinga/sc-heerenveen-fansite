import type { Metadata } from 'next'

import { MatchEditPage } from '../MatchEditPage'

// Render on each request: the match changes with every entry and every import.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Wedstrijd invullen' }

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** The whole form of a match: every part below the other (issue 1162). */
export default async function MatchPage({ params, searchParams }: Props) {
  return MatchEditPage({ id: (await params).id, searchParams: await searchParams })
}
