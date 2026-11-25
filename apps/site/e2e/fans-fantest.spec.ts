import { expect, type Page, test } from '@playwright/test'

import { forgetSignUps } from './admin'
import { checkPage } from './check-page'
import { sentMails } from './fake-mail'

// A supporter does the Fantest of the running month once and reads the score (#1482). The
// made-up quiz of the month has the right answer (index % 4) + 1 (see fantest.ts). The test
// makes an account of its own, so a second run finds no answers that are there already.

const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`

/** Makes an account with the code from the fake mail server, and stays logged in. */
async function signUp(page: Page) {
  const id = unique()
  const address = `fantest-${id}@example.org`

  // The whole site takes only so many sign-ups an hour, and the checks share one database. So
  // this check starts with none counted and leaves none behind.
  await forgetSignUps()
  await page.goto('/fans/aanmelden')
  await page.getByLabel('Schermnaam').fill(`Fantest ${id}`.slice(0, 20))
  await page.getByLabel('E-mailadres').fill(address)
  await page.getByRole('button', { name: 'Account maken' }).click()
  await expect(page).toHaveURL(/\/fans\/aanmelden\/verstuurd\?ref=/)
  await expect.poll(() => sentMails().filter((mail) => mail.includes(`To: ${address}`)).length).toBe(1)

  const mail = sentMails().find((one) => one.includes(`To: ${address}`)) ?? ''

  await page.getByLabel('Code uit de mail').fill(/^(\d{6})$/m.exec(mail)?.[1] ?? '')
  await page.getByRole('button', { name: 'Doorgaan' }).click()
  await expect(page).toHaveURL(/\/fans\?welkom=1$/)
  await forgetSignUps()
}

const question = (page: Page, number: number) =>
  page.getByRole('group', { name: `Redactievraag ${number} over Testclub?` })

// The radio button covers its whole row and is invisible to the eye, so the check goes to it.
const choose = (page: Page, number: number) =>
  question(page, number).getByRole('radio', { name: 'Testantwoord A' }).check()

for (const javaScriptEnabled of [false, true]) {
  test.describe(javaScriptEnabled ? 'with JavaScript' : 'without JavaScript', () => {
    test.use({ javaScriptEnabled })

    test('signs up, does the quiz once and reads the score', async ({ page }) => {
      await page.goto('/fans/fantest')
      await expect(page.getByRole('button', { name: 'Stuur me een link' })).toBeVisible()
      await expect(page.getByRole('radio')).toHaveCount(0)

      await signUp(page)
      await page.goto('/fans/fantest')

      for (const number of [1, 2, 3, 4, 6, 7, 8, 9, 10]) {
        await choose(page, number)
      }
      await page.getByRole('button', { name: 'Verstuur mijn antwoorden' }).click()
      await expect(page.getByRole('heading', { name: 'Nog 1 vraag zonder antwoord' })).toBeVisible()
      await expect(question(page, 5).getByText('Kies een antwoord bij vraag 5.')).toBeVisible()
      await expect(question(page, 1).getByRole('radio', { name: 'Testantwoord A' })).toBeChecked()
      if (javaScriptEnabled) {
        await expect(page.locator('#fantest-fouten')).toBeFocused()
        // axe needs JavaScript in the page.
        expect(await checkPage(page)).toEqual([])
      }

      // A second tab with the same form, which is sent after the first.
      const other = await page.context().newPage()

      await other.goto('/fans/fantest')
      for (let number = 1; number <= 10; number += 1) {
        await choose(other, number)
      }

      await choose(page, 5)
      await page.getByRole('button', { name: 'Verstuur mijn antwoorden' }).click()
      // "A" is right for the questions 1, 5 and 9.
      await expect(page.getByText('3 van 10', { exact: true })).toBeVisible()
      await expect(page.getByRole('status').filter({ hasText: 'Je antwoorden zijn verstuurd.' })).toBeVisible()
      await expect(page.getByRole('radio')).toHaveCount(0)
      await expect(page.getByText('Goed.')).toHaveCount(0)
      if (javaScriptEnabled) {
        expect(await checkPage(page)).toEqual([])
      }

      await other.getByRole('button', { name: 'Verstuur mijn antwoorden' }).click()
      await expect(other.getByText('Je hebt al meegedaan aan deze Fantest.')).toBeVisible()
      await expect(other.getByText('3 van 10', { exact: true })).toBeVisible()

      await page.goto('/fans/mijn-account/gegevens')
      await expect(page.getByRole('rowheader', { name: /: score$/ })).toBeVisible()
    })
  })
}
