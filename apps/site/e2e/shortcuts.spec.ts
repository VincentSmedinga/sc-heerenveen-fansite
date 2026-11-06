import { expect, test } from '@playwright/test'

import { checkPage } from './check-page'
import { earlierSeasonSlug } from './earlier-season'
import { hydrated } from './hydrated'

// The pages in pages.spec.ts are checked in a window of 1280 pixels wide, where the bar under
// the header is gone (display: none). axe and the contrast of the bar need a window in which it
// shows, and the check of a window of 320 pixels needs the bar in its wrapped form. Both pages
// have the bar, with the links to their own cards: Wedstrijden six (the made-up season has a
// result in three competitions and a head coach in the table) and Cijfers ten. The checks
// of how it behaves while scrolling are on /cijfers below, the page with the long cards.
const withBar = [
  { links: 6, path: '/wedstrijden' },
  { links: 10, path: '/cijfers' },
] as const

for (const { links, path } of withBar) {
  test.describe(`the bar under the header of ${path}`, () => {
    for (const colorScheme of ['light', 'dark'] as const) {
      test(`passes axe on a phone in ${colorScheme}, and does not scroll the page at 320 pixels`, async ({ page }) => {
        await page.emulateMedia({ colorScheme })
        await page.setViewportSize({ height: 800, width: 390 })
        await page.goto(path)

        const bar = page.getByRole('navigation', { name: 'Op deze pagina:' })

        await expect(bar).toBeVisible()
        await expect(bar.getByRole('link')).toHaveCount(links)
        expect(await checkPage(page)).toEqual([])
      })
    }

    test('is gone, also for a screen reader, where the cards sit side by side', async ({ page }) => {
      await page.setViewportSize({ height: 800, width: 832 })
      await page.goto(path)

      await expect(page.locator('.hf-page-shortcuts')).toBeHidden()
      await expect(page.getByRole('navigation', { name: 'Op deze pagina:' })).toHaveCount(0)
    })

    test('is there one pixel under that width (51.9rem)', async ({ page }) => {
      await page.setViewportSize({ height: 800, width: 831 })
      await page.goto(path)

      await expect(page.getByRole('navigation', { name: 'Op deze pagina:' })).toBeVisible()
    })

    test('is there exactly when the body has one column, at 51.9rem and at 52rem', async ({ page }) => {
      const columns = () =>
        page.locator('.hf-page-body').evaluate((body) => getComputedStyle(body).gridTemplateColumns.split(' ').length)

      for (const [width, count, bar] of [
        [831, 1, 1],
        [832, 2, 0],
      ] as const) {
        await page.setViewportSize({ height: 800, width })
        await page.goto(path)

        expect(await columns()).toBe(count)
        await expect(page.getByRole('navigation', { name: 'Op deze pagina:' })).toHaveCount(bar)
      }
    })
  })
}

