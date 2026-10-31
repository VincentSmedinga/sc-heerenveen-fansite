import { expect, type Page, test } from '@playwright/test'

import { checkPage } from './check-page'

// The podcasts of the filter on /nieuws/podcasts are checkboxes in a form, as the sources on
// /nieuws.
// A unit test can't see what the browser sends or where it goes: the addresses of a choice,
// that the button stays with JavaScript, and that a choice starts at the first page. The
// made-up podcasts are Proefpodcast (12 episodes) and Testpodcast (30), so together they fill
// two pages.
const group = (page: Page) => page.getByRole('group', { name: 'Podcasts' })

test.describe('the podcasts on /nieuws/podcasts without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('are unchecked, and the button Toon sends the checked one to an address that can be shared', async ({
    page,
  }) => {
    await page.goto('/nieuws/podcasts')

    await expect(group(page).getByRole('checkbox')).toHaveCount(2)
    await expect(group(page).getByRole('checkbox', { checked: true })).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 2, name: /^Over / })).toHaveCount(0)

    await group(page).getByRole('checkbox', { name: 'Testpodcast' }).check()
    // Nothing changes until the button is pressed.
    await expect(page).toHaveURL(/\/nieuws\/podcasts$/)
    await page.getByRole('button', { name: 'Toon' }).click()

    await expect(page).toHaveURL(/\/nieuws\/podcasts\?podcast=testpodcast$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Podcasts van Testpodcast')
    await expect(page.getByRole('heading', { level: 2, name: 'Over Testpodcast' })).toBeVisible()
    await expect(group(page).getByRole('checkbox', { name: 'Testpodcast' })).toBeChecked()
    await expect(page).toHaveTitle(/^Podcasts van Testpodcast/)
  })

  test('with one podcast checked shows its name on no line, and the card about it', async ({ page }) => {
    await page.goto('/nieuws/podcasts?podcast=testpodcast')

    // The name is in the heading, the title and the label of the checkbox. On each line it is
    // only there for a screen reader.
    const lines = page.locator('main .hf-news-item-meta')

    await expect(lines.locator('span:not(.hf-visually-hidden)', { hasText: 'Testpodcast' })).toHaveCount(0)
    await expect(lines.locator('.hf-visually-hidden', { hasText: 'Testpodcast' })).not.toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Testpodcast op Apple Podcasts' })).toBeVisible()
  })

  test('with every podcast checked is the page of all podcasts, and the pagination has no podcast', async ({
    page,
  }) => {
    await page.goto('/nieuws/podcasts')
    for (const name of ['Proefpodcast', 'Testpodcast']) {
      await group(page).getByRole('checkbox', { name }).check()
    }
    await page.getByRole('button', { name: 'Toon' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Podcasts')
    await expect(page.getByRole('heading', { level: 2, name: /^Over / })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Volgende' })).toHaveAttribute('href', '/nieuws/podcasts?pagina=2')
  })

  test('has a choice that starts at the first page again, and a pagination that keeps the choice', async ({ page }) => {
    await page.goto('/nieuws/podcasts?podcast=testpodcast&pagina=2')
    await page.getByRole('link', { name: 'Vorige' }).click()
    await expect(page).toHaveURL(/\/nieuws\/podcasts\?podcast=testpodcast$/)

    await page.getByRole('link', { name: 'Volgende' }).click()
    await expect(page).toHaveURL(/\/nieuws\/podcasts\?podcast=testpodcast&pagina=2$/)

    await group(page).getByRole('checkbox', { name: 'Testpodcast' }).uncheck()
    await group(page).getByRole('checkbox', { name: 'Proefpodcast' }).check()
    await page.getByRole('button', { name: 'Toon' }).click()

    await expect(page).toHaveURL(/\/nieuws\/podcasts\?podcast=proefpodcast$/)
  })
})

test.describe('the podcasts on /nieuws/podcasts with JavaScript', () => {
  test('keep the button Toon, and a tick does not load the page again', async ({ page }) => {
    await page.goto('/nieuws/podcasts')
    // A marker on the window is gone after a new load of the page.
    await page.evaluate(() => {
      ;(window as unknown as { marker?: boolean }).marker = true
    })
    await group(page).getByRole('checkbox', { name: 'Testpodcast' }).check()

    await expect(page.getByRole('button', { name: 'Toon' })).toBeVisible()
    await expect(page).toHaveURL(/\/nieuws\/podcasts$/)
    expect(await page.evaluate(() => (window as unknown as { marker?: boolean }).marker)).toBe(true)
  })

  test('can be reached and used with the keyboard alone: Tab to a checkbox, Space to tick, Tab to the button, Enter', async ({
    page,
  }) => {
    await page.goto('/nieuws/podcasts?podcast=proefpodcast')
    await group(page).getByRole('checkbox', { name: 'Proefpodcast' }).focus()
    await expect(group(page).getByRole('checkbox', { name: 'Proefpodcast' })).toBeFocused()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Space')
    await expect(group(page).getByRole('checkbox', { name: 'Testpodcast' })).toBeChecked()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Toon' })).toBeFocused()
    await page.keyboard.press('Enter')

    // The browser sends both, and both checked is every podcast: the heading, the canonical
    // address and the pagination have none.
    await expect(page).toHaveURL(/\/nieuws\/podcasts\?podcast=proefpodcast&podcast=testpodcast$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Podcasts')
  })

  test('are checked as the address says, and pass the accessibility check', async ({ page }) => {
    await page.goto('/nieuws/podcasts?podcast=testpodcast')

    await expect(group(page).getByRole('checkbox', { name: 'Proefpodcast' })).not.toBeChecked()
    await expect(group(page).getByRole('checkbox', { name: 'Testpodcast' })).toBeChecked()
    expect(await checkPage(page)).toEqual([])
  })
})
