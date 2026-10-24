import { defineConfig } from 'vitest/config'

import { headerColourEnv } from './src/header-colour-env.ts'

export default defineConfig({
  test: {
    // The same colour of the header that next.config.ts puts into the code (see src/colours.ts).
    env: headerColourEnv(),
    // The files in e2e are tests for Playwright, which Vitest can't run. The assembled build for the accessibility checks
    // (.next/a11y) holds test files of packages too.
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
