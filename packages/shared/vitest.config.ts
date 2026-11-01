import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Two test files at a time while sessions share the computer. CI keeps the default, because
    // a runner has the computer to itself (see docs/beslissingen.md).
    ...(process.env['CI'] === undefined ? { maxWorkers: 2 } : {}),
  },
})
