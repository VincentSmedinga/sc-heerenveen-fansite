import { AdminBar } from '#src/beheer/AdminBar'

// Render on each request: who is logged in is not known when the site is built.
export const dynamic = 'force-dynamic'

/** The bar with the screens of the admin on every page below /beheer (see ../page.tsx). */
export default function AdminShortcuts() {
  return <AdminBar />
}
