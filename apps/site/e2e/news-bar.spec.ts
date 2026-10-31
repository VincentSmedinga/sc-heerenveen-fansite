import { expect, type Page, test } from '@playwright/test'

import { checkPage } from './check-page'

// The bar with the sub-pages of Nieuws is under the main menu. A unit test can't see that the
// links work from one page to the next, or what a narrow screen does with the bar.
const menu = (page: Page) => page.getByRole('navigation', { name: 'Hoofdmenu' })

test.describe('the bar of Nieuws', () => {
  test('takes the visitor from the home page to each sub-page and marks it', async ({ page }) => {
    await page.goto('/')
    await expect(menu(page).getByRole('link', { name: 'Nieuws' })).toHaveAttribute('aria-current', 'page')
    await expect(menu(page).locator('[aria-current="true"]')).toHaveCount(0)

    for (const [name, path] of [
      ['Archief', '/nieuws'],
      ['Podcasts', '/nieuws/podcasts'],
      ['Zoeken', '/nieuws/zoeken'],
    ] as const) {
      await menu(page).getByRole('link', { exact: true, name }).click()

      await expect(page).toHaveURL(new RegExp(`${path}$`))
      await expect(menu(page).getByRole('link', { exact: true, name })).toHaveAttribute('aria-current', 'page')
      await expect(menu(page).getByRole('link', { name: 'Nieuws' })).toHaveAttribute('aria-current', 'true')
    }
  })

  test('is not on Wedstrijden', async ({ page }) => {
    await page.goto('/wedstrijden')

    await expect(menu(page).getByRole('link', { name: 'Wedstrijden' })).toHaveAttribute('aria-current', 'page')
    await expect(menu(page).getByRole('link', { name: 'Archief' })).toHaveCount(0)
  })

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`shows all three links on a phone of 320 pixels in ${colorScheme}, without a sideways scroll`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme })
      await page.setViewportSize({ height: 800, width: 320 })
      await page.goto('/nieuws/zoeken')

      for (const name of ['Archief', 'Podcasts', 'Zoeken']) {
        await expect(menu(page).getByRole('link', { exact: true, name })).toBeInViewport({ ratio: 1 })
      }

      expect(await checkPage(page)).toEqual([])
    })
  }
})
