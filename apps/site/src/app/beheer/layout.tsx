import type { ReactNode } from 'react'

import { AdminMarker } from '#src/AdminMarker'
import { sessionToken } from '#src/beheer/require-role'
import { findSession } from '#src/beheer/sessions'
import { getDatabase } from '#src/database'

// Render on each request: who is logged in is not known when the site is built.
export const dynamic = 'force-dynamic'

// Every page under /beheer, the login pages too. It checks the session once more on the server
// and tells the browser through a mark in localStorage, so the main menu on the public pages
// can show the item Beheer without the server ever knowing who looks at them (see
// src/admin-marker.ts). It adds no element around the pages: Page.Main must stay a direct child
// of Page.Body. The pages still guard themselves with requireRole(); this only keeps the mark.
// The bar with the screens of the admin is not drawn here, because a layout draws inside the
// Page.Body: it comes from the slot @shortcuts (app/@shortcuts/beheer, see AdminBar).
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const token = await sessionToken()
  const loggedIn = token !== undefined && (await findSession(getDatabase().db, token)) !== undefined

  return (
    <>
      <AdminMarker loggedIn={loggedIn} />
      {children}
    </>
  )
}
