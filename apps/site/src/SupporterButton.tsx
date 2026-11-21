'use client'

import { AccountButton } from '@fansite/design-system'
import { useSyncExternalStore } from 'react'

import { readSupporterMarker, subscribeToSupporterMarker } from './supporter-marker'

/**
 * The account button of the header. The server and the first render in the browser draw the
 * link Inloggen, the same for everyone, so the HTML of a public page is the same for every
 * visitor and works without JavaScript (the page of logging in sends a supporter who is logged
 * in on to Mijn account). Right after hydrating it reads the mark in the browser
 * (supporter-marker.ts) and, with a screen name, draws the initials and goes to Mijn account.
 * The button is the same size either way, so the header does not move.
 */
export const SupporterButton = () => {
  const screenName = useSyncExternalStore(subscribeToSupporterMarker, readSupporterMarker, () => undefined)

  return <AccountButton screenName={screenName} />
}
