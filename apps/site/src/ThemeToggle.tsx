'use client'

import { ThemeButton } from '@fansite/design-system'
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
 * The button Donker for the header: a sun while the page is light and a moon while it is dark,
 * pressed in the dark theme. Pressing it switches the page to the other theme and keeps the
 * choice on the device; if that is what the system gives anyway, the choice is forgotten and
 * the page follows the system again (chooseTheme), so there is no button for "Systeem".
 *
 * On the server and while hydrating there is no working button, so without JavaScript the page
 * has no button that does nothing, and the server's HTML is the same for everyone. A hidden,
 * inert copy of the button keeps its room in the header: without it the button comes in after
 * hydrating, takes room from the logo, the wordmark wraps and the header grows under a visitor
 * who is already scrolling. The copy is out of the tab order and the accessibility tree.
 * The server knows nothing of the choice: public/theme.js puts it on the page.
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
    return (
      <ThemeButton
        aria-hidden="true"
        dark={false}
        inert
        label="Donker"
        style={{ visibility: 'hidden' }}
        tabIndex={-1}
      />
    )
  }

  const choose = (wanted: Theme) => {
    // The system is read now, not from the state: a choice is judged when it is made, never
    // afterwards.
    const next = chooseTheme(wanted, systemIsDark())

    savePreference(next)
    setPreference(next)
  }

  return (
    <ThemeButton
      dark={theme === 'dark'}
      label="Donker"
      onClick={() => {
        choose(theme === 'dark' ? 'light' : 'dark')
      }}
    />
  )
}
