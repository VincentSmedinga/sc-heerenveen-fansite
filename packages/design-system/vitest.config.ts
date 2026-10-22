import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', '.storybook/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
