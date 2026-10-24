import { expect, test } from '@playwright/test'

import { checkPage } from './check-page'

// Every page of the site, one line each, and the status code it must answer. A new page is one line here. An address that
// doesn't exist is the page "niet gevonden"; the status code also keeps a typo in a path from testing that page by mistake.
const pages = [
  { path: '/', status: 200 },
  { path: '/bronnen', status: 200 },
  { path: '/over-ons', status: 200 },
  { path: '/privacy', status: 200 },
  { path: '/wat-is-er-nieuw', status: 200 },
  { path: '/bestaat-niet', status: 404 },
]

for (const { path, status } of pages) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`${path} in ${colorScheme}`, async ({ page }) => {
      // The setting of the browser, as a visitor makes it in their operating system.
      await page.emulateMedia({ colorScheme })

      const response = await page.goto(path)
      expect(response?.status(), `${path} must answer ${status}`).toBe(status)

      expect(await checkPage(page)).toEqual([])
    })
  }
}
