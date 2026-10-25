import { defineMain } from '@storybook/react-vite/node'

import { addBranchTo } from './branch.ts'
import { addIconsTo } from './icons.ts'
import { addNoindexTo } from './noindex.ts'

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
  // Both heads get the icons (see icons.ts) and `noindex` (see noindex.ts). There is deliberately no robots.txt: a
  // Disallow would also keep out the agents and tools that respect it, and the documentation is there for them to
  // read (the links in the repository and the MCP server).
  managerHead: (head, { configType }) =>
    addNoindexTo(addIconsTo(addBranchTo(head ?? '', process.env['REVIEW_BRANCH'], configType ?? 'PRODUCTION'))),
  previewHead: (head) => addNoindexTo(addIconsTo(head ?? '')),
  // The logo in the sidebar is served from here, and the icons of Storybook from the root, where browsers look for
  // /favicon.ico and Safari for /apple-touch-icon.png.
  staticDirs: [
    { from: '../src/assets', to: '/assets' },
    { from: '../src/assets/icons/storybook', to: '/' },
  ],
  stories: ['../src/**/*.mdx', '../src/**/*.stories.tsx'],
  // The build minifies the CSS with lightningcss, for Vite's default target (Chrome 111, Safari 16.4 and so on).
  // That is older than light-dark(), so lightningcss rewrites it to variables that only work on :root, and a story
  // with its own data-theme keeps the light tokens. The first versions with light-dark() (see the decision 'Licht en
  // donker met light-dark()') as target leave it alone. It has to be set here: Storybook's Vite builder takes only
  // `build.target` from vite.config.ts.
  viteFinal: (config) => ({
    ...config,
    build: { ...config.build, cssTarget: ['chrome123', 'edge123', 'firefox120', 'safari17.5'] },
  }),
})
