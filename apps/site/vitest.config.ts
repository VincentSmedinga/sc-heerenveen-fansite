import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'
import { defineConfig } from 'vitest/config'

import { headerColourEnv } from './src/header-colour-env.ts'

// The tests of the admin use the database, and read DATABASE_URL like the scripts do, from the .env in the root. A variable
// that is already set, as in CI, wins over the file. Only that one: the other tests set SITE_ENV themselves.
const envFile = fileURLToPath(new URL('../../.env', import.meta.url))

if (process.env['DATABASE_URL'] === undefined && existsSync(envFile)) {
  const { DATABASE_URL } = parseEnv(readFileSync(envFile, 'utf8'))

  if (DATABASE_URL !== undefined) {
    process.env['DATABASE_URL'] = DATABASE_URL
  }
}

export default defineConfig({
  test: {
    // The same colour of the header that next.config.ts puts into the code (see src/colours.ts).
    env: headerColourEnv(),
    // The files in e2e are tests for Playwright, which Vitest can't run. The assembled build for the accessibility checks
    // (.next/a11y) holds test files of packages too.
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
