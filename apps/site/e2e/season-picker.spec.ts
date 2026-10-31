import { expect, type Page, test } from '@playwright/test'

import { checkPage } from './check-page'
import { earlierSeason, earlierSeasonSlug } from './earlier-season'
import { hydrated } from './hydrated'

const earlier = earlierSeason()
const slug = earlierSeasonSlug()

// The list of seasons, by its label: exactly Seizoen, and not the card Verloop van het seizoen.
const listOf = (page: Page) => page.getByRole('combobox', { exact: true, name: 'Seizoen' })

// The season picker next to the title of /wedstrijden, /statistieken and /statistieken/spelers,
// which share it: it works without JavaScript, with JavaScript it changes the page as soon as a
// season is chosen, and a keyboard can reach every season without the page changing at each
// arrow key.
const pickerPages = [
  { heading: 'Wedstrijden', path: '/wedstrijden' },
  { heading: 'Statistieken', path: '/statistieken' },
  { heading: 'Spelers', path: '/statistieken/spelers' },
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
