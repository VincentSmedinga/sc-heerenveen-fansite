import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// The tests that use the database read DATABASE_URL like the scripts do, from the .env in the
// root. A variable that is already set, as in CI, wins over the file.
const envFile = fileURLToPath(new URL('../../.env', import.meta.url))

if (existsSync(envFile)) {
  process.loadEnvFile(envFile)
}

export default defineConfig({})
