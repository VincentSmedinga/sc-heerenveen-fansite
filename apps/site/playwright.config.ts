import { defineConfig, devices } from '@playwright/test'

// Not the port of smoke.js (3123), so the two can't get in each other's way.
const port = '3124'
const origin = `http://127.0.0.1:${port}`

// CI passes the folder that `assemble` made and the smoke test checked. Without SITE_FOLDER, the last build is assembled
// into .next/a11y first, so `pnpm build` is all you need before `pnpm test:a11y`. The server reads DATABASE_URL from the
// .env in the root, if there is one; the standalone build doesn't load it itself.
const serve = 'node --env-file-if-exists=../../.env'
const folder = process.env['SITE_FOLDER']
const command =
  folder === undefined
    ? `rm -rf .next/a11y && node scripts/assemble.js .next/a11y && ${serve} .next/a11y/apps/site/server.js`
    : `${serve} "${folder}/apps/site/server.js"`

export default defineConfig({
  forbidOnly: process.env['CI'] !== undefined,
  fullyParallel: true,
  // Chromium only (see docs/beslissingen.md). Install it once with `pnpm --filter site exec playwright install chromium`.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Not the default HTML report, which opens a server after a failure.
  reporter: 'list',
  testDir: 'e2e',
  use: { baseURL: origin },
  webServer: {
    command,
    // HOSTNAME is the name of the machine in many shells, and the server would listen on that.
    env: { HOSTNAME: '127.0.0.1', PORT: port, SITE_ENV: 'acceptance' },
    timeout: 60_000,
    url: origin,
  },
})
