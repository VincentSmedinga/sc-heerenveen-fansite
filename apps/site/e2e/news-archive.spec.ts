import { expect, type Page, test } from '@playwright/test'

import { checkPage } from './check-page'

// The sources of the filter on /nieuws are checkboxes in a form. A unit test can't see what the
// browser sends or where it goes: the addresses of a choice, that the button stays with
// JavaScript, that a keyboard can use the group, and that a choice starts at the first page.
const group = (page: Page) => page.getByRole('group', { name: 'Bronnen' })

test.describe('the sources on /nieuws without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('are unchecked, and the button Toon sends the checked ones to an address that can be shared', async ({
    page,
  }) => {
    await page.goto('/nieuws')

    await expect(group(page).getByRole('checkbox')).toHaveCount(3)
    await expect(group(page).getByRole('checkbox', { checked: true })).toHaveCount(0)

    await group(page).getByRole('checkbox', { name: 'Testkrant' }).check()
    await group(page).getByRole('checkbox', { name: 'Proefnieuws' }).check()
    // Nothing changes until the button is pressed.
    await expect(page).toHaveURL(/\/nieuws$/)
    await page.getByRole('button', { name: 'Toon' }).click()

    // The addresses follow the order of the form, which is the order of the list.
    await expect(page).toHaveURL(/\/nieuws\?bron=proefnieuws&bron=testkrant$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nieuws van Proefnieuws en Testkrant')
    await expect(group(page).getByRole('checkbox', { checked: true })).toHaveCount(2)
    await expect(page.getByText('Voorbeeldkrant, met dank aan de redactie')).toHaveCount(1)
  })

  test('with one source checked shows the name of the source on no line and in the heading', async ({ page }) => {
    await page.goto('/nieuws')
    await group(page).getByRole('checkbox', { name: 'Testkrant' }).check()
    await page.getByRole('button', { name: 'Toon' }).click()

    await expect(page).toHaveURL(/\/nieuws\?bron=testkrant$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nieuws van Testkrant')
    // The name is in the heading, the title and the label of the checkbox. On each line it is
    // only there for a screen reader.
    const lines = page.locator('main .hf-news-item-meta')

    await expect(lines.locator('span:not(.hf-visually-hidden)', { hasText: 'Testkrant' })).toHaveCount(0)
    await expect(lines.locator('.hf-visually-hidden', { hasText: 'Testkrant' })).not.toHaveCount(0)
    await expect(page).toHaveTitle(/^Nieuws van Testkrant/)
  })

  test('with every source checked is the page of all sources, and the pagination has no source', async ({ page }) => {
    await page.goto('/nieuws')
    for (const name of ['Proefnieuws', 'Testkrant', 'Voorbeeldkrant, met dank aan de redactie']) {
      await group(page).getByRole('checkbox', { name }).check()
    }
    await page.getByRole('button', { name: 'Toon' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nieuws')
    await expect(page).toHaveTitle(/^Nieuws( |$|\||–)/)
    await expect(page.getByRole('link', { name: 'Volgende' })).toHaveAttribute('href', '/nieuws?pagina=2')
  })

  test('has a choice that starts at the first page again, and a pagination that keeps the choice', async ({ page }) => {
    await page.goto('/nieuws?bron=proefnieuws&bron=testkrant&pagina=2')
    await page.getByRole('link', { name: 'Vorige' }).click()
    await expect(page).toHaveURL(/\/nieuws\?bron=proefnieuws&bron=testkrant$/)

    await page.getByRole('link', { name: 'Volgende' }).click()
    await expect(page).toHaveURL(/\/nieuws\?bron=proefnieuws&bron=testkrant&pagina=2$/)

    await group(page).getByRole('checkbox', { name: 'Proefnieuws' }).uncheck()
    await page.getByRole('button', { name: 'Toon' }).click()

    await expect(page).toHaveURL(/\/nieuws\?bron=testkrant$/)
  })
})

test.describe('the sources on /nieuws with JavaScript', () => {
  test('keep the button Toon, and a tick does not load the page again', async ({ page }) => {
    await page.goto('/nieuws')
    // A marker on the window is gone after a new load of the page.
    await page.evaluate(() => {
      ;(window as unknown as { marker?: boolean }).marker = true
    })
    await group(page).getByRole('checkbox', { name: 'Testkrant' }).check()

    await expect(page.getByRole('button', { name: 'Toon' })).toBeVisible()
    await expect(page).toHaveURL(/\/nieuws$/)
    expect(await page.evaluate(() => (window as unknown as { marker?: boolean }).marker)).toBe(true)
  })

  test('can be reached and used with the keyboard alone: Tab to a checkbox, Space to tick, Tab to the button, Enter', async ({
    page,
  }) => {
    await page.goto('/nieuws?bron=proefnieuws')
    await group(page).getByRole('checkbox', { name: 'Proefnieuws' }).focus()
    await expect(group(page).getByRole('checkbox', { name: 'Proefnieuws' })).toBeFocused()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Space')
    await expect(group(page).getByRole('checkbox', { name: 'Testkrant' })).toBeChecked()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Toon' })).toBeFocused()
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/nieuws\?bron=proefnieuws&bron=testkrant$/)
  })

  test('are checked as the address says, and pass the accessibility check', async ({ page }) => {
    await page.goto('/nieuws?bron=testkrant&bron=voorbeeldkrant')

    await expect(group(page).getByRole('checkbox', { name: 'Proefnieuws' })).not.toBeChecked()
    await expect(group(page).getByRole('checkbox', { name: 'Testkrant' })).toBeChecked()
    await expect(group(page).getByRole('checkbox', { name: /^Voorbeeldkrant/ })).toBeChecked()
    expect(await checkPage(page)).toEqual([])
  })
})
