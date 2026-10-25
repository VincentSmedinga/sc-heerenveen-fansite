import { expect, test } from '@playwright/test'

// The tags are made by Next.js from the viewport and metadata of the layout, so a unit test
// can't see what a browser gets. A page that loses viewport-fit=cover draws inside the safe
// area again, with a bar of the page colour next to the header. The address doesn't matter, so
// the page without a database is enough.
test.describe('the page on a screen with a notch', () => {
  test('asks for the whole screen in the viewport tag', async ({ page }) => {
    await page.goto('/over-ons')

    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /(^|, )viewport-fit=cover(,|$)/)
  })

  test('makes the status bar of the home screen app see-through', async ({ page }) => {
    await page.goto('/over-ons')

    await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute(
      'content',
      'black-translucent',
    )
  })
})
