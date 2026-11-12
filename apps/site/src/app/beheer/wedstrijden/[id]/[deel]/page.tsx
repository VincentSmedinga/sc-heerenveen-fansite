import type { Metadata } from 'next'

import { notFound } from 'next/navigation'

import { MatchEditPage, type MatchPagePart, matchPageParts } from '#src/app/beheer/wedstrijden/MatchEditPage'

// Render on each request: the match changes with every entry and every import.
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ deel: string; id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** What the tab says: "Wedstrijd invullen: doelpunten". */
export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { deel } = await params

  return {
    robots: { follow: false, index: false },
    title: isPart(deel) ? `Wedstrijd invullen: ${deel}` : 'Wedstrijd invullen',
  }
}

/** One part of the form of a match, on its own (issue 1162). An unknown part is not found. */
export default async function MatchPartPage({ params, searchParams }: Props) {
  const { deel, id } = await params

  if (!isPart(deel)) {
    notFound()
  }

  return MatchEditPage({ id, part: deel, searchParams: await searchParams })
}

function isPart(value: string): value is MatchPagePart {
  return (matchPageParts as string[]).includes(value)
}
