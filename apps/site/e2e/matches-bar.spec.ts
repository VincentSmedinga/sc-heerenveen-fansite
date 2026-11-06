import { expect, type Page, test } from '@playwright/test'

import { earlierSeasonSlug } from './earlier-season'
import { hydrated } from './hydrated'

const slug = earlierSeasonSlug()

// The bar under the main menu on Wedstrijden keeps the choice between all matches and the
// Eredivisie in its link, and the items of the menu take the season of the page along. A unit
// test can't see that the link takes the visitor there, nor where the focus goes.
const menu = (page: Page) => page.getByRole('navigation', { name: 'Hoofdmenu' })
const bar = (page: Page, name: string) => menu(page).getByRole('link', { exact: true, name })

test.describe('the menu and the bar of Wedstrijden without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('has the bar of Tegenstanders on Wedstrijden and on the page of a season, with the plain address', async ({
    page,
  }) => {
    for (const path of ['/wedstrijden', `/wedstrijden/${slug}`]) {
      await page.goto(path)

      await expect(bar(page, 'Tegenstanders')).toHaveAttribute('href', '/tegenstanders')
      await expect(bar(page, 'Wedstrijden')).toHaveAttribute('aria-current', 'page')
    }
  })

  test('keeps the choice on Tegenstanders, where the switch is, and takes no season along', async ({ page }) => {
    await page.goto('/tegenstanders?competitie=eredivisie')

    await expect(bar(page, 'Tegenstanders')).toHaveAttribute('href', '/tegenstanders?competitie=eredivisie')
    await expect(bar(page, 'Tegenstanders')).toHaveAttribute('aria-current', 'page')
    await expect(bar(page, 'Wedstrijden')).toHaveAttribute('aria-current', 'true')
    await expect(bar(page, 'Statistieken')).not.toHaveAttribute('aria-current', /.*/)
  })

  test('takes the season, and not the choice, to the links of the main menu', async ({ page }) => {
    await page.goto(`/statistieken/${slug}?competitie=eredivisie`)

    await expect(bar(page, 'Statistieken')).toHaveAttribute('href', `/statistieken/${slug}`)
    await expect(bar(page, 'Wedstrijden')).toHaveAttribute('href', `/wedstrijden/${slug}`)
    await expect(bar(page, 'Spelers')).toHaveAttribute('href', `/spelers/${slug}`)
    await expect(bar(page, 'Statistieken')).toHaveAttribute('aria-current', 'page')
    await expect(menu(page).locator('.hf-navigation-bar')).toHaveCount(0)
  })

  test('takes the season from Spelers to Wedstrijden and Statistieken', async ({ page }) => {
    await page.goto(`/spelers/${slug}`)

    await expect(bar(page, 'Wedstrijden')).toHaveAttribute('href', `/wedstrijden/${slug}`)
    await expect(bar(page, 'Statistieken')).toHaveAttribute('href', `/statistieken/${slug}`)
  })

  test('marks Spelers as the only current item on /spelers, with no bar under the menu', async ({ page }) => {
    await page.goto('/spelers?competitie=eredivisie')

    await expect(menu(page).locator('[aria-current]')).toHaveCount(1)
    await expect(bar(page, 'Spelers')).toHaveAttribute('aria-current', 'page')
    await expect(menu(page).locator('.hf-navigation-bar')).toHaveCount(0)
  })
})

test.describe('the menu and the bar of Wedstrijden with JavaScript', () => {
  test('does not repeat a choice that the page does not know', async ({ page }) => {
    const response = await page.goto('/tegenstanders?competitie=onzin')

    expect(response?.status()).toBe(404)
    await expect(bar(page, 'Tegenstanders')).toHaveAttribute('href', '/tegenstanders')
  })

  test('keeps the keyboard order of the menu and the bar on the next page', async ({ page }) => {
    await page.goto('/wedstrijden')
    await hydrated(page)

    const names = () => menu(page).getByRole('link').allTextContents()

    expect(await names()).toEqual(['Nieuws', 'Wedstrijden', 'Tegenstanders', 'Statistieken', 'Spelers', 'Forum'])

    // The bar sits under Wedstrijden, so the keyboard goes from Wedstrijden to Tegenstanders
    // and on to Statistieken.
    await bar(page, 'Wedstrijden').focus()
    await page.keyboard.press('Tab')
    await expect(bar(page, 'Tegenstanders')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(bar(page, 'Statistieken')).toBeFocused()

    // A link of the menu loads a whole page (there is no next/link), so the focus starts at the
    // top, as it does after any link on the site.
    await bar(page, 'Tegenstanders').focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/tegenstanders$/)
    await expect(bar(page, 'Tegenstanders')).toHaveAttribute('aria-current', 'page')

    expect(await names()).toEqual(['Nieuws', 'Wedstrijden', 'Tegenstanders', 'Statistieken', 'Spelers', 'Forum'])

    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: /^sc Heerenveen Fansite/ })).toBeFocused()
  })
})
