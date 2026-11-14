import { expect, test } from '@playwright/test'

import { checkPage } from './check-page'
import { earlierSeasonSlug } from './earlier-season'
import { hydrated } from './hydrated'

// The pages in pages.spec.ts are checked in a window of 1280 pixels wide, where the bar under
// the header is gone (display: none). axe and the contrast of the bar need a window in which it
// shows, and the check of a window of 320 pixels needs the bar in its wrapped form. Both pages
// have the bar, with the links to their own cards: Wedstrijden seven (the made-up season has a
// last match, a result in three competitions and a head coach in the table; its results are of
// six clubs, so it has no card with our place per round) and Cijfers four, one for each group.
// The checks of how
// it behaves while scrolling are on /wedstrijden/cijfers below, the page with the long cards.
const withBar = [
  { links: 7, path: '/wedstrijden' },
  { links: 4, path: '/wedstrijden/cijfers' },
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

    test('is there exactly when the main has one column, at 51.9rem and at 52rem', async ({ page }) => {
      const columns = () =>
        page.locator('.hf-page-main').evaluate((main) => getComputedStyle(main).gridTemplateColumns.split(' ').length)

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

test.describe('the bar under the header of /wedstrijden/cijfers', () => {
  test('is not on the other pages', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 390 })

    for (const path of ['/', '/nieuws/podcasts', '/bronnen']) {
      await page.goto(path)

      await expect(page.locator('.hf-page-shortcuts')).toHaveCount(0)
    }
  })

  test('is left when the visitor goes on to another page, and comes back with the page', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/wedstrijden/cijfers')
    const menu = page.getByRole('navigation', { name: 'Hoofdmenu' })
    const bar = page.getByRole('navigation', { name: 'Op deze pagina:' })

    await expect(bar.getByRole('link')).toHaveCount(4)
    await menu.getByRole('link', { name: 'Nieuws' }).click()
    await expect(page).toHaveURL(/\/nieuws$/)
    await expect(page.locator('.hf-page-shortcuts')).toHaveCount(0)

    // Cijfers is in the bar under Wedstrijden.
    await menu.getByRole('link', { name: 'Wedstrijden' }).click()
    await menu.getByRole('link', { name: 'Cijfers' }).click()
    await expect(page).toHaveURL(/\/wedstrijden\/cijfers$/)
    await expect(bar.getByRole('link')).toHaveCount(4)

    // The other page with a bar has its own links, not those of the page before.
    await menu.getByRole('link', { name: 'Wedstrijden' }).click()
    await expect(page).toHaveURL(/\/wedstrijden$/)
    await expect(bar.getByRole('link', { name: 'Eredivisie' })).toBeVisible()
    await expect(bar.getByRole('link', { name: 'Uitslagen' })).toHaveCount(0)

    await menu.getByRole('link', { name: 'Cijfers' }).click()
    await expect(page).toHaveURL(/\/wedstrijden\/cijfers$/)
    await expect(bar.getByRole('link', { name: 'Uitslagen' })).toBeVisible()
    await expect(bar.getByRole('link', { name: 'Eredivisie' })).toHaveCount(0)
  })

  test('sticks to the top of the window, and a link brings its heading under the bar, not behind it', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/wedstrijden/cijfers')
    const bar = page.getByRole('navigation', { name: 'Op deze pagina:' })

    await page.evaluate(() => window.scrollTo({ behavior: 'instant', top: 1500 }))
    expect((await bar.boundingBox())?.y).toBe(0)

    await bar.getByRole('link', { name: 'Uitslagen' }).click()
    await expect(page).toHaveURL(/#uitslagen$/)
    await expect.poll(async () => (await page.locator('#uitslagen').boundingBox())?.y ?? 0).toBeGreaterThanOrEqual(47)
  })

  test('does not stick when it wraps at 320 pixels, where it would take too much of the window', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 320 })
    await page.goto('/wedstrijden/cijfers')

    await expect(page.locator('.hf-page-shortcuts')).toHaveCSS('position', 'static')
  })

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`keeps the link that Tab and Shift+Tab bring into view clear of the fade, in ${colorScheme}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme })
      await page.setViewportSize({ height: 800, width: 390 })
      await page.goto('/wedstrijden/cijfers')
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
      await walk('Tab', ['Uitslagen', 'Doelpunten', 'Rondom de wedstrijd'])
      await walk('Shift+Tab', ['Doelpunten', 'Uitslagen', 'Competitie'])
    })
  }

  test('brings the keyboard on to the group that a link points to', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/wedstrijden/cijfers')
    await page.getByRole('navigation', { name: 'Op deze pagina:' }).getByRole('link', { name: 'Uitslagen' }).click()
    await expect(page).toHaveURL(/#uitslagen$/)
    await page.keyboard.press('Tab')

    await expect(page.locator('#uitslagen .hf-heading-link')).toBeFocused()
  })

  test('has no current link at the top of the page, and the link to the card that came past last when scrolling', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/wedstrijden/cijfers')
    const bar = page.getByRole('navigation', { name: 'Op deze pagina:' })
    const current = bar.locator('[aria-current]')

    await hydrated(page)
    await expect(bar.getByRole('link').first()).toBeVisible()
    await expect(current).toHaveCount(0)

    // As a click on its link brings the heading to the top, under the bar.
    await page.evaluate(() =>
      document.getElementById('uitslagen')?.scrollIntoView({ behavior: 'instant', block: 'start' }),
    )

    await expect(current).toHaveCount(1)
    await expect(current).toHaveText('Uitslagen')
    await expect(current).toHaveAttribute('aria-current', 'location')
  })

  test('puts the current link first in the row, and scrolls the row and not the page', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/wedstrijden/cijfers')
    await hydrated(page)
    const current = page.locator('.hf-page-shortcuts [aria-current="location"]')

    await page.evaluate(() =>
      document.getElementById('uitslagen')?.scrollIntoView({ behavior: 'instant', block: 'start' }),
    )
    await expect(current).toHaveText('Uitslagen')
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
    await page.goto('/wedstrijden/cijfers')
    await hydrated(page)
    const current = page.locator('.hf-page-shortcuts [aria-current]')
    const to = (id: string) =>
      page.evaluate((target) => document.getElementById(target)?.scrollIntoView({ behavior: 'instant' }), id)

    for (const [id, name] of [
      ['uitslagen', 'Uitslagen'],
      ['doelpunten', 'Doelpunten'],
      ['rondom-de-wedstrijd', 'Rondom de wedstrijd'],
      ['competitie', 'Competitie'],
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
    await page.goto('/wedstrijden/cijfers')
    await hydrated(page)

    await page.evaluate(() => window.scrollTo({ behavior: 'instant', top: document.documentElement.scrollHeight }))

    await expect(page.locator('.hf-page-shortcuts [aria-current]')).toHaveText('Rondom de wedstrijd')
  })

  test('makes the link that is clicked the current one, and does not scroll the page from under the bar', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/wedstrijden/cijfers')
    await hydrated(page)
    const bar = page.getByRole('navigation', { name: 'Op deze pagina:' })

    await bar.getByRole('link', { name: 'Uitslagen' }).click()

    await expect(page).toHaveURL(/#uitslagen$/)
    await expect(bar.locator('[aria-current]')).toHaveText('Uitslagen')
    await expect.poll(async () => (await bar.boundingBox())?.y).toBe(0)
    await expect(bar.locator('[aria-current]')).toHaveText('Uitslagen')
  })

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`passes axe with a current link, with a line of 3 pixels under it in ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await page.setViewportSize({ height: 800, width: 390 })
      await page.goto('/wedstrijden/cijfers')
      await page.evaluate(() => document.getElementById('uitslagen')?.scrollIntoView({ behavior: 'instant' }))
      const current = page.locator('.hf-page-shortcuts [aria-current="location"]')

      await expect(current).toHaveText('Uitslagen')
      await expect(current).toHaveCSS('text-decoration-line', 'underline')
      await expect(current).toHaveCSS('text-decoration-thickness', '3px')
      await expect(current).toHaveCSS('font-weight', '700')
      expect(await checkPage(page)).toEqual([])
    })
  }

  test('keeps the line of the current link in forced colours, and under the mouse', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/wedstrijden/cijfers')
    await page.evaluate(() => document.getElementById('uitslagen')?.scrollIntoView({ behavior: 'instant' }))
    const current = page.locator('.hf-page-shortcuts [aria-current="location"]')

    await expect(current).toHaveCSS('text-decoration-line', 'underline')
    await expect(current).toHaveCSS('text-decoration-thickness', '3px')

    await current.hover()

    await expect(current).toHaveCSS('text-decoration-thickness', '3px')
    await expect(current).toHaveCSS('text-underline-offset', /^5\.6/)
  })

  test('does not follow the page where the bar is gone', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 832 })
    await page.goto('/wedstrijden/cijfers')
    await page.evaluate(() => document.getElementById('uitslagen')?.scrollIntoView({ behavior: 'instant' }))

    await expect(page.locator('.hf-page-shortcuts [aria-current]')).toHaveCount(0)
  })
})

