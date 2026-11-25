import { expect, type Page, test } from '@playwright/test'

import { checkPage } from './check-page'
import { sentMails } from './fake-mail'

// A supporter predicts the half-time and the full-time score of the next match (#1447). The
// made-up data has a match that began an hour ago (the live report, Testdorp FC) and one in
// three days (Proefstad SV): the page shows the first as closed and the second open under it.
// Each test makes an account of its own, so a second run finds no prediction that is there
// already. The tests fill the form of the next match, behind "Voorspellen".

const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`

/** The code of the last mail to one address, once the site has handed it over. */
async function codeTo(address: string, count: number) {
  await expect.poll(() => sentMails().filter((mail) => mail.includes(`To: ${address}`)).length).toBe(count)

  const mail = sentMails().findLast((one) => one.includes(`To: ${address}`)) ?? ''

  return /^(\d{6})$/m.exec(mail)?.[1] ?? ''
}

/** Opens the form of the next match, which stands behind the button Voorspellen. */
async function openForm(page: Page) {
  await page.goto('/fans/prognose')
  await page.getByText('Voorspellen', { exact: true }).click()
}

/** Makes an account with the code from the fake mail server, and stays logged in. */
async function signUp(page: Page) {
  const id = unique()
  const address = `voorspel-${id}@example.org`

  await page.goto('/fans/aanmelden')
  await page.getByLabel('Schermnaam').fill(`Voorspel ${id}`.slice(0, 20))
  await page.getByLabel('E-mailadres').fill(address)
  await page.getByRole('button', { name: 'Account maken' }).click()
  await expect(page).toHaveURL(/\/fans\/aanmelden\/verstuurd\?ref=/)
  await expect.poll(() => sentMails().filter((mail) => mail.includes(`To: ${address}`)).length).toBe(1)

  const mail = sentMails().find((one) => one.includes(`To: ${address}`)) ?? ''

  await page.getByLabel('Code uit de mail').fill(/^(\d{6})$/m.exec(mail)?.[1] ?? '')
  await page.getByRole('button', { name: 'Doorgaan' }).click()
  await expect(page).toHaveURL(/\/fans\?welkom=1$/)

  return address
}

const field = (page: Page, row: 'Eindstand' | 'Ruststand', club: string) =>
  page.getByRole('textbox', { name: `${row} ${club}` })

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('predicts, reads the notice, and changes the prediction', async ({ page }) => {
    await signUp(page)
    await openForm(page)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Prognose')
    await expect(page.getByRole('button', { name: 'Voorspelling opslaan' })).toBeVisible()

    await field(page, 'Ruststand', 'sc Heerenveen').fill('1')
    await field(page, 'Ruststand', 'Proefstad SV').fill('0')
    await field(page, 'Eindstand', 'sc Heerenveen').fill('2')
    await field(page, 'Eindstand', 'Proefstad SV').fill('1')
    await page.getByRole('button', { name: 'Voorspelling opslaan' }).click()

    await expect(
      page.getByText('Je voorspelling staat. Rust 1–0, eind 2–1. Je kunt hem wijzigen tot de aftrap.'),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Wijziging opslaan' })).toBeVisible()

    // The form keeps what was predicted, also on a new visit.
    await openForm(page)
    await expect(field(page, 'Eindstand', 'sc Heerenveen')).toHaveValue('2')
    await field(page, 'Eindstand', 'sc Heerenveen').fill('3')
    await page.getByRole('button', { name: 'Wijziging opslaan' }).click()

    await expect(page.getByText('Je voorspelling is gewijzigd. Rust 1–0, eind 3–1.')).toBeVisible()
  })

  test('logs in on the page itself: the fold stays open after an error, and the code leads back', async ({ page }) => {
    const address = await signUp(page)

    await page.context().clearCookies()
    await openForm(page)
    await page.getByRole('button', { name: 'Stuur me een link' }).click()

    // The page came back with the error, and the fold of the next match is open.
    await expect(page).toHaveURL(/\/fans\/prognose$/)
    await expect(page.getByRole('region', { name: 'Kijk nog even naar 1 ding' }).getByRole('link')).toHaveText([
      'Vul je e-mailadres in.',
    ])
    await expect(page.getByLabel('E-mailadres')).toBeVisible()

    await page.getByLabel('E-mailadres').fill(address)
    await page.getByRole('button', { name: 'Stuur me een link' }).click()
    await expect(page).toHaveURL(/\/fans\/inloggen\/verstuurd\?ref=.*terug=%2Ffans%2Fprognose/)
    await page.getByLabel('Code uit de mail').fill(await codeTo(address, 2))
    await page.getByRole('button', { name: 'Doorgaan' }).click()
    await expect(page).toHaveURL(/\/fans\/prognose$/)
  })

  test('shows an error at the field that is empty, and keeps the other numbers', async ({ page }) => {
    await signUp(page)
    await openForm(page)
    await field(page, 'Ruststand', 'sc Heerenveen').fill('1')
    await field(page, 'Ruststand', 'Proefstad SV').fill('0')
    await field(page, 'Eindstand', 'sc Heerenveen').fill('2')
    await page.getByRole('button', { name: 'Voorspelling opslaan' }).click()

    // The three numbers that were filled in are still in the form, which stays open.
    await expect(field(page, 'Ruststand', 'sc Heerenveen')).toHaveValue('1')
    await expect(field(page, 'Ruststand', 'Proefstad SV')).toHaveValue('0')
    await expect(field(page, 'Eindstand', 'sc Heerenveen')).toHaveValue('2')
    await expect(field(page, 'Eindstand', 'Proefstad SV')).toHaveValue('')

    const summary = page.getByRole('region', { name: 'Er ontbreekt nog iets' })

    await expect(summary.getByRole('link')).toHaveText(['Vul de goals van Proefstad SV bij de eindstand in.'])
    await expect(page.getByText('Je voorspelling staat.')).toHaveCount(0)

    // Nothing was stored: a new visit has an empty form.
    await openForm(page)
    await expect(field(page, 'Eindstand', 'sc Heerenveen')).toHaveValue('')
  })
})

test('asks a visitor to log in, and comes back to the page after logging in', async ({ page }) => {
  await page.goto('/fans/prognose')
  // The match that began is closed; the way in stands behind the button of the next match.
  await page.getByText('Voorspellen', { exact: true }).click()
  await expect(page.getByText('Log in om te voorspellen.')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Volgende wedstrijd' })).toBeVisible()
  await expect(page.getByText('Gesloten')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Ruststand sc Heerenveen' })).toHaveCount(0)
  await checkPage(page)
})

test('predicts with the form of the page, and the focus goes to the summary after an error', async ({ page }) => {
  await signUp(page)
  await page.goto('/fans/prognose')

  // The match that began is closed, without a prediction; the next one is open behind a button.
  await expect(page.getByText('De wedstrijd is begonnen. Na de rust zie je je eerste punten.')).toBeVisible()
  await expect(page.getByText('Je hebt niet voorspeld.')).toBeVisible()
  await page.getByText('Voorspellen', { exact: true }).click()
  await checkPage(page)
  await page.getByRole('button', { name: 'Voorspelling opslaan' }).click()

  const summary = page.getByRole('region', { name: 'Er ontbreekt nog iets' })

  await expect(summary).toBeFocused()
  await expect(summary.getByRole('link')).toHaveCount(4)
  await summary.getByRole('link').first().click()
  await expect(field(page, 'Ruststand', 'sc Heerenveen')).toBeFocused()

  await field(page, 'Ruststand', 'sc Heerenveen').fill('0')
  await field(page, 'Ruststand', 'Proefstad SV').fill('0')
  await field(page, 'Eindstand', 'sc Heerenveen').fill('1')
  await field(page, 'Eindstand', 'Proefstad SV').fill('1')
  await page.getByRole('button', { name: 'Voorspelling opslaan' }).click()
  await expect(page.getByText('Je voorspelling staat. Rust 0–0, eind 1–1.')).toBeVisible()
  await checkPage(page)
})
