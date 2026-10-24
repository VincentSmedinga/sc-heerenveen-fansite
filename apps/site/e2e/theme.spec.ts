import { expect, test } from '@playwright/test'

import { checkPage } from './check-page'

// The choice for Licht or Donker is on the html element before React starts, and it survives a reload. A unit test can't
// see either, and a page that flashes the wrong theme goes unnoticed without a test. The address doesn't matter, so the
// page without a database is enough.
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

  test('is kept by the buttons, and forgotten when the system theme is pressed', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(path)
    await expect(page.getByRole('button', { name: 'Licht' })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Donker' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe('dark')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('button', { name: 'Donker' })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Licht' }).click()
    await expect(page.locator('html')).not.toHaveAttribute('data-theme')
    expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBeNull()
  })

  test('is a group named Thema, and without JavaScript there is no group', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()

    await page.goto(path)
    await expect(page.getByRole('group', { name: 'Thema' })).toHaveCount(0)
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
