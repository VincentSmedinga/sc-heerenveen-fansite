import { AdminBar } from '#src/beheer/AdminBar'

// Render on each request: who is logged in is not known when the site is built.
export const dynamic = 'force-dynamic'

/**
 * The bar with the screens of the admin on /beheer itself. The pages below it have the same in
 * [...rest]. It is in the slot because it goes between the main menu and the Page.Body, and a
 * layout under /beheer can only draw inside the Page.Body. The bar is not drawn on the login
 * pages, where nobody is logged in (see AdminScreens).
 */
export default function AdminStartShortcuts() {
  return <AdminBar />
}
