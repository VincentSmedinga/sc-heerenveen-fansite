import { expect, type Page, test } from '@playwright/test'

import { checkPage } from './check-page'
import { earlierSeason, earlierSeasonSlug } from './earlier-season'
import { hydrated } from './hydrated'

const earlier = earlierSeason()
const slug = earlierSeasonSlug()

// The list of seasons, by its label: exactly Seizoen, and not the card Verloop van het seizoen.
const listOf = (page: Page) => page.getByRole('combobox', { exact: true, name: 'Seizoen' })

// The season picker next to the title of /wedstrijden, /cijfers and /spelers,
// which share it: it works without JavaScript, with JavaScript it changes the page as soon as a
// season is chosen, and a keyboard can reach every season without the page changing at each
// arrow key.
const pickerPages = [
  { heading: 'Wedstrijden', path: '/wedstrijden' },
  { heading: 'Cijfers', path: '/cijfers' },
  { heading: 'Spelers', path: '/spelers' },
] as const

for (const { heading, path } of pickerPages) {
  test.describe(`the season picker without JavaScript on ${path}`, () => {
    test.use({ javaScriptEnabled: false })

    test('has the button Toon, and the button takes the visitor to the page of the season', async ({ page }) => {
      await page.goto(path)

      const picker = page.getByRole('form', { name: 'Seizoen kiezen' })

      await expect(picker.getByRole('button', { name: 'Toon' })).toBeVisible()
      await listOf(page).selectOption(slug)
      // Nothing changes until the button is pressed.
      await expect(page).toHaveURL(new RegExp(`${path}$`))
      await picker.getByRole('button', { name: 'Toon' }).click()

      await expect(page).toHaveURL(new RegExp(`${path}/${slug}$`))
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading)
      await expect(listOf(page)).toHaveValue(slug)
    })

    test('works with the keyboard alone: the list, then the button', async ({ page }) => {
      await page.goto(path)
      await listOf(page).focus()
      // A letter or digit jumps to the season that starts with it, on every system.
      await page.keyboard.type(slug.slice(0, 4))
      await expect(listOf(page)).toHaveValue(slug)
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: 'Toon' })).toBeFocused()
      await page.keyboard.press('Enter')

      await expect(page).toHaveURL(new RegExp(`${path}/${slug}$`))
    })

    test('goes back to the page from the route for a value that is no season', async ({ page }) => {
      await page.goto(`${path}/kies?seizoen=onzin`)

      await expect(page).toHaveURL(new RegExp(`${path}$`))
    })
  })

  test.describe(`the season picker with JavaScript on ${path}`, () => {
    test('hides the button and tells before a choice that the page changes at once', async ({ page }) => {
      await page.goto(path)

      const list = listOf(page)

      await expect(page.getByRole('button', { name: 'Toon' })).toBeHidden()
      await expect(list).toHaveAccessibleDescription(/De pagina wisselt direct van seizoen/)
    })

    test('changes the page at once when a season is chosen with the mouse', async ({ page }) => {
      await page.goto(path)
      await listOf(page).selectOption(slug)

      await expect(page).toHaveURL(new RegExp(`${path}/${slug}$`))
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading)
    })

    test('does not change the page at the keys that choose, and changes it at Enter', async ({ page }) => {
      await page.goto(path)

      const list = listOf(page)
      const address = page.url()

      await list.focus()
      await page.keyboard.type(slug.slice(0, 4))
      // The list shows the season that the keys chose, and the page is where it was.
      await expect(list).toHaveValue(slug)
      await page.waitForTimeout(500)
      expect(page.url()).toBe(address)

      await page.keyboard.press('Enter')

      await expect(page).toHaveURL(new RegExp(`${path}/${slug}$`))
    })

    test('puts the season of the page back when the keyboard leaves the list without Enter', async ({ page }) => {
      await page.goto(path)

      const list = listOf(page)
      const current = await list.inputValue()

      await list.focus()
      await page.keyboard.type(slug.slice(0, 4))
      await page.keyboard.press('Tab')

      await expect(list).toHaveValue(current)
      expect(page.url()).toMatch(new RegExp(`${path}$`))
    })

    test('shows the earlier season with the picker on it, and the season in the title', async ({ page }) => {
      await page.goto(`${path}/${slug}`)

      await expect(page).toHaveTitle(new RegExp(`${heading} ${earlier}`))
      await expect(listOf(page)).toHaveValue(slug)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path}/${slug}$`))
      await expect(page.getByRole('heading', { level: 2, name: 'Programma' })).toHaveCount(0)
    })

    test('sends the current season address to the page itself', async ({ page }) => {
      const current = await (async () => {
        await page.goto(path)

        return listOf(page).inputValue()
      })()

      await page.goto(`${path}/${current}`)

      await expect(page).toHaveURL(new RegExp(`${path}$`))
    })
  })
}

test.describe('the title row with the season picker', () => {
  for (const [width, beside] of [
    // Narrower than a phone, so the row has to wrap: the heading, the space and the list are
    // 279 pixels wide, and 300 pixels leaves 268.
    [300, false],
    [320, true],
    [390, true],
    [900, true],
  ] as const) {
    test(`is on the right, ${beside ? 'beside' : 'under'} the title at ${width} pixels, and does not scroll the page`, async ({
      page,
    }) => {
      await page.setViewportSize({ height: 900, width })
      await page.goto(`/wedstrijden/${slug}`)
      await hydrated(page)

      const heading = (await page.getByRole('heading', { level: 1 }).boundingBox())!
      const picker = (await page.getByRole('form', { name: 'Seizoen kiezen' }).boundingBox())!
      const row = (await page.locator('.hf-page-title').boundingBox())!

      // On the right of the row, either way.
      expect(picker.x + picker.width).toBeCloseTo(row.x + row.width, 0)
      expect(beside ? picker.y < heading.y + heading.height : picker.y >= heading.y + heading.height).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    })
  }

  test('has targets of 44 pixels high', async ({ page }) => {
    await page.goto(`/wedstrijden/${slug}`)

    const list = (await listOf(page).boundingBox())!

    expect(list.height).toBeGreaterThanOrEqual(44)
  })

  for (const colorScheme of ['light', 'dark'] as const) {
    for (const width of [390, 900]) {
      test(`passes axe at ${width} pixels in ${colorScheme}, also on the page of an earlier season`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme })
        await page.setViewportSize({ height: 900, width })
        await page.goto(`/wedstrijden/${slug}`)

        expect(await checkPage(page)).toEqual([])
      })
    }
  }
})

// Measures the open list of a select in the page. The list is a popover that the browser
// draws for the select, so it has no box to measure. A point on its border or padding hits
// the select, outside the field itself: that finds the top and bottom (on a line through
// the padding at the left of the options), then the left and right (on a line through the
// middle of the list).
const measureMenu = (select: HTMLSelectElement) => {
  const options = [...select.options].map((option) => option.getBoundingClientRect())
  const first = options[0]!
  const chosen = select.selectedOptions[0]!.getBoundingClientRect()
  const field = select.getBoundingClientRect()
  const isList = (x: number, y: number) =>
    document.elementFromPoint(x, y) === select &&
    !(x >= field.left && x <= field.right && y >= field.top && y <= field.bottom)
  const rows: number[] = []
  const columns: number[] = []

  for (let y = 0; y < window.innerHeight; y++) {
    if (isList(first.left - 1, y)) {
      rows.push(y)
    }
  }

  const middle = Math.round((rows[0]! + rows.at(-1)!) / 2)

  for (let x = 0; x < window.innerWidth; x++) {
    if (isList(x, middle)) {
      columns.push(x)
    }
  }

  return {
    bottom: rows.at(-1)! + 1,
    chosen: { bottom: chosen.bottom, top: chosen.top },
    left: columns[0]!,
    longest: Math.max(...options.map((option) => option.height)),
    optionsHeight: options.reduce((sum, option) => sum + option.height, 0),
    right: columns.at(-1)! + 1,
    shortest: Math.min(...options.map((option) => option.height)),
    top: rows[0]!,
  }
}

// The open list of the season picker has the look of the site (`appearance: base-select`), and
// the rules in select.css keep it inside the screen: it is measured here, on a phone, at 400%
// zoom and on a low phone. The page has few seasons, so thirty more are added to the list.
test.describe('the open list of the season picker', () => {
  const longText = 'Een seizoen met een allerlangste tekst die in de lijst over meer regels moet gaan'

  test('stays inside the screen, scrolls when it is longer, shows the chosen season and opens upward when there is more room above', async ({
    page,
  }) => {
    for (const { height, width } of [
      { height: 844, width: 390 },
      { height: 256, width: 320 },
      { height: 400, width: 390 },
    ]) {
      await page.setViewportSize({ height, width })
      await page.goto('/wedstrijden')
      await hydrated(page)

      const list = listOf(page)

      await list.evaluate(
        (select: HTMLSelectElement, { lowerBy, text }) => {
          for (let year = 2000; year < 2030; year++) {
            const season = `${year}-${String(year + 1).slice(2)}`

            select.add(new Option(year === 2010 ? `${season}, ${text}` : season, season))
          }

          select.value = '2005-06'
          // On the low phone the field sits lower on the page, as it does with a larger title
          // or another row above it, so there is more room above than below.
          select.closest('form')!.style.marginBlockStart = `${lowerBy}px`
        },
        { lowerBy: height < 500 ? 180 : 0, text: longText },
      )

      await list.click()
      await expect.poll(() => list.evaluate((select) => select.matches(':open'))).toBe(true)

      // Playwright scrolls the field into view to click it; from here on the page stays where
      // it is.
      const scrolled = await page.evaluate(() => window.scrollY)

      // The browser scrolls the chosen season into view just after it opens the list, and a
      // slow machine measures before that has happened.
      await expect
        .poll(() =>
          list.evaluate((select: HTMLSelectElement) => {
            const { bottom, top } = select.selectedOptions[0]!.getBoundingClientRect()

            return top >= 0 && bottom <= window.innerHeight
          }),
        )
        .toBe(true)

      const field = (await list.boundingBox())!
      const menu = await list.evaluate(measureMenu)

      // Inside the screen on every side, and at least as wide as the field.
      expect(menu.left).toBeGreaterThanOrEqual(0)
      expect(menu.right).toBeLessThanOrEqual(width)
      expect(menu.top).toBeGreaterThanOrEqual(0)
      expect(menu.bottom).toBeLessThanOrEqual(height)
      expect(menu.right - menu.left).toBeGreaterThanOrEqual(field.width)
      // Options keep a target of 44 pixels, and a long text wraps instead of widening the list.
      expect(menu.shortest).toBeGreaterThanOrEqual(44)
      expect(menu.longest).toBeGreaterThan(44)
      // The list is longer than the room, so it scrolls itself, and the page behind it does
      // not.
      expect(menu.optionsHeight).toBeGreaterThan(menu.bottom - menu.top)
      // The chosen season is in view.
      expect(menu.chosen.top).toBeGreaterThanOrEqual(menu.top)
      expect(menu.chosen.bottom).toBeLessThanOrEqual(menu.bottom)
      // The list opens where there is more room: above the field on the low phone, where the
      // field sits lower on the page.
      const roomAbove = field.y
      const roomBelow = height - field.y - field.height

      if (height === 400) {
        expect(roomAbove).toBeGreaterThan(roomBelow)
      }

      // With about as much room on both sides either is right: only a clear difference counts.
      if (Math.abs(roomAbove - roomBelow) < 16) {
        expect(menu.top >= field.y + field.height || menu.bottom <= field.y + 1).toBe(true)
      } else if (roomAbove > roomBelow) {
        expect(menu.bottom).toBeLessThanOrEqual(field.y)
      } else {
        expect(menu.top).toBeGreaterThanOrEqual(field.y + field.height)
      }

      // The keyboard goes to the last season: the option with focus scrolls into view in the
      // list.
      await page.keyboard.press('End')

      const focused = await list.evaluate((select: HTMLSelectElement) => {
        const { bottom, top } = select.querySelector('option:focus-visible')!.getBoundingClientRect()

        return { bottom, top }
      })

      expect(focused.top).toBeGreaterThanOrEqual(menu.top)
      expect(focused.bottom).toBeLessThanOrEqual(menu.bottom)
      expect(await page.evaluate(() => window.scrollY)).toBe(scrolled)

      await page.keyboard.press('Escape')
    }
  })

  // The short menu and the two situations of the list that does not fit below: measured with
  // the field at a place on the page, by a margin above it.
  const open = async (page: Page, { count, height, lowerBy }: { count: number; height: number; lowerBy: number }) => {
    await page.setViewportSize({ height, width: 390 })
    await page.goto('/wedstrijden')
    await hydrated(page)

    const list = listOf(page)

    await list.evaluate(
      (select: HTMLSelectElement, { count, lowerBy }) => {
        for (let year = 2000; year < 2000 + count; year++) {
          const season = `${year}-${String(year + 1).slice(2)}`

          select.add(new Option(season, season))
        }

        select.closest('form')!.style.marginBlockStart = `${lowerBy}px`
      },
      { count, lowerBy },
    )
    await list.click()
    await expect.poll(() => list.evaluate((select) => select.matches(':open'))).toBe(true)

    const field = (await list.boundingBox())!
    const menu = await list.evaluate(measureMenu)

    return { field, menu, roomAbove: field.y, roomBelow: height - field.y - field.height }
  }

  test('opens a short list below the field, also when there is more room above', async ({ page }) => {
    const { field, menu, roomAbove, roomBelow } = await open(page, { count: 0, height: 844, lowerBy: 150 })

    expect(roomAbove).toBeGreaterThan(roomBelow)
    expect(menu.optionsHeight).toBeLessThan(roomBelow)
    expect(menu.top).toBeGreaterThanOrEqual(field.y + field.height)
    expect(menu.bottom).toBeLessThanOrEqual(844)
    expect(menu.optionsHeight).toBeLessThanOrEqual(menu.bottom - menu.top)
  })

  test('opens above the field, without scrolling, when the list does not fit below but does fit above', async ({
    page,
  }) => {
    const { field, menu, roomAbove, roomBelow } = await open(page, { count: 6, height: 844, lowerBy: 480 })

    expect(menu.optionsHeight).toBeGreaterThan(roomBelow)
    expect(menu.optionsHeight).toBeLessThan(roomAbove)
    expect(menu.bottom).toBeLessThanOrEqual(field.y)
    expect(menu.top).toBeGreaterThanOrEqual(0)
    expect(menu.optionsHeight).toBeLessThanOrEqual(menu.bottom - menu.top)
  })

  test('opens a list that fits nowhere on the side with most room, a little below the middle too', async ({ page }) => {
    const { field, menu, roomAbove, roomBelow } = await open(page, { count: 30, height: 600, lowerBy: 100 })

    expect(menu.optionsHeight).toBeGreaterThan(Math.max(roomAbove, roomBelow))
    expect(roomBelow).toBeLessThan(roomAbove)
    expect(menu.bottom).toBeLessThanOrEqual(field.y)
    expect(menu.top).toBeGreaterThanOrEqual(0)
    expect(menu.bottom - menu.top).toBeLessThanOrEqual(roomAbove)
  })
})
