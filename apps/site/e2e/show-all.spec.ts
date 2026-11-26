import { expect, type Page, test } from '@playwright/test'

// The button "Toon alle" (#1690) hides rows with CSS where script is on, which the unit tests
// cannot see. The card "Seizoen voor seizoen" has more than five seasons in the made-up data.

const path = '/wedstrijden/cijfers/alle'

const card = (page: Page) => page.getByRole('region', { name: 'Seizoen voor seizoen' })
const button = (page: Page) => card(page).locator('.hf-show-all-button')

/** How many rows of the table there are, and how many of them show. */
async function rows(page: Page) {
  const all = card(page).locator('tbody tr')

  return { all: await all.count(), shown: await all.filter({ visible: true }).count() }
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('shows every season and no button', async ({ page }) => {
    await page.goto(path)

    const { all, shown } = await rows(page)

    expect(all).toBeGreaterThan(5)
    expect(shown).toBe(all)
    await expect(button(page)).toBeHidden()
  })
})

test('shows five seasons, the rest on the button, and keeps the focus in view', async ({ page }) => {
  await page.goto(path)

  const { all } = await rows(page)

  expect((await rows(page)).shown).toBe(5)
  await expect(button(page)).toHaveText(`Toon alle ${all} seizoenen`)

  // Retries until the page has hydrated and the button listens.
  await expect(async () => {
    await button(page).click()
    await expect(button(page)).toHaveAttribute('aria-expanded', 'true', { timeout: 1000 })
  }).toPass()
  expect((await rows(page)).shown).toBe(all)
  await expect(button(page)).toHaveText('Toon minder')

  // A low window, with the button at its top edge: closing takes the rows above it away.
  await page.setViewportSize({ height: 300, width: 390 })
  await button(page).evaluate((element) => element.scrollIntoView({ block: 'start' }))
  await button(page).press('Enter')

  expect((await rows(page)).shown).toBe(5)
  await expect(button(page)).toHaveAttribute('aria-expanded', 'false')
  await expect(button(page)).toBeFocused()
  await expect(button(page)).toBeInViewport()
})
