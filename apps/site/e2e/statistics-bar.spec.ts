import { expect, type Page, test } from '@playwright/test'

import { earlierSeasonSlug } from './earlier-season'
import { hydrated } from './hydrated'

const slug = earlierSeasonSlug()

// The bar under the main menu on Statistieken keeps the choice between all matches and the
// Eredivisie in its link, and the items of the menu take the season of the page along. A unit
// test can't see that the link takes the visitor there, nor where the focus goes.
const menu = (page: Page) => page.getByRole('navigation', { name: 'Hoofdmenu' })
const bar = (page: Page, name: string) => menu(page).getByRole('link', { exact: true, name })

test.describe('the menu and the bar of Statistieken without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('takes the choice to Tegenstanders, and the season, not the choice, to Spelers', async ({ page }) => {
    await page.goto(`/statistieken/${slug}?competitie=eredivisie`)

    await expect(bar(page, 'Tegenstanders')).toHaveAttribute(
      'href',
      '/statistieken/tegenstanders?competitie=eredivisie',
    )
    await expect(bar(page, 'Spelers')).toHaveAttribute('href', `/spelers/${slug}`)
    await bar(page, 'Spelers').click()

    await expect(page).toHaveURL(new RegExp(`/spelers/${slug}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Spelers')
    await expect(bar(page, 'Spelers')).toHaveAttribute('aria-current', 'page')
    await expect(bar(page, 'Statistieken')).not.toHaveAttribute('aria-current', /.*/)
    await expect(menu(page).locator('.hf-navigation-bar')).toHaveCount(0)
  })

  test('takes the season, and not the choice, to the links of the main menu', async ({ page }) => {
    await page.goto(`/statistieken/${slug}?competitie=eredivisie`)

    await expect(menu(page).getByRole('link', { name: 'Statistieken' })).toHaveAttribute(
      'href',
      `/statistieken/${slug}`,
    )
    await expect(menu(page).getByRole('link', { name: 'Wedstrijden' })).toHaveAttribute('href', `/wedstrijden/${slug}`)
    await expect(menu(page).getByRole('link', { name: 'Spelers' })).toHaveAttribute('href', `/spelers/${slug}`)
    await expect(menu(page).getByRole('link', { name: 'Statistieken' })).toHaveAttribute('aria-current', 'page')
  })

  test('takes the season from Spelers to Wedstrijden and Statistieken', async ({ page }) => {
    await page.goto(`/spelers/${slug}`)

    await expect(bar(page, 'Wedstrijden')).toHaveAttribute('href', `/wedstrijden/${slug}`)
    await expect(bar(page, 'Statistieken')).toHaveAttribute('href', `/statistieken/${slug}`)
  })

  test('has the plain addresses for the current season without a choice, as before', async ({ page }) => {
    await page.goto('/statistieken')

    await expect(bar(page, 'Spelers')).toHaveAttribute('href', '/spelers')
    await expect(bar(page, 'Tegenstanders')).toHaveAttribute('href', '/statistieken/tegenstanders')
  })

  test('marks Spelers as the only current item on /spelers, with no bar under the menu', async ({ page }) => {
    await page.goto('/spelers?competitie=eredivisie')

    await expect(menu(page).locator('[aria-current]')).toHaveCount(1)
    await expect(bar(page, 'Spelers')).toHaveAttribute('aria-current', 'page')
    await expect(menu(page).locator('.hf-navigation-bar')).toHaveCount(0)
    await expect(bar(page, 'Statistieken')).toHaveAttribute('href', '/statistieken')
  })
})

test.describe('the menu and the bar of Statistieken with JavaScript', () => {
  test('does not repeat a choice that the page does not know', async ({ page }) => {
    const response = await page.goto(`/statistieken/${slug}?competitie=onzin`)

    expect(response?.status()).toBe(404)
    await expect(bar(page, 'Tegenstanders')).toHaveAttribute('href', '/statistieken/tegenstanders')
  })

  test('takes the season to Spelers, which is the current item and has no bar', async ({ page }) => {
    await page.goto(`/statistieken/${slug}`)
    await hydrated(page)
    await bar(page, 'Spelers').click()

    await expect(page).toHaveURL(new RegExp(`/spelers/${slug}$`))
    await expect(bar(page, 'Spelers')).toHaveAttribute('aria-current', 'page')
    await expect(menu(page).locator('[aria-current]')).toHaveCount(1)
    await expect(menu(page).locator('.hf-navigation-bar')).toHaveCount(0)
  })

  test('keeps the keyboard order of the menu and the bar on the next page', async ({ page }) => {
    await page.goto('/statistieken?competitie=eredivisie')
    await hydrated(page)

    const names = () => menu(page).getByRole('link').allTextContents()

    expect(await names()).toEqual(['Nieuws', 'Wedstrijden', 'Statistieken', 'Tegenstanders', 'Spelers', 'Forum'])

    // The bar sits under Statistieken, so the keyboard goes from Tegenstanders to Spelers.
    await bar(page, 'Tegenstanders').focus()
    await page.keyboard.press('Tab')
    await expect(bar(page, 'Spelers')).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Shift+Tab')
    await expect(menu(page).getByRole('link', { name: 'Statistieken' })).toBeFocused()

    // A link of the menu loads a whole page (there is no next/link), so the focus starts at the
    // top, as it does after any link on the site.
    await bar(page, 'Spelers').focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/spelers$/)
    await expect(bar(page, 'Spelers')).toHaveAttribute('aria-current', 'page')

    expect(await names()).toEqual(['Nieuws', 'Wedstrijden', 'Statistieken', 'Spelers', 'Forum'])

    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: /^sc Heerenveen Fansite/ })).toBeFocused()
  })
})
