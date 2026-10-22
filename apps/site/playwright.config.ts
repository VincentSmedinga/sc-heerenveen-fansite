import { defineConfig, devices } from '@playwright/test'

// Not the port of smoke.js (3123), so the two can't get in each other's way.
const port = '3124'
const origin = `http://127.0.0.1:${port}`
// A second copy of the site, without a database, for the error page (e2e/error-page.spec.ts). Nothing listens on port 1 of
// this computer, so the connection is refused at once.
const withoutDatabasePort = '3125'

// CI passes the folder that `assemble` made and the smoke test checked. Without SITE_FOLDER, the last build is assembled
// into .next/a11y first, so `pnpm build` is all you need before `pnpm test:a11y`. The server reads DATABASE_URL from the
// .env in the root, if there is one; the standalone build doesn't load it itself.
const serve = 'node --env-file-if-exists=../../.env'
const folder = process.env['SITE_FOLDER'] ?? '.next/a11y'
const startServer = `${serve} "${folder}/apps/site/server.js"`
// Only the first server assembles the folder. Playwright starts the servers one after another and waits until each one
// answers, so the second finds the folder ready, and it must not assemble it again under the first.
const assembleAndStartServer =
  process.env['SITE_FOLDER'] === undefined
    ? `rm -rf "${folder}" && node scripts/assemble.js "${folder}" && ${startServer}`
    : startServer

export default defineConfig({
  forbidOnly: process.env['CI'] !== undefined,
  fullyParallel: true,
  // Puts the made-up headlines in the database for the homepage, once the site is up and before the first test.
  globalSetup: './e2e/global-setup.ts',
  // Chromium only (see docs/beslissingen.md). Install it once with `pnpm --filter site exec playwright install chromium`.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Not the default HTML report, which opens a server after a failure.
  reporter: 'list',
  testDir: 'e2e',
  use: { baseURL: origin },
  webServer: [
    {
      command: assembleAndStartServer,
      // HOSTNAME is the name of the machine in many shells, and the server would listen on that.
      env: { HOSTNAME: '127.0.0.1', PORT: port, SITE_ENV: 'acceptance' },
      timeout: 60_000,
      // Not the homepage: it keeps its headlines for five minutes, and a request before global-setup.ts has put the made-up
      // headlines in would keep an empty list for the whole run. robots.txt doesn't read the database.
      url: `${origin}/robots.txt`,
    },
    {
      command: startServer,
      env: {
        DATABASE_URL: 'mysql://root@127.0.0.1:1/fansite',
        HOSTNAME: '127.0.0.1',
        PORT: withoutDatabasePort,
        SITE_ENV: 'acceptance',
      },
      timeout: 60_000,
      url: `http://127.0.0.1:${withoutDatabasePort}`,
    },
  ],
})
