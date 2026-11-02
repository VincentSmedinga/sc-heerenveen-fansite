import { expect, test } from '@playwright/test'

import { earlierSeasonSlug } from './earlier-season'

const slug = earlierSeasonSlug()

// The switch of the card Stand between the whole season and the latest five matches is two
// links, so it works without JavaScript, and the choice is in the address. The seed has the
// results of every club for the current season. An earlier season has no switch.
test.describe('the switch of the card Stand without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('is reached with the keyboard, and the link shows the latest five matches', async ({ page }) => {
    await page.goto('/wedstrijden')

    const choices = page.getByRole('group', { name: 'Welke stand' })

    await expect(choices.getByRole('link', { name: 'Hele seizoen' })).toHaveAttribute('aria-current', 'page')
    await choices.getByRole('link', { name: 'Hele seizoen' }).focus()
    await page.keyboard.press('Tab')
    await expect(choices.getByRole('link', { name: 'Laatste 5' })).toBeFocused()
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/wedstrijden\?stand=laatste-5#stand$/)
    await expect(choices.getByRole('link', { name: 'Laatste 5' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('table', { name: /^Stand over de laatste vijf wedstrijden op / })).toBeVisible()
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/wedstrijden$/)
  })

  test('falls back to the whole season for a value that is not known', async ({ page }) => {
    await page.goto('/wedstrijden?stand=onzin')

    await expect(
      page.getByRole('group', { name: 'Welke stand' }).getByRole('link', { name: 'Hele seizoen' }),
    ).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('table', { name: /^Stand op / })).toBeVisible()
  })

  test('is not on the card Eindstand of an earlier season, which shows the whole season for ?stand=laatste-5', async ({
    page,
  }) => {
    await page.goto(`/wedstrijden/${slug}?stand=laatste-5`)

    await expect(page.getByRole('group', { name: 'Welke stand' })).toHaveCount(0)
    await expect(page.getByRole('table', { name: /^Eindstand op / })).toBeVisible()
  })
})
