import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

// Two projects. `unit` is the component tests with jsdom, which `pnpm test` runs without a
// browser. `stories` opens every story in Chrome and checks it with axe, once for the theme in
// STORYBOOK_THEME (see .storybook/preview.tsx); `pnpm test:stories` runs it for light and dark.
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}', '.storybook/**/*.test.ts'],
          name: 'unit',
          setupFiles: ['./vitest.setup.ts'],
        },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: '.storybook' })],
        test: {
          browser: {
            enabled: true,
            headless: true,
            instances: [{ browser: 'chromium' }],
            // CI uses the Google Chrome of the runner, as the checks of the site do (see
            // apps/site/playwright.config.ts). Locally it is the Chromium of Playwright.
            provider: playwright(process.env['CI'] === undefined ? {} : { launchOptions: { channel: 'chrome' } }),
          },
          name: 'stories',
        },
      },
    ],
  },
})
