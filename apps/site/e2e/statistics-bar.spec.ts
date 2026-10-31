import { expect, type Page, test } from '@playwright/test'

import { earlierSeasonSlug } from './earlier-season'
import { hydrated } from './hydrated'

const slug = earlierSeasonSlug()

// The bar under the main menu on Statistieken keeps the season and the choice between all
// matches and the Eredivisie in its links. A unit test can't see that the link takes the
// visitor there, nor where the focus goes when the bar is replaced by the one of the next page.
const menu = (page: Page) => page.getByRole('navigation', { name: 'Hoofdmenu' })
const bar = (page: Page, name: string) => menu(page).getByRole('link', { exact: true, name })

test.describe('the bar of Statistieken without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('takes the season and the choice from the page of a season to Spelers', async ({ page }) => {
    await page.goto(`/statistieken/${slug}?competitie=eredivisie`)

    await expect(bar(page, 'Spelers')).toHaveAttribute('href', `/statistieken/spelers/${slug}?competitie=eredivisie`)
    await expect(bar(page, 'Tegenstanders')).toHaveAttribute(
      'href',
      '/statistieken/tegenstanders?competitie=eredivisie',
    )
    await bar(page, 'Spelers').click()

    await expect(page).toHaveURL(new RegExp(`/statistieken/spelers/${slug}\\?competitie=eredivisie$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Spelers')
    await expect(bar(page, 'Spelers')).toHaveAttribute('aria-current', 'page')
    await expect(bar(page, 'Spelers')).toHaveAttribute('href', `/statistieken/spelers/${slug}?competitie=eredivisie`)
    await expect(
      page.getByRole('group', { name: 'Welke wedstrijden' }).getByRole('link', { name: 'Eredivisie' }),
    ).toHaveAttribute('aria-current', 'page')
  })

  test('leaves the links of the main menu as they are, whatever the page', async ({ page }) => {
    await page.goto(`/statistieken/${slug}?competitie=eredivisie`)

    await expect(menu(page).getByRole('link', { name: 'Statistieken' })).toHaveAttribute('href', '/statistieken')
    await expect(menu(page).getByRole('link', { name: 'Wedstrijden' })).toHaveAttribute('href', '/wedstrijden')
    await expect(menu(page).getByRole('link', { name: 'Statistieken' })).toHaveAttribute('aria-current', 'page')
  })

  test('has the plain addresses for the current season without a choice, as before', async ({ page }) => {
    await page.goto('/statistieken')

    await expect(bar(page, 'Spelers')).toHaveAttribute('href', '/statistieken/spelers')
    await expect(bar(page, 'Tegenstanders')).toHaveAttribute('href', '/statistieken/tegenstanders')
  })

  test('keeps the choice from Spelers to Tegenstanders and back', async ({ page }) => {
    await page.goto('/statistieken/spelers?competitie=eredivisie')
    await bar(page, 'Tegenstanders').click()

    await expect(page).toHaveURL(/\/statistieken\/tegenstanders\?competitie=eredivisie$/)
    await expect(bar(page, 'Tegenstanders')).toHaveAttribute('aria-current', 'page')
    await expect(bar(page, 'Spelers')).toHaveAttribute('href', '/statistieken/spelers?competitie=eredivisie')
  })
})

test.describe('the bar of Statistieken with JavaScript', () => {
  test('does not repeat a choice that the page does not know', async ({ page }) => {
    const response = await page.goto(`/statistieken/${slug}?competitie=onzin`)

    expect(response?.status()).toBe(404)
    await expect(bar(page, 'Spelers')).toHaveAttribute('href', `/statistieken/spelers/${slug}`)
  })

  test('takes the season and the choice to Spelers, and the bar follows the next page', async ({ page }) => {
    await page.goto(`/statistieken/${slug}?competitie=eredivisie`)
    await hydrated(page)
    await bar(page, 'Spelers').click()

    await expect(page).toHaveURL(new RegExp(`/statistieken/spelers/${slug}\\?competitie=eredivisie$`))
    await expect(bar(page, 'Spelers')).toHaveAttribute('aria-current', 'page')
    await expect(menu(page).getByRole('link', { name: 'Statistieken' })).toHaveAttribute('aria-current', 'true')
    await expect(menu(page).locator('.hf-navigation-bar')).toHaveCount(1)
  })

  test('keeps the keyboard order of the menu and the bar on the next page', async ({ page }) => {
    await page.goto('/statistieken?competitie=eredivisie')
    await hydrated(page)

    const names = () => menu(page).getByRole('link').allTextContents()
    const order = ['Nieuws', 'Wedstrijden', 'Statistieken', 'Spelers', 'Tegenstanders', 'Forum']

    expect(await names()).toEqual(order)

    // Every link of the site loads a whole page (there is no next/link), so the bar is new with
    // the page and the focus starts at the top, as it does after any link on the site.
    await bar(page, 'Spelers').focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/statistieken\/spelers\?competitie=eredivisie$/)
    await expect(bar(page, 'Spelers')).toHaveAttribute('aria-current', 'page')

    expect(await names()).toEqual(order)

    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: /^sc Heerenveen Fansite/ })).toBeFocused()

    await bar(page, 'Spelers').focus()
    await page.keyboard.press('Tab')
    await expect(bar(page, 'Tegenstanders')).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Shift+Tab')
    await expect(menu(page).getByRole('link', { name: 'Statistieken' })).toBeFocused()
  })
})
