import { expect, test } from '@playwright/test'

import { adminCookie } from './admin'
import { headlines } from './headlines'

// The importer keeps the items it finds doubtful or not about the club, and the site never
// shows them to a visitor (#74). Only the admin lists them, so a moderator can find them.

const [doubtful, irrelevant] = headlines.notForVisitors

const visitorPages = [
  '/',
  '/?nieuws=15',
  '/nieuws',
  '/nieuws?bron=testkrant',
  '/podcasts',
  '/podcasts?podcast=testpodcast',
  '/bronnen',
  '/over-ons',
]

test.describe('the items that are not relevant', () => {
  for (const path of visitorPages) {
    test(`are on no page for a visitor: ${path}`, async ({ page }) => {
      await page.goto(path)

      const html = await page.content()

      expect(html).not.toContain(doubtful?.title ?? 'missing')
      expect(html).not.toContain(irrelevant?.title ?? 'missing')
    })
  }

  test('are in the list of the admin, with what the importer found', async ({ baseURL, context, page }) => {
    await context.addCookies([adminCookie(new URL(baseURL ?? '').hostname)])
    await page.goto('/beheer/berichten?q=Verzonnen')

    await expect(page.getByRole('link', { name: doubtful?.title ?? '' })).toBeVisible()
    await expect(page.getByRole('link', { name: irrelevant?.title ?? '' })).toBeVisible()
    await expect(page.getByText('twijfelgeval, niet op de site')).toBeVisible()
    await expect(page.getByText('niet over de club, niet op de site')).toBeVisible()
  })
})
