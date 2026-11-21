import { expect, type Page, test } from '@playwright/test'

// The e2e server starts with accounts on (see playwright.config.ts), so the menu has Fans.
const menu = (page: Page) => page.getByRole('navigation', { name: 'Hoofdmenu' })

test.describe('the item Fans in the main menu', () => {
  for (const width of [390, 360]) {
    test(`shows Nieuws, Wedstrijden, Spelers, Fans and Forum in one row on a phone of ${width} pixels, without sideways scrolling`, async ({
      page,
    }) => {
      await page.setViewportSize({ height: 812, width })
      await page.goto('/over-ons')

      const tops: (number | undefined)[] = []

      for (const name of ['Nieuws', 'Wedstrijden', 'Spelers', 'Fans', 'Forum']) {
        const link = menu(page).getByRole('link', { name })

        await expect(link).toBeVisible()
        tops.push((await link.boundingBox())?.y)
      }

      // All five stand in one row: Forum does not wrap to a second line.
      expect(new Set(tops).size).toBe(1)

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    })
  }
})
