import { expect, test } from '@playwright/test'

import { checkPage } from './check-page'
import { sentMails } from './fake-mail'

// A supporter makes an account (issue 1446): the form, the mail with the link and the code from
// the fake mail server, and the account. Each test signs up with an address and a name of its
// own, so a second run finds no account that is there already.

const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`

/** The mail to one address, once the site has handed it over after the answer. */
async function mailTo(address: string) {
  await expect.poll(() => sentMails().filter((mail) => mail.includes(`To: ${address}`)).length).toBe(1)

  const mail = sentMails().find((mail) => mail.includes(`To: ${address}`)) ?? ''

  return {
    code: /^(\d{6})$/m.exec(mail)?.[1] ?? '',
    // The mail has the address of acceptance (SITE_ENV), so the test opens the path on its own.
    url: /^https?:\/\/\S+?(\/fans\/aanmelden\/bevestigen\?token=\S+)$/m.exec(mail)?.[1] ?? '',
  }
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('makes an account with the code, and shows it on Mijn account', async ({ page }) => {
    const id = unique()
    const address = `fan-${id}@example.org`
    const name = `Fan ${id}`.slice(0, 20)

    await page.goto('/fans/aanmelden')
    await page.getByLabel('Schermnaam').fill(name)
    await page.getByLabel('E-mailadres').fill(address)
    await page.getByRole('button', { name: 'Account maken' }).click()

    await expect(page).toHaveURL(/\/fans\/aanmelden\/verstuurd\?ref=/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kijk in je mail')

    const { code } = await mailTo(address)

    await page.getByLabel('Code uit de mail').fill(`${code.slice(0, 3)} ${code.slice(3)}`)
    await page.getByRole('button', { name: 'Doorgaan' }).click()

    // The welcome is on Fans, and Mijn account shows the data.
    await expect(page).toHaveURL(/\/fans\?welkom=1$/)
    await expect(page.getByText(`Welkom, ${name}.`)).toBeVisible()
    await expect(page.getByText('Maak alvast een account')).toHaveCount(0)
    await expect(page.getByText(`Je bent ingelogd als ${name}.`)).toBeVisible()
    await page.goto('/fans/mijn-account')
    await expect(page.getByText('Welkom,')).toHaveCount(0)
    await expect(page.getByRole('definition').first()).toContainText(name)
    await expect(page.getByText(address)).toBeVisible()

    const cookie = (await page.context().cookies()).find(({ name: cookieName }) => cookieName === 'fans-sessie')

    expect(cookie).toMatchObject({ httpOnly: true, path: '/fans', sameSite: 'Lax', secure: true })
  })

  test('shows an error at each field that fails, and sends nothing', async ({ page }) => {
    await page.goto('/fans/aanmelden')
    await page.getByLabel('Schermnaam').fill('Redactie')
    await page.getByLabel('E-mailadres').fill('geen-adres')
    await page.getByRole('button', { name: 'Account maken' }).click()

    const summary = page.getByRole('region', { name: 'Kijk nog even naar 2 dingen' })

    await expect(summary.getByRole('link')).toHaveText([
      'Die naam lijkt op de club, de site of de redactie. Kies een andere.',
      'Dit e-mailadres klopt niet. Kijk of er een @ in staat.',
    ])
    await expect(page.getByLabel('Schermnaam')).toHaveValue('Redactie')
  })
})

test('makes an account with the button behind the link', async ({ page }) => {
  const id = unique()
  const address = `link-${id}@example.org`
  const name = `Link_${id}`.slice(0, 20)

  await page.goto('/fans/aanmelden')
  await checkPage(page)
  await page.getByLabel('Schermnaam').fill(name)
  await page.getByLabel('E-mailadres').fill(address)
  await page.getByRole('button', { name: 'Account maken' }).click()
  await expect(page).toHaveURL(/\/fans\/aanmelden\/verstuurd\?ref=/)
  await checkPage(page)

  const { url } = await mailTo(address)

  // Opening the link makes nothing yet: only the button does.
  await page.goto(url)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bijna klaar')
  await checkPage(page)
  await page.getByRole('button', { name: 'Account bevestigen' }).click()

  await expect(page).toHaveURL(/\/fans\?welkom=1$/)
  await expect(page.getByText(`Welkom, ${name}.`)).toBeVisible()
  await checkPage(page)
  // The page Fans of a supporter who is logged in, with the cards of the games, in dark too.
  await page.emulateMedia({ colorScheme: 'dark' })
  await checkPage(page)
  await page.emulateMedia({ colorScheme: 'light' })

  // The link works once.
  await page.goto(url)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Deze link werkt niet meer')
})

test('shows the address, keeps the digits of a pasted code, and asks for a new code only after a minute', async ({
  page,
}) => {
  const id = unique()
  const address = `code-${id}@example.org`
  const name = `Code_${id}`.slice(0, 20)

  await page.goto('/fans/aanmelden')
  await page.getByLabel('Schermnaam').fill(name)
  await page.getByLabel('E-mailadres').fill(address)
  await page.getByRole('button', { name: 'Account maken' }).click()
  await expect(page).toHaveURL(/\/fans\/aanmelden\/verstuurd\?ref=/)

  // The address is on the page and not in its address.
  await expect(page.getByText(address)).toBeVisible()
  expect(page.url()).not.toContain(encodeURIComponent(address))
  expect(page.url()).not.toContain('example.org')

  const { code } = await mailTo(address)
  const field = page.getByLabel('Code uit de mail')

  await field.fill(`${code.slice(0, 3)} ${code.slice(3)}`)
  await expect(field).toHaveValue(code)

  // A minute has not passed, so no second mail goes, and the page says so.
  await page.getByRole('button', { name: 'Stuur een nieuwe code (kan over 1 minuut)' }).click()
  await expect(page.getByText('Wacht nog even. Je kunt over een minuut een nieuwe code vragen.')).toBeVisible()
  await expect(page.getByText(address)).toBeVisible()
  expect(sentMails().filter((mail) => mail.includes(`To: ${address}`))).toHaveLength(1)
  await checkPage(page)

  await page.getByLabel('Code uit de mail').fill(code)
  await page.getByRole('button', { name: 'Doorgaan' }).click()
  await expect(page).toHaveURL(/\/fans\?welkom=1$/)
  await expect(page.getByText(`Welkom, ${name}.`)).toBeVisible()
  await checkPage(page)
})
