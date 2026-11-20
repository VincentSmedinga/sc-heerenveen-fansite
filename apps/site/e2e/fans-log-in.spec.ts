import { expect, type Page, test } from '@playwright/test'

import { checkPage } from './check-page'
import { sentMails } from './fake-mail'

// A supporter logs in with the code from the mail, comes back to the page that needed an
// account, stays logged in, and logs out (issue 1448). Each test makes an account of its own
// first, so a second run finds nothing that is there already.

const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`

/** Makes an account with the code, and logs out, so the test starts without a session. */
async function account(page: Page) {
  const id = unique()
  const address = `inlog-${id}@example.org`
  const name = `Inlog ${id}`.slice(0, 20)

  await page.goto('/fans/aanmelden')
  await page.getByLabel('Schermnaam').fill(name)
  await page.getByLabel('E-mailadres').fill(address)
  await page.getByRole('button', { name: 'Account maken' }).click()
  await expect(page).toHaveURL(/\/fans\/aanmelden\/verstuurd\?ref=/)
  await page.getByLabel('Code uit de mail').fill(await codeTo(address, 1))
  await page.getByRole('button', { name: 'Doorgaan' }).click()
  await expect(page).toHaveURL(/\/fans\/mijn-account/)
  await page.context().clearCookies()

  return { address, name }
}

/** The code of the last mail to one address, once the site has handed it over. */
async function codeTo(address: string, count: number) {
  await expect.poll(() => sentMails().filter((mail) => mail.includes(`To: ${address}`)).length).toBe(count)

  const mail = sentMails().findLast((mail) => mail.includes(`To: ${address}`)) ?? ''

  return /^(\d{6})$/m.exec(mail)?.[1] ?? ''
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('logs in with the code, comes back, and logs out', async ({ page }) => {
    const { address, name } = await account(page)

    await page.goto('/fans/mijn-account')
    await expect(page).toHaveURL(/\/fans\/inloggen\?terug=%2Ffans%2Fmijn-account$/)
    await expect(page.getByText('Log in om verder te gaan.')).toBeVisible()
    await page.getByLabel('E-mailadres').fill(address)
    await page.getByRole('button', { name: 'Stuur me een link' }).click()

    await expect(page).toHaveURL(/\/fans\/inloggen\/verstuurd\?ref=/)
    await expect(
      page.getByText('Als dit adres een account heeft, hebben we een link en een code gemaild.'),
    ).toBeVisible()
    await page.getByLabel('Code uit de mail').fill(await codeTo(address, 2))
    await page.getByRole('button', { name: 'Doorgaan' }).click()

    await expect(page).toHaveURL(/\/fans\/mijn-account$/)
    await expect(page.getByRole('definition').first()).toHaveText(name)

    // The cookie lasts past a restart of the browser.
    const cookie = (await page.context().cookies()).find(({ name: cookieName }) => cookieName === 'fans-sessie')

    expect(cookie?.expires ?? 0).toBeGreaterThan(Date.now() / 1000 + 300 * 24 * 60 * 60)

    // Logged in, the pages to log in and to sign up go on to the account.
    await page.goto('/fans/inloggen')
    await expect(page).toHaveURL(/\/fans\/mijn-account$/)
    await page.goto('/fans/aanmelden')
    await expect(page).toHaveURL(/\/fans\/mijn-account$/)

    await page.getByRole('button', { exact: true, name: 'Uitloggen' }).click()
    await expect(page).toHaveURL(/\/fans\?uitgelogd=1$/)
    expect((await page.context().cookies()).some(({ name: cookieName }) => cookieName === 'fans-sessie')).toBe(false)

    await page.goto('/fans/mijn-account')
    await expect(page).toHaveURL(/\/fans\/inloggen/)
  })

  test('answers an address without an account the same, and mails it nothing', async ({ page }) => {
    const address = `niemand-${unique()}@example.org`

    await page.goto('/fans/inloggen')
    await page.getByLabel('E-mailadres').fill(address)
    await page.getByRole('button', { name: 'Stuur me een link' }).click()

    await expect(page).toHaveURL(/\/fans\/inloggen\/verstuurd\?ref=/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kijk in je mail')
    await expect(
      page.getByText('Als dit adres een account heeft, hebben we een link en een code gemaild.'),
    ).toBeVisible()
    expect(sentMails().some((mail) => mail.includes(`To: ${address}`))).toBe(false)
  })
})

test('logs out on every device', async ({ baseURL, browser, page }) => {
  const { address } = await account(page)
  // A second device: a context of its own, with cookies of its own.
  const device = await browser.newContext(baseURL === undefined ? {} : { baseURL })
  const other = await device.newPage()

  for (const [tab, count] of [
    [page, 2],
    [other, 3],
  ] as const) {
    await tab.goto('/fans/inloggen')
    await checkPage(tab)
    await tab.getByLabel('E-mailadres').fill(address)
    await tab.getByRole('button', { name: 'Stuur me een link' }).click()
    await expect(tab).toHaveURL(/\/fans\/inloggen\/verstuurd\?ref=/)
    await tab.getByLabel('Code uit de mail').fill(await codeTo(address, count))
    await tab.getByRole('button', { name: 'Doorgaan' }).click()
    await expect(tab).toHaveURL(/\/fans$|\/fans\?/)
  }

  await page.goto('/fans/mijn-account')
  await checkPage(page)
  await page.getByRole('button', { name: 'Uitloggen op alle apparaten' }).click()
  await expect(page).toHaveURL(/\/fans\?uitgelogd=1$/)

  await other.goto('/fans/mijn-account')
  await expect(other).toHaveURL(/\/fans\/inloggen/)
  await device.close()
})
