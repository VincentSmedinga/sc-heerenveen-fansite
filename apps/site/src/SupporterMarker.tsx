'use client'

import { useEffect } from 'react'

import { saveSupporterMarker } from './supporter-marker'

/**
 * Keeps the mark for the header (supporter-marker.ts) as the server saw the session: the screen
 * name for a valid one, gone for none. It draws nothing.
 */
export const SupporterMarker = ({ screenName }: { screenName?: string | undefined }) => {
  useEffect(() => {
    saveSupporterMarker(screenName)
  }, [screenName])

  return null
}