test.describe('the bar under the header of /cijfers', () => {
  test('is not on the other pages', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 390 })

    for (const path of ['/', '/nieuws/podcasts', '/bronnen']) {
      await page.goto(path)

      await expect(page.locator('.hf-page-shortcuts')).toHaveCount(0)
    }
  })

  test('is left when the visitor goes on to another page, and comes back with the page', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/cijfers')
    const menu = page.getByRole('navigation', { name: 'Hoofdmenu' })
    const bar = page.getByRole('navigation', { name: 'Op deze pagina:' })

    await expect(bar.getByRole('link')).toHaveCount(10)
    await menu.getByRole('link', { name: 'Nieuws' }).click()
    await expect(page).toHaveURL(/\/nieuws$/)
    await expect(page.locator('.hf-page-shortcuts')).toHaveCount(0)

    // Cijfers is in the bar under Wedstrijden.
    await menu.getByRole('link', { name: 'Wedstrijden' }).click()
    await menu.getByRole('link', { name: 'Cijfers' }).click()
    await expect(page).toHaveURL(/\/cijfers$/)
    await expect(bar.getByRole('link')).toHaveCount(10)

    // The other page with a bar has its own links, not those of the page before.
    await menu.getByRole('link', { name: 'Wedstrijden' }).click()
    await expect(page).toHaveURL(/\/wedstrijden$/)
    await expect(bar.getByRole('link', { name: 'Eredivisie' })).toBeVisible()
    await expect(bar.getByRole('link', { name: 'Reeksen' })).toHaveCount(0)

    await menu.getByRole('link', { name: 'Cijfers' }).click()
    await expect(page).toHaveURL(/\/cijfers$/)
    await expect(bar.getByRole('link', { name: 'Reeksen' })).toBeVisible()
    await expect(bar.getByRole('link', { name: 'Eredivisie' })).toHaveCount(0)
  })

  test('sticks to the top of the window, and a link brings its heading under the bar, not behind it', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/cijfers')
    const bar = page.getByRole('navigation', { name: 'Op deze pagina:' })

    await page.evaluate(() => window.scrollTo({ behavior: 'instant', top: 1500 }))
    expect((await bar.boundingBox())?.y).toBe(0)

    await bar.getByRole('link', { name: 'Hoe vaak welke uitslag' }).click()
    await expect(page).toHaveURL(/#hoe-vaak-welke-uitslag$/)
    await expect
      .poll(async () => (await page.locator('#hoe-vaak-welke-uitslag').boundingBox())?.y ?? 0)
      .toBeGreaterThanOrEqual(47)
  })

  test('does not stick when it wraps at 320 pixels, where it would take too much of the window', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 320 })
    await page.goto('/cijfers')

    await expect(page.locator('.hf-page-shortcuts')).toHaveCSS('position', 'static')
  })

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`keeps the link that Tab and Shift+Tab bring into view clear of the fade, in ${colorScheme}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme })
      await page.setViewportSize({ height: 800, width: 390 })
      await page.goto('/cijfers')
      const links = page.getByRole('navigation', { name: 'Op deze pagina:' }).getByRole('link')

      // Where the focused link stands against the row, and how wide the two fades are now.
      const measure = () =>
        page.evaluate(() => {
          const link = document.activeElement
          const row = document.querySelector('.hf-page-shortcuts .hf-page-shortcuts-row')

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
      await walk('Tab', [
        'Verloop van het seizoen',
        'Hoe wedstrijden verlopen',
        'Reeksen',
        'Thuis en uit',
        'Toeschouwers',
        'Hoe vaak welke uitslag',
        'De nul gehouden',
        'Doelpunten per kwartier',
        'Uitersten',
      ])
      await walk('Shift+Tab', [
        'Doelpunten per kwartier',
        'De nul gehouden',
        'Hoe vaak welke uitslag',
        'Toeschouwers',
        'Thuis en uit',
        'Reeksen',
        'Hoe wedstrijden verlopen',
        'Verloop van het seizoen',
        'Plek in de competitie',
      ])
    })
  }

  test('brings the keyboard on to the card that a link points to', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/cijfers')
    await page.getByRole('navigation', { name: 'Op deze pagina:' }).getByRole('link', { name: 'Reeksen' }).click()
    await expect(page).toHaveURL(/#reeksen$/)
    await page.keyboard.press('Tab')

    await expect(page.locator('#reeksen .hf-heading-link')).toBeFocused()
  })

  test('has no current link at the top of the page, and the link to the card that came past last when scrolling', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/cijfers')
    const bar = page.getByRole('navigation', { name: 'Op deze pagina:' })
    const current = bar.locator('[aria-current]')

    await hydrated(page)
    await expect(bar.getByRole('link').first()).toBeVisible()
    await expect(current).toHaveCount(0)

    // As a click on its link brings the heading to the top, under the bar.
    await page.evaluate(() =>
      document.getElementById('reeksen')?.scrollIntoView({ behavior: 'instant', block: 'start' }),
    )

    await expect(current).toHaveCount(1)
    await expect(current).toHaveText('Reeksen')
    await expect(current).toHaveAttribute('aria-current', 'location')
  })

  test('puts the current link first in the row, and scrolls the row and not the page', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/cijfers')
    await hydrated(page)
    const current = page.locator('.hf-page-shortcuts [aria-current="location"]')

    await page.evaluate(() =>
      document.getElementById('reeksen')?.scrollIntoView({ behavior: 'instant', block: 'start' }),
    )
    await expect(current).toHaveText('Reeksen')
    const top = await page.evaluate(() => window.scrollY)

    // The start of the row, after the room for the fade and the ring, is where it snaps to.
    await expect
      .poll(() =>
        page.evaluate(() => {
          const row = document.querySelector('.hf-page-shortcuts .hf-page-shortcuts-row')
          const link = document.querySelector('.hf-page-shortcuts [aria-current="location"]')

          return row && link
            ? link.getBoundingClientRect().left -
                row.getBoundingClientRect().left -
                parseFloat(getComputedStyle(row).scrollPaddingLeft)
            : undefined
        }),
      )
      .toBeCloseTo(0, 0)
    expect(await page.evaluate(() => window.scrollY)).toBe(top)
    expect(await page.evaluate(() => document.scrollingElement?.scrollLeft)).toBe(0)
  })

  test('follows the page on down and up again, and has one current link at a time', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/cijfers')
    await hydrated(page)
    const current = page.locator('.hf-page-shortcuts [aria-current]')
    const to = (id: string) =>
      page.evaluate((target) => document.getElementById(target)?.scrollIntoView({ behavior: 'instant' }), id)

    for (const [id, name] of [
      ['thuis-en-uit', 'Thuis en uit'],
      ['de-nul-gehouden', 'De nul gehouden'],
      ['reeksen', 'Reeksen'],
      ['onze-plek-in-de-competitie', 'Plek in de competitie'],
    ] as const) {
      await to(id)
      await expect(current).toHaveText(name)
      await expect(current).toHaveCount(1)
    }

    await page.evaluate(() => window.scrollTo({ behavior: 'instant', top: 0 }))
    await expect(current).toHaveCount(0)
  })

  test('is the last link at the bottom of the page, where the last card cannot scroll to the line', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/cijfers')
    await hydrated(page)

    await page.evaluate(() => window.scrollTo({ behavior: 'instant', top: document.documentElement.scrollHeight }))

    await expect(page.locator('.hf-page-shortcuts [aria-current]')).toHaveText('Uitersten')
  })

  test('makes the link that is clicked the current one, and does not scroll the page from under the bar', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/cijfers')
    await hydrated(page)
    const bar = page.getByRole('navigation', { name: 'Op deze pagina:' })

    await bar.getByRole('link', { name: 'Hoe vaak welke uitslag' }).click()

    await expect(page).toHaveURL(/#hoe-vaak-welke-uitslag$/)
    await expect(bar.locator('[aria-current]')).toHaveText('Hoe vaak welke uitslag')
    await expect.poll(async () => (await bar.boundingBox())?.y).toBe(0)
    await expect(bar.locator('[aria-current]')).toHaveText('Hoe vaak welke uitslag')
  })

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`passes axe with a current link, with a line of 3 pixels under it in ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await page.setViewportSize({ height: 800, width: 390 })
      await page.goto('/cijfers')
      await page.evaluate(() => document.getElementById('reeksen')?.scrollIntoView({ behavior: 'instant' }))
      const current = page.locator('.hf-page-shortcuts [aria-current="location"]')

      await expect(current).toHaveText('Reeksen')
      await expect(current).toHaveCSS('text-decoration-line', 'underline')
      await expect(current).toHaveCSS('text-decoration-thickness', '3px')
      await expect(current).toHaveCSS('font-weight', '700')
      expect(await checkPage(page)).toEqual([])
    })
  }

  test('keeps the line of the current link in forced colours, and under the mouse', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/cijfers')
    await page.evaluate(() => document.getElementById('reeksen')?.scrollIntoView({ behavior: 'instant' }))
    const current = page.locator('.hf-page-shortcuts [aria-current="location"]')

    await expect(current).toHaveCSS('text-decoration-line', 'underline')
    await expect(current).toHaveCSS('text-decoration-thickness', '3px')

    await current.hover()

    await expect(current).toHaveCSS('text-decoration-thickness', '3px')
    await expect(current).toHaveCSS('text-underline-offset', /^5\.6/)
  })

  test('does not follow the page where the bar is gone', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 832 })
    await page.goto('/cijfers')
    await page.evaluate(() => document.getElementById('reeksen')?.scrollIntoView({ behavior: 'instant' }))

    await expect(page.locator('.hf-page-shortcuts [aria-current]')).toHaveCount(0)
  })
})

