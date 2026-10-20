import { GLOBALS_UPDATED } from 'storybook/internal/core-events'
import { addons } from 'storybook/manager-api'

import type { ThemeChoice } from './theme'

import { darkTheme, lightTheme } from './docsThemes'
import { isDark, isThemeChoice, onSystemSchemeChange, themeFromUrl } from './theme'

/*
 * In the dark sidebar Storybook darkens the accent for the selected item and puts white text on it.
 * Blue-300 would give 3.5:1 there; blue-400 gives 5.5:1, and 5.3:1 where the accent is used as text.
 */
const managerDarkTheme = { ...darkTheme, colorSecondary: '#6098de' } // blue-400

let choice: ThemeChoice = themeFromUrl(window.location.search) ?? 'system'

// The sidebar follows the Thema menu and, with Volgens systeem, the system preference.
const applyManagerTheme = () => addons.setConfig({ theme: isDark(choice) ? managerDarkTheme : lightTheme })

addons.setConfig({
  // Chapters in the order of storySort, rather than loose pages above the groups.
  sidebar: {
    showRoots: false,
  },
})
applyManagerTheme()

// Wait for the channel: before that, getChannel() returns a stand-in that never receives events.
void addons.ready().then((channel) =>
  channel.on(GLOBALS_UPDATED, ({ globals }: { globals?: Record<string, unknown> }) => {
    const value = globals?.['theme']
    if (isThemeChoice(value) && value !== choice) {
      choice = value
      applyManagerTheme()
    }
  }),
)
onSystemSchemeChange(applyManagerTheme)

// The manager page keeps lang="en": Storybook's own interface (search, menus, panels) is English.
