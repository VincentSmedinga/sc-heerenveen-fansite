/** The colour theme chosen in the toolbar. 'system' follows prefers-color-scheme. */
export type ThemeChoice = 'dark' | 'light' | 'system'

export const themeChoices: ThemeChoice[] = ['system', 'light', 'dark']

export const isThemeChoice = (value: unknown): value is ThemeChoice =>
  typeof value === 'string' && (themeChoices as string[]).includes(value)

/** Set data-theme on the root element, or remove it so the system preference applies. */
export const applyTheme = (choice: ThemeChoice) => {
  const root = document.documentElement

  if (choice === 'system') {
    delete root.dataset['theme']
  } else {
    root.dataset['theme'] = choice
  }
}

/** The theme in a Storybook URL, such as ?globals=theme:dark, if there is one. */
export const themeFromUrl = (search: string): ThemeChoice | undefined => {
  const globals = new URLSearchParams(search).get('globals') ?? ''
  const value = globals
    .split(';')
    .map((pair) => pair.split(':'))
    .find(([key]) => key === 'theme')?.[1]

  return isThemeChoice(value) ? value : undefined
}

const darkQuery = '(prefers-color-scheme: dark)'

/** Whether the system prefers dark right now. A snapshot for useSyncExternalStore. */
export const systemPrefersDark = () => window.matchMedia(darkQuery).matches

/** Call back when the system preference changes. Returns a function that stops listening. */
export const onSystemSchemeChange = (callback: () => void) => {
  const query = window.matchMedia(darkQuery)
  query.addEventListener('change', callback)

  return () => query.removeEventListener('change', callback)
}

/** Whether a choice comes down to dark right now. */
export const isDark = (choice: ThemeChoice) => choice === 'dark' || (choice === 'system' && systemPrefersDark())
