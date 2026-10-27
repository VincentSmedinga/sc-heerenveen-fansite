import { expect, test } from '@playwright/test'

import { checkPage } from './check-page'

// The choice made with the theme button is on the html element before React starts, and it
// survives a reload. A unit test can't see either, and a page that flashes the wrong theme
// goes unnoticed without a test. The address doesn't matter, so the page without a database is
// enough.
const path = '/over-ons'
const key = 'fansite-theme'

test.describe('the choice for light or dark', () => {
  test('is on the html element when the page loads, before React has started', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.addInitScript((storageKey) => localStorage.setItem(storageKey, 'dark'), key)
    // Without the scripts of the app, nothing but public/theme.js can have set the attribute.
    await page.route('**/_next/static/**', (route) => route.abort())
    await page.goto(path, { waitUntil: 'domcontentloaded' })

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('is not there when nothing was chosen, so the colours follow the system', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(path)

    await expect(page.locator('html')).not.toHaveAttribute('data-theme')
    await expect(page.getByRole('button', { name: 'Donker' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('is kept by the button, and forgotten when the theme of the system is pressed', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(path)
    await expect(page.getByRole('button', { name: 'Donker' })).toHaveAttribute('aria-pressed', 'false')

    await page.getByRole('button', { name: 'Donker' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe('dark')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('button', { name: 'Donker' })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Donker' }).click()
    await expect(page.getByRole('button', { name: 'Donker' })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('html')).not.toHaveAttribute('data-theme')
    expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBeNull()
  })

  test('has one button in the header, before the menu, and without JavaScript there is no button', async ({
    browser,
    page,
  }) => {
    await page.goto(path)
    await expect(page.getByRole('banner').getByRole('button', { name: 'Donker' })).toHaveCount(1)
    await expect(page.getByRole('contentinfo').getByRole('button')).toHaveCount(0)
    // The focus goes from the logo to the theme button and then to the menu.
    await page.getByRole('banner').getByRole('link').first().focus()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Donker' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('navigation', { name: 'Hoofdmenu' }).getByRole('link').first()).toBeFocused()

    const context = await browser.newContext({ javaScriptEnabled: false })
    const plainPage = await context.newPage()

    await plainPage.goto(path)
    await expect(plainPage.getByRole('button', { name: 'Donker' })).toHaveCount(0)
    await context.close()
  })

  for (const [system, choice] of [
    ['light', 'dark'],
    ['dark', 'light'],
  ] as const) {
    test(`passes the accessibility check with ${choice} chosen on a ${system} system`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: system })
      await page.addInitScript(([storageKey, value]) => localStorage.setItem(storageKey, value), [key, choice] as const)
      await page.goto(path)

      expect(await checkPage(page)).toEqual([])
    })
  }
})
