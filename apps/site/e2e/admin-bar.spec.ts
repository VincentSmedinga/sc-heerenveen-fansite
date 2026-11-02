import { expect, test } from '@playwright/test'

import { addAdminSession, adminCookie, adminEmail } from './admin'
import { checkPage } from './check-page'

// The bar with the screens of the admin, under the main menu: what a moderator and a beheerder
// get, which screen is marked, and that the login pages have none. The pages of the admin are
// checked with axe in pages.spec.ts, so the bar is in those checks too.

const host = (baseURL: string | undefined) => new URL(baseURL ?? '').hostname

test('gives a moderator Berichten only, with who is logged in and a way out', async ({ baseURL, context, page }) => {
  await context.addCookies([adminCookie(host(baseURL), 'moderator')])
  await page.goto('/beheer/berichten')

  const bar = page.getByRole('navigation', { name: 'Beheer' })

  await expect(bar.getByRole('link')).toHaveText(['Berichten'])
  await expect(bar.getByRole('link', { name: 'Berichten' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText(`${adminEmail}, moderator`)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Uitloggen' })).toBeVisible()
  expect(await checkPage(page)).toEqual([])
})

test('gives a beheerder every screen and marks the one below which the page is', async ({ baseURL, context, page }) => {
  await context.addCookies([adminCookie(host(baseURL), 'beheerder')])
  await page.goto('/beheer/artikelen/nieuw')

  const bar = page.getByRole('navigation', { name: 'Beheer' })

  await expect(bar.getByRole('link')).toHaveText(['Beheer', 'Berichten', 'Artikelen', 'Wedstrijden', 'Bezoek'])
  await expect(bar.locator('[aria-current="page"]')).toHaveText('Artikelen')

  await bar.getByRole('link', { name: 'Bezoek' }).click()
  await expect(page).toHaveURL(/\/beheer\/bezoek$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Bezoek' })).toBeVisible()
  await expect(bar.locator('[aria-current="page"]')).toHaveText('Bezoek')
})

// The session is the test's own: logging out ends it, and the shared session of the global
// setup must stay.
test('logs out from the bar, and the login page has no bar', async ({ baseURL, context, page }) => {
  await context.addCookies([await addAdminSession(host(baseURL), 'beheerder')])
  await page.goto('/beheer')
  await page.getByRole('button', { name: 'Uitloggen' }).first().click()

  await expect(page).toHaveURL(/\/beheer\/inloggen/)
  await expect(page.getByRole('navigation', { name: 'Beheer' })).toHaveCount(0)
})

test('is not on the login page', async ({ page }) => {
  await page.goto('/beheer/inloggen')

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Beheer' })).toHaveCount(0)
})
