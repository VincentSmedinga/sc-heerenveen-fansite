import { expect, test } from '@playwright/test'

import { checkPage } from './check-page'

// The second copy of the site in playwright.config.ts, which has no database. The pages that
// read the database, the homepage, the sources, podcasts and matches pages, are the error page.
const withoutDatabase = 'http://127.0.0.1:3125'

for (const path of ['/', '/bronnen', '/nieuws/podcasts', '/wedstrijden']) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`the error page on ${path} in ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })

      const response = await page.goto(`${withoutDatabase}${path}`)

      // Next.js can't send a page that failed with a 5xx and the page in the HTML. The page
      // asks search engines to leave it out.
      expect(response?.status()).toBe(200)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Er ging iets mis')
      expect(await checkPage(page)).toEqual([])
    })
  }
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('the error page is there, in the page layout', async ({ page }) => {
    await page.goto(`${withoutDatabase}/bronnen`)

    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Er ging iets mis')
    await expect(page.getByRole('link', { name: 'het forum' })).toHaveAttribute('href', 'https://forum.heerenveen.org')
    await expect(page.getByRole('link', { name: 'Probeer het opnieuw' })).toHaveAttribute('href', '/bronnen')
    await expect(page.getByRole('link', { name: 'Naar de homepage' })).toHaveAttribute('href', '/')
    await expect(page.getByRole('contentinfo')).toBeVisible()
  })
})
