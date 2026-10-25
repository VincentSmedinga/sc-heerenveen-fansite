'use client'

import { useEffect } from 'react'

import { watchTopEdge } from './watchTopEdge'

/**
 * Takes the strip at the top of the page off while the header has scrolled away, so Safari on
 * an iPhone colours its status bar like the page again (see watchTopEdge.ts). It shows nothing.
 */
export const TopEdge = () => {
  useEffect(() => watchTopEdge(), [])

  return null
}