// The figures of the players have two cards and, for a season with a match report that is
// klaar (the seed makes up one for the current season), three more, so the bar has five links
// or two. It is gone from 52rem on, like the other bars, because the cards then sit in the
// main column and the sidebar side by side.
test.describe('the bar under the header of /spelers/cijfers', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`has five links on a phone, to the cards, and passes axe in ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await page.setViewportSize({ height: 800, width: 390 })
      await page.goto('/spelers/cijfers')

      const bar = page.getByRole('navigation', { name: 'Op deze pagina:' })

      await expect(bar.getByRole('link')).toHaveCount(5)
      await bar.getByRole('link', { name: 'Doelpuntenmakers' }).click()
      await expect(page).toHaveURL(/#doelpuntenmakers$/)
      await bar.getByRole('link', { name: 'Alle spelers' }).click()
      await expect(page).toHaveURL(/#alle-spelers$/)
      await bar.getByRole('link', { name: 'Assists' }).click()
      await expect(page).toHaveURL(/#assists$/)
      await bar.getByRole('link', { name: 'Minuten' }).click()
      await expect(page).toHaveURL(/#minuten$/)
      await bar.getByRole('link', { name: 'Bijzondere doelpunten' }).click()
      await expect(page).toHaveURL(/#bijzondere-doelpunten$/)
      expect(await checkPage(page)).toEqual([])
    })
  }

  test('brings every click on a link in the bar to the page, also right after another', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/spelers/cijfers')

    const bar = page.getByRole('navigation', { name: 'Op deze pagina:' })

    // Forwards, then back and forth: each click follows the one before without a pause, while
    // the row of the bar is still scrolling the link of that click to its start.
    for (const [name, hash] of [
      ['Doelpuntenmakers', 'doelpuntenmakers'],
      ['Alle spelers', 'alle-spelers'],
      ['Assists', 'assists'],
      ['Minuten', 'minuten'],
      ['Bijzondere doelpunten', 'bijzondere-doelpunten'],
      ['Assists', 'assists'],
      ['Doelpuntenmakers', 'doelpuntenmakers'],
      ['Minuten', 'minuten'],
      ['Alle spelers', 'alle-spelers'],
    ] as const) {
      await bar.getByRole('link', { name }).click()
      await expect(page).toHaveURL(new RegExp(`#${hash}$`))
    }
  })

  test('is gone, also for a screen reader, from 52rem on, and is there one pixel under it', async ({ page }) => {
    for (const [width, bar] of [
      [831, 1],
      [832, 0],
    ] as const) {
      await page.setViewportSize({ height: 800, width })
      await page.goto('/spelers/cijfers')

      await expect(page.getByRole('navigation', { name: 'Op deze pagina:' })).toHaveCount(bar)
    }
  })

  test('is also on the page of an earlier season, with two links: it has no reports', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto(`/spelers/cijfers/${earlierSeasonSlug()}`)

    await expect(page.getByRole('navigation', { name: 'Op deze pagina:' }).getByRole('link')).toHaveCount(2)
  })
})

test.describe('the page /spelers', () => {
  test('has no bar "Op deze pagina:": it has one card', async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/spelers')

    await expect(page.getByRole('navigation', { name: 'Op deze pagina:' })).toHaveCount(0)
    expect(await checkPage(page)).toEqual([])
  })
})

test.describe('Spelers in the main menu', () => {
  test('is an item after Wedstrijden, and the current page on /spelers, not on /wedstrijden/cijfers', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/wedstrijden/cijfers')
    const menu = page.getByRole('navigation', { name: 'Hoofdmenu' })

    await expect(menu.getByRole('link', { name: 'Cijfers' })).toHaveAttribute('aria-current', 'page')
    await expect(menu.getByRole('link', { name: 'Spelers' })).not.toHaveAttribute('aria-current', /.*/)

    await menu.getByRole('link', { name: 'Spelers' }).click()

    await expect(page).toHaveURL(/\/spelers$/)
    await expect(menu.getByRole('link', { name: 'Spelers' })).toHaveAttribute('aria-current', 'page')
    // The Cijfers in the bar of Spelers are the figures of the players, not of the matches.
    await expect(menu.getByRole('link', { name: 'Cijfers' })).toHaveAttribute('href', '/spelers/cijfers')
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
