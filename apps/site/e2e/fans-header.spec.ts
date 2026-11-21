import { expect, test } from '@playwright/test'

import { sentMails } from './fake-mail'

// The account button in the header of every page (issue 1450). It is the link Inloggen in the
// HTML for everybody, and shows the initials and goes to Mijn account once a page under /fans
// has told the browser a supporter is logged in. Each test makes an account of its own.

const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`

async function codeTo(address: string) {
  await expect.poll(() => sentMails().filter((mail) => mail.includes(`To: ${address}`)).length).toBe(1)

  return /^(\d{6})$/m.exec(sentMails().find((mail) => mail.includes(`To: ${address}`)) ?? '')?.[1] ?? ''
}

test('shows Inloggen for a visitor, Mijn account with a supporter, and Inloggen again after logging out', async ({
  page,
}) => {
  const id = unique()
  const address = `kop-${id}@example.org`
  const name = `Kop Fan ${id}`.slice(0, 20)
  const button = (label: string) => page.getByRole('banner').getByRole('link', { name: label })
  const header = () => page.locator('.hf-page-header').boundingBox()

  await page.goto('/nieuws')
  await expect(button('Inloggen')).toHaveAttribute('href', '/fans/inloggen')
  await expect(button('Mijn account')).toHaveCount(0)

  const loggedOut = await header()

  await page.goto('/fans/aanmelden')
  await page.getByLabel('Schermnaam').fill(name)
  await page.getByLabel('E-mailadres').fill(address)
  await page.getByRole('button', { name: 'Account maken' }).click()
  await expect(page).toHaveURL(/\/fans\/aanmelden\/verstuurd\?ref=/)
  await page.getByLabel('Code uit de mail').fill(await codeTo(address))
  await page.getByRole('button', { name: 'Doorgaan' }).click()
  await expect(page).toHaveURL(/\/fans\?welkom=1$/)

  // The page under /fans set the mark, so the header knows on every other page too.
  await expect(button('Mijn account')).toHaveAttribute('href', '/fans/mijn-account')
  await page.goto('/nieuws')
  await expect(button('Mijn account')).toBeVisible()
  await expect(button('Inloggen')).toHaveCount(0)
  await expect(page.getByRole('banner')).not.toContainText(name)
  expect(await page.locator('.hf-page-header').innerHTML()).not.toContain(name)

  // The button is as big as before, so the header does not move when it learns who is there.
  expect(await header()).toEqual(loggedOut)

  await page.goto('/fans/mijn-account')
  await page.getByRole('button', { exact: true, name: 'Uitloggen' }).click()
  await expect(page).toHaveURL(/\/fans\?uitgelogd=1$/)
  await expect(button('Inloggen')).toBeVisible()
  await page.goto('/nieuws')
  await expect(button('Inloggen')).toBeVisible()
  await expect(button('Mijn account')).toHaveCount(0)
})

test('shows the initials for a mark in the browser and no more than that, as a name for the button', async ({
  page,
}) => {
  await page.goto('/nieuws')
  await page.evaluate(() => {
    localStorage.setItem('fansite-fans', 'Blauwwit_Sjoerd')
  })
  await page.reload()

  const button = page.getByRole('banner').getByRole('link', { name: 'Mijn account' })

  await expect(button).toBeVisible()
  await expect(button.locator('.hf-account-button-initials path')).toHaveCount(2)
  // Nothing of it is a login: the account page sends this browser to the login.
  await button.click()
  await expect(page).toHaveURL(/\/fans\/inloggen\?terug=%2Ffans%2Fmijn-account$/)
  // The page under /fans saw no session and took the mark away.
  await expect(page.getByRole('banner').getByRole('link', { name: 'Inloggen' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('fansite-fans'))).toBeNull()
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('has the link Inloggen in the header', async ({ page }) => {
    await page.goto('/nieuws')

    const button = page.getByRole('banner').getByRole('link', { name: 'Inloggen' })

    await expect(button).toHaveAttribute('href', '/fans/inloggen')
    expect((await button.boundingBox())?.width).toBeGreaterThanOrEqual(44)
  })
})
