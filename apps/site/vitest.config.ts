import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The files in e2e are tests for Playwright, which Vitest can't run. The assembled build for the accessibility checks
    // (.next/a11y) holds test files of packages too.
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
