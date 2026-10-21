import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// The scripts read the .env in the root with `node --env-file-if-exists`, and the tests do the same. A variable that is
// already set, as in CI, wins over the file.
const envFile = fileURLToPath(new URL('../../.env', import.meta.url))

if (existsSync(envFile)) {
  process.loadEnvFile(envFile)
}

export default defineConfig({})
