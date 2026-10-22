import { defineMain } from '@storybook/react-vite/node'

import { addBranchTo } from './branch.ts'

export default defineMain({
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    'storybook-addon-pseudo-states',
    {
      // The MCP server for agents, at /mcp on the dev server. The docs and dev toolsets are on. The test toolset
      // needs @storybook/addon-vitest, which we don't use (we test components with Vitest and Testing Library).
      name: '@storybook/addon-mcp',
      options: { toolsets: { dev: true, docs: true, test: false } },
    },
  ],
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
    // The docs toolset of the MCP server reads the component manifest.
    componentsManifest: true,
    // The props in that manifest come from the TypeScript compiler. react-docgen leaves a type like
    // `(typeof headingLevels)[number]` as it is, and react-docgen-typescript drops the props of List and Link.
    // Storybook calls this experimental; the version is pinned, so it only changes with an update.
    experimentalReactComponentMeta: true,
    // The onboarding checklist and guide are in English and not about this project.
    menuOnboardingChecklist: false,
    sidebarOnboardingChecklist: false,
  },
  framework: '@storybook/react-vite',
  // `pnpm review` sets REVIEW_BRANCH for the dev server it starts. The sidebar shows it only there (see branch.ts).
  managerHead: (head, { configType }) =>
    addBranchTo(head ?? '', process.env['REVIEW_BRANCH'], configType ?? 'PRODUCTION'),
  // The logo in the sidebar is served from here.
  staticDirs: [{ from: '../src/assets', to: '/assets' }],
  stories: ['../src/**/*.mdx', '../src/**/*.stories.tsx'],
})
