import type { Page } from '@playwright/test'

import { expect, test } from '@playwright/test'

import { checkPage } from './check-page'
import { sentMails } from './fake-mail'

/** Fills in the form with a valid message, with the marker in the text so the test can find its own mail. */
async function fillIn(page: Page, marker: string) {
  await page.getByLabel('Naam').fill('Jan de Vries')
  await page.getByLabel('E-mailadres').fill('jan@example.org')
  await page.getByLabel('Onderwerp').selectOption({ label: 'Een bericht laten verwijderen' })
  await page.getByLabel('Link naar het bericht').fill('https://example.org/artikel')
  await page.getByLabel('Bericht', { exact: true }).fill(`Dit artikel moet weg. ${marker}`)
}

const mailsWith = (marker: string) => sentMails().filter((mail) => mail.includes(marker))

test.describe('without JavaScript', () => {
  // The form is a plain POST with a confirmation on its own address. Nothing else would notice if a change broke that.
  test.use({ javaScriptEnabled: false })

  test('sends the message, shows the confirmation on its own address, and sends nothing again on reload', async ({
    page,
  }) => {
    await page.goto('/contact')
    await fillIn(page, 'zonder-javascript')
    await page.getByRole('button', { name: 'Versturen' }).click()

    await expect(page).toHaveURL(/\/contact\/verstuurd$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bericht verstuurd')
    await expect(page.getByText('Bedankt, we hebben je bericht ontvangen.')).toBeVisible()

    const [mail, ...others] = mailsWith('zonder-javascript')

    expect(others).toEqual([])
    expect(mail).toMatch(/^Subject: Contact: Een bericht laten verwijderen$/m)
    expect(mail).toMatch(/^Reply-To: jan@example\.org$/m)
    expect(mail).toMatch(/^To: fansite@heerenveen\.org$/m)
    expect(mail).toContain('Naam: Jan de Vries')
    expect(mail).toContain('Link: https://example.org/artikel')
    expect(mail).toContain('Dit artikel moet weg. zonder-javascript')

    await page.reload()

    await expect(page.getByText('Bedankt, we hebben je bericht ontvangen.')).toBeVisible()
    expect(mailsWith('zonder-javascript')).toHaveLength(1)
  })

  test('shows the errors in text, keeps what was filled in, and sends nothing', async ({ page }) => {
    await page.goto('/contact')
    await page.getByLabel('E-mailadres').fill('jan')
    await page.getByLabel('Bericht', { exact: true }).fill('Dit is geen mail zonder-javascript-fout')
    await page.getByRole('button', { name: 'Versturen' }).click()

    const summary = page.getByRole('region', { name: 'Er is iets mis' })

    await expect(summary).toBeVisible()
    await expect(summary.getByRole('link')).toHaveText([
      'Dit is geen e-mailadres. Schrijf het zo: naam@voorbeeld.nl.',
      'Kies een onderwerp uit de lijst.',
    ])
    await expect(page.getByLabel('E-mailadres')).toHaveValue('jan')
    await expect(page.getByLabel('Bericht', { exact: true })).toHaveValue('Dit is geen mail zonder-javascript-fout')
    expect(mailsWith('zonder-javascript-fout')).toEqual([])
  })
})

test('with JavaScript it sends the message and shows the confirmation', async ({ page }) => {
  await page.goto('/contact')
  await fillIn(page, 'met-javascript')
  await page.getByRole('button', { name: 'Versturen' }).click()

  await expect(page).toHaveURL(/\/contact\/verstuurd$/)
  await expect(page.getByText('Bedankt, we hebben je bericht ontvangen.')).toBeVisible()
  expect(mailsWith('met-javascript')).toHaveLength(1)
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the errors pass axe in ${colorScheme}, and the keyboard reaches them and every field`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/contact')

    await page.getByRole('button', { name: 'Versturen' }).focus()
    await page.keyboard.press('Enter')

    const summary = page.getByRole('region', { name: 'Er is iets mis' })

    await expect(summary).toBeFocused()
    await expect(summary.getByRole('link')).toHaveCount(3)
    await expect(page.locator('#e-mail-error')).toContainText('Vul je e-mailadres in')
    await expect(page.getByLabel('E-mailadres')).toHaveAttribute('aria-invalid', 'true')

    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('E-mailadres')).toBeFocused()

    expect(await checkPage(page)).toEqual([])
  })
}
