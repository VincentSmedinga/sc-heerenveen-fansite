import type { ReactNode } from 'react'

import { AdminMarker } from '../../AdminMarker'
import { sessionToken } from '../../beheer/require-role'
import { findSession } from '../../beheer/sessions'
import { getDatabase } from '../../database'

// Render on each request: who is logged in is not known when the site is built.
export const dynamic = 'force-dynamic'

// Every page under /beheer, the login pages too. It checks the session once more on the server
// and tells the browser through a mark in localStorage, so the main menu on the public pages
// can show the item Beheer without the server ever knowing who looks at them (see
// src/admin-marker.ts). It adds no element around the pages: Page.Main must stay a direct child
// of Page.Body. The pages still guard themselves with requireRole(); this only keeps the mark.
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
