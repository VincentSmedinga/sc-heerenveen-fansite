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
    url: /^(https?:\/\/\S+\/fans\/aanmelden\/bevestigen\?token=\S+)$/m.exec(mail)?.[1] ?? '',
  }
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('makes an account with the code, and shows it on Mijn account', async ({ page }) => {
    const id = unique()
    const address = `fan-${id}@example.org`
    const name = `Fan ${id}`.slice(0, 20)

    await page.goto('/fans/aanmelden')
    await checkPage(page)
    await page.getByLabel('Schermnaam').fill(name)
    await page.getByLabel('E-mailadres').fill(address)
    await page.getByRole('button', { name: 'Account maken' }).click()

    await expect(page).toHaveURL(/\/fans\/aanmelden\/verstuurd\?ref=/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kijk in je mail')

    const { code } = await mailTo(address)

    await page.getByLabel('Code uit de mail').fill(`${code.slice(0, 3)} ${code.slice(3)}`)
    await page.getByRole('button', { name: 'Doorgaan' }).click()

    await expect(page).toHaveURL(/\/fans\/mijn-account\?welkom=1$/)
    await expect(page.getByText(`Welkom, ${name}.`)).toBeVisible()
    await expect(page.getByRole('definition').first()).toHaveText(name)
    await expect(page.getByText(address)).toBeVisible()
    await checkPage(page)

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
    await checkPage(page)
  })
})

test('makes an account with the button behind the link', async ({ page }) => {
  const id = unique()
  const address = `link-${id}@example.org`
  const name = `Link_${id}`.slice(0, 20)

  await page.goto('/fans/aanmelden')
  await page.getByLabel('Schermnaam').fill(name)
  await page.getByLabel('E-mailadres').fill(address)
  await page.getByRole('button', { name: 'Account maken' }).click()
  await expect(page).toHaveURL(/\/fans\/aanmelden\/verstuurd\?ref=/)

  const { url } = await mailTo(address)

  // Opening the link makes nothing yet: only the button does.
  await page.goto(url)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bijna klaar')
  await checkPage(page)
  await page.getByRole('button', { name: 'Account bevestigen' }).click()

  await expect(page).toHaveURL(/\/fans\/mijn-account\?welkom=1$/)
  await expect(page.getByText(`Welkom, ${name}.`)).toBeVisible()

  // The link works once.
  await page.goto(url)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Deze link werkt niet meer')
})
