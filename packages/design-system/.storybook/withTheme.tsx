import type { Decorator } from '@storybook/react-vite'

import { applyTheme, isThemeChoice } from './theme'

/*
 * Sets data-theme on the root element from the toolbar choice. A story that sets its own theme
 * (globals: { theme }) gets a wrapper instead, so on a docs page it doesn't change the other
 * stories.
 */
export const withTheme: Decorator = (Story, context) => {
  // Not in the typed context, so read it defensively.
  const own = (context['storyGlobals'] as Record<string, unknown> | undefined)?.['theme']

  if (isThemeChoice(own) && own !== 'system') {
    return (
      <div data-theme={own}>
        <Story />
      </div>
    )
  }

  const value = context.globals['theme']
  applyTheme(isThemeChoice(value) ? value : 'system')

  return <Story />
}
