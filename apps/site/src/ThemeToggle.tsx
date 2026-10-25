'use client'

import { SegmentedControl } from '@fansite/design-system'
import { useEffect, useState, useSyncExternalStore } from 'react'

import type { Theme, ThemePreference } from './theme'

import {
  applyPreference,
  chooseTheme,
  darkQuery,
  readPreference,
  refreshTopEdge,
  resolveTheme,
  savePreference,
} from './theme'

const options = [
  { icon: 'sun', label: 'Licht', value: 'light' },
  { icon: 'moon', label: 'Donker', value: 'dark' },
] as const

const subscribeToNothing = () => () => undefined

// The colours of the page change with the system, so Safari is told to look at the colour of
// the top of the page again (see refreshTopEdge()).
const subscribeToSystem = (onChange: () => void) => {
  const query = matchMedia(darkQuery)
  const onSystemChange = () => {
    refreshTopEdge()
    onChange()
  }

  query.addEventListener('change', onSystemChange)

  return () => {
    query.removeEventListener('change', onSystemChange)
  }
}

const systemIsDark = () => matchMedia(darkQuery).matches

/**
 * The two buttons Licht and Donker for the footer, of which the one a visitor sees is pressed.
 * Pressing the other one switches the page and keeps the choice on the device; if that is what
 * the system gives anyway, the choice is forgotten and the page follows the system again
 * (chooseTheme), so there is no button for "Systeem".
 *
 * There is nothing on the server and while hydrating, so without JavaScript the page has no
 * buttons that do nothing, and the server's HTML is the same for everyone. The server knows
 * nothing of the choice: public/theme.js puts it on the page.
 */
export const ThemeToggle = () => {
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  )
  const [preference, setPreference] = useState<ThemePreference>(() => readPreference())
  const dark = useSyncExternalStore(subscribeToSystem, systemIsDark, () => false)
  const theme = resolveTheme(preference, dark)

  useEffect(() => {
    applyPreference(preference)
  }, [preference, mounted])

  if (!mounted) {
    return null
  }

  const choose = (wanted: Theme) => {
    if (wanted === theme) {
      return
    }

    // The system is read now, not from the state: a choice is judged when it is made, never
    // afterwards.
    const next = chooseTheme(wanted, systemIsDark())

    savePreference(next)
    setPreference(next)
  }

  return <SegmentedControl label="Thema" onChange={choose} options={options} value={theme} />
}
