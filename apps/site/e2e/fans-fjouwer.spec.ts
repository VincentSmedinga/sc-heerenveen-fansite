import { expect, type Page, test } from '@playwright/test'

import { checkPage } from './check-page'
import { sentMails } from './fake-mail'

// A supporter chooses four players for the next match (#1469). The made-up data has a squad of
// the season with all four lines and a match in three days (Proefstad SV), which the page
// shows. Each test makes an account of its own, so a second run finds no four that is there
// already.

const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`

/** Makes an account with the code from the fake mail server, and stays logged in. */
async function signUp(page: Page) {
  const id = unique()
  const address = `fjouwer-${id}@example.org`

  await page.goto('/fans/aanmelden')
  await page.getByLabel('Schermnaam').fill(`Fjouwer ${id}`.slice(0, 20))
  await page.getByLabel('E-mailadres').fill(address)
  await page.getByRole('button', { name: 'Account maken' }).click()
  await expect(page).toHaveURL(/\/fans\/aanmelden\/verstuurd\?ref=/)
  await expect.poll(() => sentMails().filter((mail) => mail.includes(`To: ${address}`)).length).toBe(1)

  const mail = sentMails().find((one) => one.includes(`To: ${address}`)) ?? ''

  await page.getByLabel('Code uit de mail').fill(/^(\d{6})$/m.exec(mail)?.[1] ?? '')
  await page.getByRole('button', { name: 'Doorgaan' }).click()
  await expect(page).toHaveURL(/\/fans\?welkom=1$/)
}

/** The checkbox of a player, by the start of his name. */
const player = (page: Page, name: string) => page.getByRole('checkbox', { name: new RegExp(`^${name}`) })

const goodFour = ['Tjerk Brandsma', 'Daan Boerema', 'Milan Reitsma', 'Sjoerd Altena']

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('chooses four, reads the notice, and changes the four', async ({ page }) => {
    await signUp(page)
    await page.goto('/fans/fjouwer')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fjouwer')
    await expect(page.getByRole('button', { name: 'Opslaan' })).toBeVisible()

    for (const name of goodFour) {
      await player(page, name).check()
    }

    await page.getByRole('button', { name: 'Opslaan' }).click()

    await expect(page.getByText(/^Je vier staan\. Je kunt ze wijzigen tot .+ uur\.$/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Wijziging opslaan' })).toBeVisible()
    await expect(player(page, 'Tjerk Brandsma')).toBeChecked()

    // A new visit keeps the four, and a change replaces it.
    await page.goto('/fans/fjouwer')
    await expect(player(page, 'Sjoerd Altena')).toBeChecked()
    await player(page, 'Sjoerd Altena').uncheck()
    await player(page, 'Jesse Postma').check()
    await page.getByRole('button', { name: 'Wijziging opslaan' }).click()
    await expect(page.getByText(/^Je vier staan\./)).toBeVisible()
    await expect(player(page, 'Jesse Postma')).toBeChecked()
    await expect(player(page, 'Sjoerd Altena')).not.toBeChecked()
  })

  test('shows the error at the line that is full, and keeps what was ticked', async ({ page }) => {
    await signUp(page)
    await page.goto('/fans/fjouwer')

    for (const name of ['Daan Boerema', 'Ruben ten Hove', 'Stijn de Haan', 'Sjoerd Altena']) {
      await player(page, name).check()
    }

    await page.getByRole('button', { name: 'Opslaan' }).click()

    const summary = page.getByRole('region', { name: 'Je keuze klopt nog niet' })

    await expect(summary.getByRole('link')).toHaveText(['Kies hoogstens 2 verdedigers.'])
    await expect(player(page, 'Stijn de Haan')).toBeChecked()
    await expect(page.getByText('Je vier staan.')).toHaveCount(0)

    // Nothing was stored: a new visit has nothing ticked.
    await page.goto('/fans/fjouwer')
    await expect(player(page, 'Daan Boerema')).not.toBeChecked()
  })

  test('refuses five players, and asks for four', async ({ page }) => {
    await signUp(page)
    await page.goto('/fans/fjouwer')

    for (const name of [...goodFour, 'Jesse Postma']) {
      await player(page, name).check()
    }

    await page.getByRole('button', { name: 'Opslaan' }).click()
    await expect(page.getByRole('region', { name: 'Je keuze klopt nog niet' }).getByRole('link')).toHaveText([
      'Kies 4 spelers. Je hebt er nu 5.',
    ])
  })
})

test('asks a visitor to log in, and has no list of players', async ({ page }) => {
  await page.goto('/fans/fjouwer')
  await expect(page.getByRole('heading', { level: 2, name: 'Jouw vier' })).toBeVisible()
  await expect(page.getByText('Log in om je vier te kiezen.')).toBeVisible()
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await checkPage(page)
})

test('chooses four with the page, counts what is ticked, and the focus goes to the summary after an error', async ({
  page,
}) => {
  await signUp(page)
  await page.goto('/fans/fjouwer')
  await checkPage(page)
  await expect(page.getByText('0 van 4 gekozen')).toBeVisible()
  await player(page, 'Tjerk Brandsma').check()
  await expect(page.getByText('1 van 4 gekozen')).toBeVisible()
  await page.getByRole('button', { name: 'Opslaan' }).click()

  const summary = page.getByRole('region', { name: 'Je keuze klopt nog niet' })

  await expect(summary).toBeFocused()
  await summary.getByRole('link').first().click()
  await expect(player(page, 'Tjerk Brandsma')).toBeFocused()
  await checkPage(page)

  for (const name of goodFour.slice(1)) {
    await player(page, name).check()
  }

  await expect(page.getByText('4 van 4 gekozen')).toBeVisible()
  await page.getByRole('button', { name: 'Opslaan' }).click()
  await expect(page.getByText(/^Je vier staan\./)).toBeVisible()
  await checkPage(page)
})
