import { expect, type Page, test } from '@playwright/test'

import { addRatingMatch, ratingPlayers } from './admin'
import { checkPage } from './check-page'
import { sentMails } from './fake-mail'

// A supporter gives the players of the last match a grade (#1470). The match is put in the
// database with a finished report of three players, because the made-up data has no played
// match that is the last one. The account is made older than the match by the same helper.
// Each test makes an account of its own.

const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`

/** Makes an account with the code from the fake mail server, and stays logged in. */
async function signUp(page: Page) {
  const id = unique()
  const address = `cijfers-${id}@example.org`

  await page.goto('/fans/aanmelden')
  await page.getByLabel('Schermnaam').fill(`Cijfers ${id}`.slice(0, 20))
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

const scale = (page: Page, player: string) => page.getByRole('group', { name: `Cijfer voor ${player}` })

const give = (page: Page, player: string, grade: number) =>
  scale(page, player).getByText(String(grade), { exact: true }).click()

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('gives grades, refuses a gap and keeps the other grades, and changes them', async ({ page }) => {
    const address = await signUp(page)
    const remove = await addRatingMatch(address)

    try {
      await page.goto('/fans/uitblinker')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uitblinker')
      await expect(page.getByRole('heading', { level: 2, name: 'Geef je cijfers' })).toBeVisible()
      await expect(page.getByText('Cijferploeg')).toBeVisible()
      await expect(page.getByText('te gaan')).toHaveCount(0)

      // A gap: the middle player has no grade. The other two stay, and nothing is stored.
      await give(page, ratingPlayers[0], 7)
      await give(page, ratingPlayers[2], 1)
      await page.getByRole('button', { name: 'Cijfers opslaan' }).click()

      const summary = page.getByRole('region', { name: 'Nog 1 cijfer' })

      await expect(summary.getByRole('link')).toHaveText(['Geef Cijfer Keeper een cijfer.'])
      await expect(page.getByText('Je andere cijfers staan nog ingevuld.')).toBeVisible()
      await expect(scale(page, ratingPlayers[0]).getByRole('radio', { name: '7' })).toBeChecked()
      await expect(scale(page, ratingPlayers[2]).getByRole('radio', { exact: true, name: '1' })).toBeChecked()
      await expect(page.getByText('Je kunt ze wijzigen tot')).toBeVisible()

      await give(page, ratingPlayers[1], 10)
      await page.getByRole('button', { name: 'Cijfers opslaan' }).click()

      // After the save only the supporter's own grades show, and the form is gone.
      await expect(page.getByRole('status').filter({ hasText: 'Je kunt ze wijzigen tot' })).toBeVisible()
      await expect(page.getByRole('table', { name: 'Jouw cijfers' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Jij' })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'Gem' })).toHaveCount(0)
      await expect(page.getByRole('radio')).toHaveCount(0)

      // Wijzigen shows the form with the grades that were stored.
      await page.getByRole('button', { name: 'Wijzigen' }).click()
      await expect(scale(page, ratingPlayers[1]).getByRole('radio', { name: '10' })).toBeChecked()
      await give(page, ratingPlayers[1], 4)
      await page.getByRole('button', { name: 'Cijfers opslaan' }).click()
      await expect(
        page.getByRole('table', { name: 'Jouw cijfers' }).getByRole('row', { name: /Keeper/ }),
      ).toContainText('4')
    } finally {
      await remove()
    }
  })
})

test('shows a visitor the way in and no form', async ({ page }) => {
  const address = await signUp(page)
  const remove = await addRatingMatch(address)

  try {
    await page.context().clearCookies()
    await page.goto('/fans/uitblinker')
    await expect(page.getByRole('heading', { level: 2, name: 'Doe mee' })).toBeVisible()
    await expect(page.getByRole('radio')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Account maken' })).toBeVisible()
    await checkPage(page)
  } finally {
    await remove()
  }
})

test('counts the grades that are left, and puts the focus on the summary after a gap', async ({ page }) => {
  const address = await signUp(page)
  const remove = await addRatingMatch(address)

  try {
    await page.goto('/fans/uitblinker')
    await expect(page.getByText('Nog 3 van 3 te gaan')).toBeVisible()
    await checkPage(page)
    await give(page, ratingPlayers[0], 6)
    await expect(page.getByText('Nog 2 van 3 te gaan')).toBeVisible()
    await page.getByRole('button', { name: 'Cijfers opslaan' }).click()

    const summary = page.getByRole('region', { name: 'Nog 2 cijfers' })

    await expect(summary).toBeFocused()
    await expect(summary.getByRole('link')).toHaveCount(2)
    await summary.getByRole('link').first().click()
    await expect(scale(page, ratingPlayers[1]).getByRole('radio').first()).toBeFocused()
    await expect(scale(page, ratingPlayers[0]).getByRole('radio', { name: '6' })).toBeChecked()
    await checkPage(page)

    await give(page, ratingPlayers[1], 8)
    await give(page, ratingPlayers[2], 9)
    await page.getByRole('button', { name: 'Cijfers opslaan' }).click()
    await expect(page.getByRole('table', { name: 'Jouw cijfers' })).toBeVisible()
    await checkPage(page)
  } finally {
    await remove()
  }
})
