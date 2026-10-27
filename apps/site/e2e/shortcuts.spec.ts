import { expect, test } from '@playwright/test'

import { checkPage } from './check-page'

// The pages in pages.spec.ts are checked in a window of 1280 pixels wide, where the bar under
// the header is gone (display: none). axe and the contrast of the bar need a window in which it
// shows, and the check of a window of 320 pixels needs the bar in its wrapped form.
test.describe('the bar under the header of /wedstrijden', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`passes axe on a phone in ${colorScheme}, and does not scroll the page at 320 pixels`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await page.setViewportSize({ height: 800, width: 390 })
      await page.goto('/wedstrijden')

      const bar = page.getByRole('navigation', { name: 'Op deze pagina:' })

      await expect(bar).toBeVisible()
      await expect(bar.getByRole('link')).toHaveCount(6)
      expect(await checkPage(page)).toEqual([])
    })
  }

  test('is gone, also for a screen reader, where the cards sit side by side', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 896 })
    await page.goto('/wedstrijden')

    await expect(page.locator('.hf-page-shortcuts')).toBeHidden()
    await expect(page.getByRole('navigation', { name: 'Op deze pagina:' })).toHaveCount(0)
  })

  test('is there one pixel under that width', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 895 })
    await page.goto('/wedstrijden')

    await expect(page.getByRole('navigation', { name: 'Op deze pagina:' })).toBeVisible()
  })

  test('is not on the other pages', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 390 })

    for (const path of ['/', '/podcasts', '/bronnen']) {
      await page.goto(path)

      await expect(page.locator('.hf-page-shortcuts')).toHaveCount(0)
    }
  })

  test('is left when the visitor goes on to another page, and comes back with the page', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/wedstrijden')
    await page.getByRole('navigation', { name: 'Hoofdmenu' }).getByRole('link', { name: 'Podcasts' }).click()
    await expect(page).toHaveURL(/\/podcasts$/)
    await expect(page.locator('.hf-page-shortcuts')).toHaveCount(0)

    await page.getByRole('navigation', { name: 'Hoofdmenu' }).getByRole('link', { name: 'Wedstrijden' }).click()
    await expect(page).toHaveURL(/\/wedstrijden$/)
    await expect(page.getByRole('navigation', { name: 'Op deze pagina:' })).toBeVisible()
  })

  test('brings the keyboard on to the card that a link points to', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/wedstrijden')
    await page.getByRole('navigation', { name: 'Op deze pagina:' }).getByRole('link', { name: 'Stand' }).click()
    await expect(page).toHaveURL(/#stand$/)
    await page.keyboard.press('Tab')

    await expect(page.locator('#stand .hf-heading-link')).toBeFocused()
  })
})