// The page Spelers has three cards, so its bar has three links. It is gone from 52rem on, like
// the other bars, because the cards then sit in the main column and the sidebar side by side.
test.describe('the bar under the header of /spelers', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`has four links on a phone, to the cards, and passes axe in ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await page.setViewportSize({ height: 800, width: 390 })
      await page.goto('/spelers')

      const bar = page.getByRole('navigation', { name: 'Op deze pagina:' })

      await expect(bar.getByRole('link')).toHaveCount(4)
      await bar.getByRole('link', { name: 'Selectie' }).click()
      await expect(page).toHaveURL(/#selectie$/)
      await bar.getByRole('link', { name: 'Doelpuntenmakers' }).click()
      await expect(page).toHaveURL(/#doelpuntenmakers$/)
      await bar.getByRole('link', { name: 'Alle tijden' }).click()
      await expect(page).toHaveURL(/#alle-tijden$/)
      await bar.getByRole('link', { name: 'Bijzondere doelpunten' }).click()
      await expect(page).toHaveURL(/#bijzondere-doelpunten$/)
      expect(await checkPage(page)).toEqual([])
    })
  }

  test('is gone, also for a screen reader, from 52rem on, and is there one pixel under it', async ({ page }) => {
    for (const [width, bar] of [
      [831, 1],
      [832, 0],
    ] as const) {
      await page.setViewportSize({ height: 800, width })
      await page.goto('/spelers')

      await expect(page.getByRole('navigation', { name: 'Op deze pagina:' })).toHaveCount(bar)
    }
  })

  test('is also on the page of an earlier season', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto(`/spelers/${earlierSeasonSlug()}`)

    await expect(page.getByRole('navigation', { name: 'Op deze pagina:' }).getByRole('link')).toHaveCount(4)
  })
})

test.describe('Spelers in the main menu', () => {
  test('is an item after Wedstrijden, and the current page on /spelers, not on /cijfers', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/cijfers')
    const menu = page.getByRole('navigation', { name: 'Hoofdmenu' })

    await expect(menu.getByRole('link', { name: 'Cijfers' })).toHaveAttribute('aria-current', 'page')
    await expect(menu.getByRole('link', { name: 'Spelers' })).not.toHaveAttribute('aria-current', /.*/)

    await menu.getByRole('link', { name: 'Spelers' }).click()

    await expect(page).toHaveURL(/\/spelers$/)
    await expect(menu.getByRole('link', { name: 'Spelers' })).toHaveAttribute('aria-current', 'page')
    await expect(menu.getByRole('link', { name: 'Cijfers' })).toHaveCount(0)
  })

  test('is left when the visitor goes on to Wedstrijden, which is then the current item', async ({ page }) => {
    await page.goto('/spelers')
    const menu = page.getByRole('navigation', { name: 'Hoofdmenu' })

    await menu.getByRole('link', { name: 'Wedstrijden' }).click()

    await expect(page).toHaveURL(/\/wedstrijden$/)
    await expect(menu.getByRole('link', { name: 'Wedstrijden' })).toHaveAttribute('aria-current', 'page')
    await expect(menu.getByRole('link', { name: 'Spelers' })).not.toHaveAttribute('aria-current', /.*/)
  })
})

test.describe('the bar under the header of the page of a club', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`passes axe on a phone in ${colorScheme}, and each link goes to a card of the page`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await page.setViewportSize({ height: 800, width: 390 })
      await page.goto('/tegenstanders/voorbeeld-united')

      const bar = page.getByRole('navigation', { name: 'Op deze pagina:' })

      await expect(bar).toBeVisible()

      const hrefs = await bar.getByRole('link').evaluateAll((links) => links.map((link) => link.getAttribute('href')))

      expect(hrefs.length).toBeGreaterThan(1)
      expect(hrefs[0]).toBe('#wedstrijden')
      expect(hrefs).toContain('#stadion')

      for (const href of hrefs) {
        await expect(page.locator(href ?? '#none')).toHaveCount(1)
      }
      expect(await checkPage(page)).toEqual([])
    })
  }

  test('is gone where the cards sit side by side', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 832 })
    await page.goto('/tegenstanders/voorbeeld-united')

    await expect(page.getByRole('navigation', { name: 'Op deze pagina:' })).toHaveCount(0)
  })
})
