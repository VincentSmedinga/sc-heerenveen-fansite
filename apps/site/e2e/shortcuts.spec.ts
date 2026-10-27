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

  test('sticks to the top of the window, and a link brings its heading under the bar, not behind it', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/wedstrijden')
    const bar = page.getByRole('navigation', { name: 'Op deze pagina:' })

    await page.evaluate(() => window.scrollTo({ behavior: 'instant', top: 1500 }))
    expect((await bar.boundingBox())?.y).toBe(0)

    await bar.getByRole('link', { name: 'Doelpuntenmakers' }).click()
    await expect(page).toHaveURL(/#doelpuntenmakers$/)
    await expect
      .poll(async () => (await page.locator('#doelpuntenmakers').boundingBox())?.y ?? 0)
      .toBeGreaterThanOrEqual(47)
  })

  test('does not stick when it wraps at 320 pixels, where it would take too much of the window', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 320 })
    await page.goto('/wedstrijden')

    await expect(page.locator('.hf-page-shortcuts')).toHaveCSS('position', 'static')
  })

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`keeps the link that Tab and Shift+Tab bring into view clear of the fade, in ${colorScheme}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme })
      await page.setViewportSize({ height: 800, width: 390 })
      await page.goto('/wedstrijden')
      const links = page.getByRole('navigation', { name: 'Op deze pagina:' }).getByRole('link')

      // Where the focused link stands against the row, and how wide the two fades are now.
      const measure = () =>
        page.evaluate(() => {
          const link = document.activeElement
          const row = document.querySelector('.hf-page-shortcuts-row')

          if (!(link instanceof HTMLElement) || !row) {
            return undefined
          }

          const style = getComputedStyle(row)
          const box = link.getBoundingClientRect()
          const edge = row.getBoundingClientRect()

          return {
            end: parseFloat(style.getPropertyValue('--hf-shortcuts-fade-end')),
            // The focus ring is 3px wide, 2px away from the link.
            fromEnd: edge.right - (box.right + 5),
            fromStart: box.left - 5 - edge.left,
            name: link.textContent,
            start: parseFloat(style.getPropertyValue('--hf-shortcuts-fade-start')),
          }
        })

      const walk = async (key: 'Shift+Tab' | 'Tab', names: string[]) => {
        for (const name of names) {
          await page.keyboard.press(key)
          await expect(links.filter({ hasText: name })).toBeFocused()
          // The scrolling and the fade follow the scroll position a frame later.
          await expect
            .poll(async () => {
              const found = await measure()

              return found !== undefined && found.fromStart >= found.start - 1 && found.fromEnd >= found.end - 1
            })
            .toBe(true)
        }
      }

      await links.first().focus()
      await walk('Tab', ['Uitslagen', 'Stand', 'Doelpuntenmakers', 'De nul gehouden', 'Doelpunten per kwartier'])
      await walk('Shift+Tab', ['De nul gehouden', 'Doelpuntenmakers', 'Stand', 'Uitslagen', 'Programma'])
    })
  }

  test('brings the keyboard on to the card that a link points to', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/wedstrijden')
    await page.getByRole('navigation', { name: 'Op deze pagina:' }).getByRole('link', { name: 'Stand' }).click()
    await expect(page).toHaveURL(/#stand$/)
    await page.keyboard.press('Tab')

    await expect(page.locator('#stand .hf-heading-link')).toBeFocused()
  })
})
