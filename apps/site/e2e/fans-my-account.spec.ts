import { expect, type Page, test } from '@playwright/test'

import { checkPage } from './check-page'
import { sentMails } from './fake-mail'

// A supporter changes the screen name, the address and the choice for the rankings on Mijn
// account, without JavaScript (issue 1452). Each test makes an account of its own first, so a
// second run finds nothing that is there already.

const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`

/** Makes an account with the code, and stays logged in. */
async function account(page: Page) {
  const id = unique()
  const address = `wijzig-${id}@example.org`
  const name = `Wijzig ${id}`.slice(0, 20)

  await page.goto('/fans/aanmelden')
  await page.getByLabel('Schermnaam').fill(name)
  await page.getByLabel('E-mailadres').fill(address)
  await page.getByRole('button', { name: 'Account maken' }).click()
  await expect(page).toHaveURL(/\/fans\/aanmelden\/verstuurd\?ref=/)
  await page.getByLabel('Code uit de mail').fill(await codeTo(address))
  await page.getByRole('button', { name: 'Doorgaan' }).click()
  await expect(page).toHaveURL(/\/fans\?welkom=1$/)

  return { address, id, name }
}

/** The mails to one address. */
const mailsTo = (address: string) => sentMails().filter((mail) => mail.includes(`To: ${address}`))

/** The code of the last mail to one address, once the site has handed it over. */
async function codeTo(address: string) {
  await expect.poll(() => mailsTo(address).length).toBeGreaterThan(0)

  return /^(\d{6})$/m.exec(mailsTo(address).at(-1) ?? '')?.[1] ?? ''
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('changes the name once in 30 days', async ({ page }) => {
    const { id } = await account(page)
    const name = `Nieuw ${id}`.slice(0, 20)

    await page.goto('/fans/mijn-account')
    await page.getByRole('link', { name: /^Wijzigen\s+schermnaam$/ }).click()
    await expect(page).toHaveTitle(/^Schermnaam wijzigen/)

    // An error shows in the summary and at the field.
    await page.getByLabel('Nieuwe schermnaam').fill('Fansite_Redactie')
    await page.getByRole('button', { exact: true, name: 'Opslaan' }).click()
    await expect(page.getByRole('link', { name: 'Die naam lijkt op de club, de site of de redactie.' })).toBeVisible()

    await page.getByLabel('Nieuwe schermnaam').fill(name)
    await page.getByRole('button', { exact: true, name: 'Opslaan' }).click()
    await expect(page).toHaveURL(/\/fans\/mijn-account\?melding=schermnaam$/)
    await expect(page.getByText('Je schermnaam is gewijzigd.')).toBeVisible()
    await expect(page.getByRole('definition').first()).toContainText(name)

    await page.goto('/fans/mijn-account/schermnaam')
    await expect(
      page.getByText(/^Je wijzigde je naam op \d+ \w+\. Vanaf \d+ \w+ kun je hem weer wijzigen\.$/),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /^Opslaan/ })).toHaveCount(0)
  })

  test('changes the address with the code from the mail, and tells the old address', async ({ page }) => {
    const { address, id } = await account(page)
    const next = `nieuw-${id}@example.org`

    await page.goto('/fans/mijn-account/e-mailadres')
    await page.getByLabel('Nieuw e-mailadres').fill(next)
    await page.getByRole('button', { name: 'Stuur de link' }).click()
    await expect(page).toHaveURL(/\/fans\/mijn-account\/e-mailadres\/verstuurd\?ref=/)
    await expect(page.getByText(`We hebben een link en een code gemaild naar ${next}.`)).toBeVisible()

    // Until the code is used, the old address is the address of the account.
    await page.goto('/fans/mijn-account')
    await expect(page.getByRole('definition').nth(1)).toContainText(address)
    await page.goBack()

    await page.getByLabel('Code uit de mail').fill(await codeTo(next))
    await page.getByRole('button', { name: 'Doorgaan' }).click()
    await expect(page).toHaveURL(/\/fans\/mijn-account\?melding=e-mailadres$/)
    await expect(page.getByRole('definition').nth(1)).toContainText(next)
    await expect.poll(() => mailsTo(address).some((mail) => mail.includes('is gewijzigd'))).toBe(true)
    expect(mailsTo(address).some((mail) => mail.includes(next))).toBe(false)
  })

  test('answers the same for an address with an account, and mails it nothing', async ({ baseURL, browser, page }) => {
    const device = await browser.newContext(baseURL === undefined ? {} : { baseURL })
    const { address: taken } = await account(await device.newPage())

    await device.close()
    await account(page)

    const before = mailsTo(taken).length

    await page.goto('/fans/mijn-account/e-mailadres')
    await page.getByLabel('Nieuw e-mailadres').fill(taken)
    await page.getByRole('button', { name: 'Stuur de link' }).click()
    await expect(page).toHaveURL(/\/fans\/mijn-account\/e-mailadres\/verstuurd\?ref=/)
    await expect(page.getByText(`We hebben een link en een code gemaild naar ${taken}.`)).toBeVisible()
    expect(mailsTo(taken)).toHaveLength(before)
  })

  test('takes the name out of the rankings and puts it back', async ({ page }) => {
    await account(page)
    await page.goto('/fans/mijn-account')

    const toggle = page.getByRole('switch', { name: 'Naam in de standen' })

    await expect(toggle).toBeChecked()
    await toggle.uncheck()
    await page.getByRole('button', { exact: true, name: 'Opslaan' }).click()
    await expect(page.getByText('Je naam staat niet meer in de standen.')).toBeVisible()
    await expect(page.getByRole('switch', { name: 'Naam in de standen' })).not.toBeChecked()

    await page.goto('/fans/mijn-account')
    await expect(page.getByRole('switch', { name: 'Naam in de standen' })).not.toBeChecked()
  })
})

test('turns the reminder on and off, and keeps the choice, without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()

  await account(page)
  await page.goto('/fans/mijn-account')

  const toggle = page.getByRole('switch', { name: 'Herinnering per e-mail' })

  await expect(toggle).not.toBeChecked()
  await toggle.check()
  await page.getByRole('button', { name: 'Opslaan herinnering' }).click()
  await expect(page.getByText('De herinnering staat aan.')).toBeVisible()
  await expect(page.getByRole('switch', { name: 'Herinnering per e-mail' })).toBeChecked()
  await page.goto('/fans/mijn-account/gegevens')
  await expect(page.getByText('Herinnering per e-mail').locator('xpath=following-sibling::dd')).toHaveText('Ja')
  await page.goto('/fans/mijn-account')
  await page.getByRole('switch', { name: 'Herinnering per e-mail' }).uncheck()
  await page.getByRole('button', { name: 'Opslaan herinnering' }).click()
  await expect(page.getByText('De herinnering staat uit.')).toBeVisible()
  await expect(page.getByRole('switch', { name: 'Herinnering per e-mail' })).not.toBeChecked()
  await context.close()
})

test('saves the reminder at once with JavaScript and keeps it', async ({ page }) => {
  await account(page)
  await page.goto('/fans/mijn-account')
  await page.getByRole('switch', { name: 'Herinnering per e-mail' }).check()
  await expect(page.getByText('De herinnering staat aan.')).toBeVisible()
  await expect(page.getByRole('switch', { name: 'Herinnering per e-mail' })).toBeChecked()
  await checkPage(page)
  await page.reload()
  await expect(page.getByRole('switch', { name: 'Herinnering per e-mail' })).toBeChecked()
})

test('saves the switch at once with JavaScript', async ({ page }) => {
  await account(page)
  await page.goto('/fans/mijn-account')
  await expect(page.getByRole('button', { name: /^Opslaan/ })).toHaveCount(0)
  await page.getByRole('switch', { name: 'Naam in de standen' }).uncheck()
  await expect(page.getByText('Je naam staat niet meer in de standen.')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('switch', { name: 'Naam in de standen' })).not.toBeChecked()
})

test('checks the pages of Mijn account with axe, with an error and with the wait', async ({ page }) => {
  const { id } = await account(page)

  await page.goto('/fans/mijn-account')
  await checkPage(page)
  await page.goto('/fans/mijn-account/e-mailadres')
  await checkPage(page)
  await page.getByLabel('Nieuw e-mailadres').fill('geen-adres')
  await page.getByRole('button', { name: 'Stuur de link' }).click()
  await expect(page.locator('#fouten')).toBeFocused()
  await checkPage(page)
  await page.getByLabel('Nieuw e-mailadres').fill(`axe-${id}@example.org`)
  await page.getByRole('button', { name: 'Stuur de link' }).click()
  await expect(page).toHaveURL(/\/fans\/mijn-account\/e-mailadres\/verstuurd\?ref=/)
  await checkPage(page)

  await page.goto('/fans/mijn-account/schermnaam')
  await checkPage(page)
  await page.getByLabel('Nieuwe schermnaam').fill('a@b')
  await page.getByRole('button', { exact: true, name: 'Opslaan' }).click()
  await expect(page.locator('#fouten')).toBeFocused()
  await checkPage(page)
  await page.getByLabel('Nieuwe schermnaam').fill(`Axe ${id}`.slice(0, 20))
  await page.getByRole('button', { exact: true, name: 'Opslaan' }).click()
  await expect(page).toHaveURL(/\/fans\/mijn-account\?melding=schermnaam$/)
  await expect(page.locator('#melding')).toBeFocused()
  await checkPage(page)
  await page.goto('/fans/mijn-account/schermnaam')
  await checkPage(page)
})

test.describe('closing without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('signs up, logs in, sees all the data and closes the account', async ({ page }) => {
    const { address, name } = await account(page)

    await page.context().clearCookies()
    await page.goto('/fans/inloggen')
    await page.getByLabel('E-mailadres').fill(address)
    await page.getByRole('button', { name: 'Stuur me een link' }).click()
    await expect(page).toHaveURL(/\/fans\/inloggen\/verstuurd\?ref=/)
    await expect.poll(() => mailsTo(address).length).toBe(2)
    await page.getByLabel('Code uit de mail').fill(await codeTo(address))
    await page.getByRole('button', { name: 'Doorgaan' }).click()
    await expect(page).toHaveURL(/\/fans/)

    await page.goto('/fans/mijn-account')
    await page.getByRole('link', { name: 'Alles wat we van je bewaren' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Alles wat we van je bewaren')
    await expect(page.getByText(address)).toBeVisible()

    await page.goto('/fans/mijn-account')
    await page.getByRole('link', { name: 'Account opheffen' }).click()
    await page.getByRole('button', { name: 'Account opheffen' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Weet je het zeker?')
    await expect(page.getByText(name)).toBeVisible()
    await page.getByRole('button', { name: 'Ja, hef mijn account op' }).click()

    await expect(page).toHaveURL(/\/fans\/mijn-account\/opgeheven$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Je account is opgeheven')
    expect((await page.context().cookies()).some(({ name: cookie }) => cookie === 'fans-sessie')).toBe(false)

    // The account is gone: Mijn account asks to log in, and the address can sign up again.
    await page.goto('/fans/mijn-account')
    await expect(page).toHaveURL(/\/fans\/inloggen/)
    await page.goto('/fans/aanmelden')
    await page.getByLabel('Schermnaam').fill(name)
    await page.getByLabel('E-mailadres').fill(address)
    await page.getByRole('button', { name: 'Account maken' }).click()
    await expect(page).toHaveURL(/\/fans\/aanmelden\/verstuurd\?ref=/)
    await expect.poll(() => mailsTo(address).at(-1) ?? '').toContain('Je maakt een account')
  })
})

test('checks the pages of all the data and of closing with axe', async ({ page }) => {
  await account(page)

  for (const path of [
    '/fans/mijn-account/gegevens',
    '/fans/mijn-account/opheffen',
    '/fans/mijn-account/opheffen/zeker',
  ]) {
    await page.goto(path)
    await checkPage(page)
  }

  await page.getByRole('button', { name: 'Ja, hef mijn account op' }).click()
  await expect(page).toHaveURL(/\/fans\/mijn-account\/opgeheven$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
  await checkPage(page)
})
