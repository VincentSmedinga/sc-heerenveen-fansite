'use client'

import { SegmentedControl } from '@fansite/design-system'
import { type ReactNode, useState, useSyncExternalStore } from 'react'

import type { Venue } from './opponents'

const options = [
  { label: 'Alle', value: 'all' },
  { label: 'Thuis', value: 'home' },
  { label: 'Uit', value: 'away' },
] as const

/**
 * The choice Alle, Thuis or Uit above the content of a card, with `panels`, what the card shows
 * for each choice, which the server has built. The choice is made in the browser, without a
 * page load, and is not kept or put in the address. The server and a page without JavaScript
 * show Alle and no buttons, since the buttons would do nothing. Only the panel that is chosen
 * is in the page.
 */
export function VenueSwitch({ label, panels }: { label: string; panels: Record<Venue, ReactNode> }) {
  const [venue, setVenue] = useState<Venue>('all')
  // Whether the page is live in the browser: the server and a page without JavaScript say no.
  const live = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )

  return (
    <>
      {live ? (
        <SegmentedControl label={label} onChange={setVenue} options={options} size="small" value={venue} />
      ) : null}
      {panels[venue]}
    </>
  )
}
