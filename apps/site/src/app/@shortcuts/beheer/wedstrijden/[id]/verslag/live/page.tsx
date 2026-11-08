import { Page } from '@fansite/design-system'

import { AdminBar } from '#src/beheer/AdminBar'
import { parseItemId } from '#src/beheer/items'
import { findReportScreen } from '#src/beheer/match-reports'
import { getDatabase } from '#src/database'

// Render on each request: who is logged in and what the report holds are not known at build.
export const dynamic = 'force-dynamic'

/** The jumps of the quick screen, in page order (the ids are those of its headings). */
export const liveShortcuts = [
  { href: '#live-doelpunt-kop', label: 'Doelpunt' },
  { href: '#live-kaart-kop', label: 'Kaart' },
  { href: '#live-wissel-kop', label: 'Wissel' },
  { href: '#gebeurtenissen-kop', label: 'Gebeurtenissen' },
] as const

/**
 * The bar of the admin and, under it, "Op deze pagina:" with jumps to the forms and the
 * events of the quick screen (#939). A report without players has no forms, so no bar of
 * jumps. The page itself checks the role and shows "niet gevonden".
 */
export default async function LiveShortcuts({ params }: { params: Promise<{ id: string }> }) {
  const id = parseItemId((await params).id)
  const screen = id === undefined ? undefined : await findReportScreen(getDatabase().db, id)
  const players = (screen?.report?.appearances.length ?? 0) > 0

  return (
    <>
      <AdminBar />
      {players ? <Page.Shortcuts items={liveShortcuts} label="Op deze pagina:" /> : null}
    </>
  )
}
