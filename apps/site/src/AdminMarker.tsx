'use client'

import { useEffect } from 'react'

import { saveAdminMarker } from './admin-marker'
import { clearAllDrafts } from './beheer/report-draft'

/**
 * Keeps the mark for the menu (admin-marker.ts) as the server saw the session: set for a valid
 * one, gone for none. It draws nothing. With `loggedOut`, the editor chose to log out: the
 * input the browser kept for the forms (beheer/report-draft.ts) goes too. A session that merely
 * ran out keeps it, since that is what the input is for.
 */
export const AdminMarker = ({ loggedIn, loggedOut = false }: { loggedIn: boolean; loggedOut?: boolean }) => {
  useEffect(() => {
    saveAdminMarker(loggedIn)

    if (loggedOut) {
      clearAllDrafts()
    }
  }, [loggedIn, loggedOut])

  return null
}
