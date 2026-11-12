import { expect, test } from '@playwright/test'

import { addAdminSession, adminCookie } from './admin'
import { checkPage } from './check-page'

// The bar with the screens of the admin, under the main menu: what an author, an editor and the
// owner get, which screen is marked, and that the login pages have none. The pages of the admin
// are checked with axe in pages.spec.ts, so the bar is in those checks too.

const host = (baseURL: string | undefined) => new URL(baseURL ?? '').hostname

test('gives an author the start, the articles and his account, by his first name', async ({
  baseURL,
  context,
  page,
}) => {
  await context.addCookies([adminCookie(host(baseURL), 'author')])
  await page.goto('/beheer/artikelen')

  const bar = page.getByRole('navigation', { name: 'Beheer' })

  await expect(bar.getByRole('link')).toHaveText(['Beheer', 'Artikelen', 'Auteur'])
  await expect(bar.getByRole('button')).toHaveText(['Uitloggen'])
  await expect(bar.getByRole('link', { name: 'Artikelen' })).toHaveAttribute('aria-current', 'page')
  expect(await checkPage(page)).toEqual([])
})

test('gives the owner every screen and marks the one below which the page is', async ({ baseURL, context, page }) => {
  await context.addCookies([adminCookie(host(baseURL), 'owner')])
  await page.goto('/beheer/artikelen/nieuw')

  const bar = page.getByRole('navigation', { name: 'Beheer' })

  await expect(bar.getByRole('link')).toHaveText([
    'Beheer',
    'Berichten',
    'Artikelen',
    'Wedstrijden',
    'Spelers',
    'Stadions',
    'Clubnamen',
    'Kwaliteit',
    'Bezoek',
    'Accounts',
    'Eigenaar',
  ])
  await expect(bar.locator('[aria-current="page"]')).toHaveText('Artikelen')
  await expect(bar.getByRole('button')).toHaveText(['Uitloggen'])

  await bar.getByRole('link', { name: 'Bezoek' }).click()
  await expect(page).toHaveURL(/\/beheer\/bezoek$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Bezoek' })).toBeVisible()
  await expect(bar.locator('[aria-current="page"]')).toHaveText('Bezoek')
})

test('is no longer on the start page of the admin, which keeps the first name and the role', async ({
  baseURL,
  context,
  page,
}) => {
  await context.addCookies([adminCookie(host(baseURL), 'editor')])
  await page.goto('/beheer')

  await expect(page.getByText('Je bent ingelogd als Redacteur (redacteur).')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Uitloggen' })).toHaveCount(1)
  await expect(page.getByRole('main').getByRole('button', { name: 'Uitloggen' })).toHaveCount(0)
})

test('has Uitloggen at the right on a desktop, after the screens', async ({ baseURL, context, page }) => {
  await context.addCookies([adminCookie(host(baseURL), 'editor')])
  await page.setViewportSize({ height: 800, width: 900 })
  await page.goto('/beheer/bezoek')

  const bar = page.getByRole('navigation', { name: 'Beheer' })
  const last = await bar.getByRole('link', { name: 'Redacteur' }).boundingBox()
  const logOut = await bar.getByRole('button', { name: 'Uitloggen' }).boundingBox()
  const barBox = await bar.boundingBox()

  expect(last && logOut && barBox).toBeTruthy()
  expect(logOut!.x).toBeGreaterThan(last!.x + last!.width)
  expect(barBox!.x + barBox!.width - (logOut!.x + logOut!.width)).toBeLessThan(40)
  expect(logOut!.height).toBeGreaterThanOrEqual(24)
})

for (const width of [390, 320]) {
  // At 320 pixels the links wrap instead of scrolling (WCAG 1.4.10), so the bar is no longer
  // one row there; Uitloggen is then the last one that wraps.
  test(`reaches Uitloggen with the keyboard after the links on ${width} pixels, with no sideways page scroll`, async ({
    baseURL,
    context,
    page,
  }) => {
    await context.addCookies([adminCookie(host(baseURL), 'editor')])
    await page.setViewportSize({ height: 800, width })
    await page.goto('/beheer/berichten')

    const bar = page.getByRole('navigation', { name: 'Beheer' })

    // The last link is Mijn account, by the first name of the account.
    await bar.getByRole('link', { name: 'Redacteur' }).focus()
    await page.keyboard.press('Tab')

    const logOut = bar.getByRole('button', { name: 'Uitloggen' })

    await expect(logOut).toBeFocused()
    await expect(logOut).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    if (width > 320) {
      expect((await bar.boundingBox())!.height).toBeLessThan(60)
    }
  })
}

// The session is the test's own: logging out ends it, and the shared session of the global
// setup must stay.
test('is gone on the login page after logging out', async ({ baseURL, context, page }) => {
  await context.addCookies([await addAdminSession(host(baseURL), 'editor')])
  await page.goto('/beheer')
  await page.getByRole('navigation', { name: 'Beheer' }).getByRole('button', { name: 'Uitloggen' }).click()

  await expect(page).toHaveURL(/\/beheer\/inloggen/)
  await expect(page.getByRole('navigation', { name: 'Beheer' })).toHaveCount(0)
})

test('is not on the login page', async ({ page }) => {
  await page.goto('/beheer/inloggen')

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Beheer' })).toHaveCount(0)
})
