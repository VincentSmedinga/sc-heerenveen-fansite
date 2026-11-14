import { Page } from '@fansite/design-system'

import type { SearchParams } from '#src/season-page'

import { allSeasonsCards } from '#src/app/spelers/cijfers/all-seasons-page'
import { allSeasonsShortcutsFor } from '#src/statisticsShortcuts'

// Render on each request, like the page it belongs to, so the build never reads the database.
export const dynamic = 'force-dynamic'

/** The bar of /spelers/cijfers/alle: a link to each card that the page has. */
export default async function AllSeasonsPlayerFiguresShortcuts({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { competitie } = await searchParams
  const cards = await allSeasonsCards(competitie)

  return cards === undefined ? null : <Page.Shortcuts items={allSeasonsShortcutsFor(cards)} label="Op deze pagina:" />
}
