'use client'

import { useEffect } from 'react'

import { saveAdminMarker } from './admin-marker'

/**
 * Keeps the mark for the menu (admin-marker.ts) as the server saw the session: set for a valid
 * one, gone for none. It draws nothing.
 */
export const AdminMarker = ({ loggedIn }: { loggedIn: boolean }) => {
  useEffect(() => {
    saveAdminMarker(loggedIn)
  }, [loggedIn])

  return null
}
