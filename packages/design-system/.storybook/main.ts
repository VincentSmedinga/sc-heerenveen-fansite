import { defineMain } from '@storybook/react-vite/node'

export default defineMain({
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', 'storybook-addon-pseudo-states'],
  core: {
    // No telemetry and no 'what's new' notification. The storybook script also skips the version check
    // (--no-version-updates). Storybook 10.6 still fetches its 'what's new' feed in development; that can't be
    // switched off. The pages themselves only talk to the local server.
    disableTelemetry: true,
    disableWhatsNewNotifications: true,
  },
  docs: {
    defaultName: 'Documentatie',
  },
  features: {
    // The onboarding checklist and guide are in English and not about this project.
    menuOnboardingChecklist: false,
    sidebarOnboardingChecklist: false,
  },
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.mdx', '../src/**/*.stories.tsx'],
})
