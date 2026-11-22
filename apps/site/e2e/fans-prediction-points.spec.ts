import { expect, type Page, test } from '@playwright/test'

import { addPlayedPrediction, correctPlayedResult, removePlayedPrediction } from './admin'
import { checkPage } from './check-page'
import { sentMails } from './fake-mail'

// A supporter reads the points of a match after it has a result (#1449). The match is put in
// the database with the prediction, as the editors' result would be, because a supporter can
// only predict before the kick-off. The supporter predicted 1–1 at half-time and 3–1 at the
// end, and the match ended 1–0 at half-time and 2–1.

const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`

/** Makes an account with the code from the fake mail server, and stays logged in. */
async function signUp(page: Page) {
  const id = unique()
  const address = `punten-${id}@example.org`

  await page.goto('/fans/aanmelden')
  await page.getByLabel('Schermnaam').fill(`Punten ${id}`.slice(0, 20))
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

test('shows the points of a played match, and corrects them when the result is corrected', async ({ page }) => {
  const address = await signUp(page)
  const matchId = await addPlayedPrediction(address, `Punten ${unique()}`)

  try {
    await page.goto('/fans/prognose')

    // The list: the prediction, and the points in the head of the card.
    const list = page.getByRole('region', { name: 'Jouw voorspellingen' })

    await expect(list.getByRole('heading', { name: /Jouw voorspellingen: 17 punten ?, 1 voorspelling/ })).toBeVisible()
    await expect(list.getByText('Jouw voorspelling: eind 3–1, goed, rust 1–1, goed')).toBeAttached()

    // The card of the match: why each part gave its points, and the total.
    const points = page.getByRole('region', { name: 'Je punten' })

    await expect(points.getByRole('table', { name: 'Hoe je punten tellen' })).toBeVisible()
    await expect(points.getByText('Goals van sc Heerenveen goed 2')).toBeVisible()
    await expect(points.getByText('Goede uitslag 10, goals van Puntenploeg goed 5')).toBeVisible()
    await checkPage(page)

    // A corrected score corrects the points at once: 3–1 against 2–2 gives nothing.
    await correctPlayedResult(matchId, 2, 2)
    await page.goto('/fans/prognose')
    await expect(list.getByRole('heading', { name: /Jouw voorspellingen: 2 punten ?, 1 voorspelling/ })).toBeVisible()
  } finally {
    await removePlayedPrediction(matchId)
  }
})
