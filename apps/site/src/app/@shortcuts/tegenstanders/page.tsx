import type { SearchParams } from '#src/season-page'

import { opponentsShortcuts } from '#src/app/tegenstanders/opponents-pages'

// Render on each request, like the page it belongs to, so the build never reads the database.
export const dynamic = 'force-dynamic'

/** The bar of the page Tegenstanders (see `opponentsShortcutsOf`). */
export default function OpponentsShortcuts({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return opponentsShortcuts({ searchParams })
}
