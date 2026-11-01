import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// The tests that use the database read DATABASE_URL like the scripts do, from the .env in the
// root. A variable that is already set, as in CI, wins over the file.
const envFile = fileURLToPath(new URL('../../.env', import.meta.url))

if (existsSync(envFile)) {
  process.loadEnvFile(envFile)
}

// A test never mails the owner, whatever the .env of the developer says (see alerts.ts in the
// database package): the tests that are about alerts give their own settings and a fake mailer.
process.env['ALERT_MAIL_TO'] = ''

export default defineConfig({})
