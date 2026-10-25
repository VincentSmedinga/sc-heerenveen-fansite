import type { DocsContainerProps } from '@storybook/addon-docs/blocks'
import type { PropsWithChildren } from 'react'

import { DocsContainer } from '@storybook/addon-docs/blocks'
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { GLOBALS_UPDATED } from 'storybook/internal/core-events'

import type { ThemeChoice } from './theme'

import { darkTheme, lightTheme } from './docsThemes'
import { applyTheme, isThemeChoice, onSystemSchemeChange, systemPrefersDark, themeFromUrl } from './theme'

type GlobalsPayload = { globals?: Record<string, unknown> }

/*
 * Docs pages without stories don't run decorators, so this container applies the theme itself.
 * It also gives Storybook's own docs styling the matching light or dark theme.
 */
export const ThemedDocsContainer = ({ children, context }: PropsWithChildren<DocsContainerProps>) => {
  const [choice, setChoice] = useState<ThemeChoice>(() => initialChoice(context))
  const prefersDark = useSyncExternalStore(onSystemSchemeChange, systemPrefersDark)
  const dark = choice === 'dark' || (choice === 'system' && prefersDark)

  useEffect(() => {
    const onGlobals = ({ globals }: GlobalsPayload) => {
      const value = globals?.['theme']
      if (isThemeChoice(value)) setChoice(value)
    }

    context.channel.on(GLOBALS_UPDATED, onGlobals)

    return () => context.channel.off(GLOBALS_UPDATED, onGlobals)
  }, [context.channel])

  // Before the browser paints, so a docs page never shows a frame in the wrong theme.
  useLayoutEffect(() => applyTheme(choice), [choice])

  return (
    <DocsContainer context={context} theme={dark ? darkTheme : lightTheme}>
      {children}
    </DocsContainer>
  )
}

/*
 * The store isn't part of the public docs context type, so read it defensively. If a Storybook
 * update changes it, the theme in the URL still works.
 */
const initialChoice = (context: DocsContainerProps['context']): ThemeChoice => {
  const { store } = context as { store?: { userGlobals?: { globals?: Record<string, unknown> } } }
  const value = store?.userGlobals?.globals?.['theme']

  return isThemeChoice(value) ? value : (themeFromUrl(window.location.search) ?? 'system')
}
