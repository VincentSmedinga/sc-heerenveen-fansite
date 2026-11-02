import type { Page } from '@playwright/test'

import { expect, test } from '@playwright/test'

import { addAdminSession, adminCookie } from './admin'
import { checkPage } from './check-page'

// The item Beheer in the main menu is shown from a mark in localStorage, which the admin sets
// for somebody with a valid session and takes away for somebody without one. The server sends
// the same public page to everyone, so only a browser can show that the item comes and goes.
// The address of the public page doesn't matter, so the page without a database will do.
const publicPage = '/over-ons'
const key = 'fansite-beheer'

const menu = (page: Page) => page.getByRole('navigation', { name: 'Hoofdmenu' })
const item = (page: Page) => menu(page).getByRole('link', { name: 'Beheer' })
const mark = (page: Page) => page.evaluate((storageKey) => localStorage.getItem(storageKey), key)

const host = (baseURL: string | undefined) => new URL(baseURL ?? '').hostname

test.describe('the item Beheer in the main menu', () => {
  test('is not there for a visitor, and not in the HTML of the server for anyone', async ({ page, request }) => {
    await page.goto(publicPage)

    await expect(menu(page).getByRole('link', { name: 'Forum' })).toBeVisible()
    await expect(item(page)).toHaveCount(0)
    expect(await mark(page)).toBeNull()

    const html = await (await request.get(publicPage)).text()

    expect(html).not.toContain('/beheer')
    expect(html).not.toContain('Beheer')
  })

  test('comes before Forum once an editor has opened the admin, and leads back to it', async ({
    baseURL,
    context,
    page,
  }) => {
    await context.addCookies([adminCookie(host(baseURL))])
    await page.goto('/beheer')
    await expect(page.getByRole('heading', { level: 1, name: 'Beheer' })).toBeVisible()
    await expect.poll(() => mark(page)).toBe('1')

    await page.goto(publicPage)
    await expect(item(page)).toBeVisible()
    await expect(menu(page).getByRole('link')).toHaveText(['Nieuws', 'Wedstrijden', 'Statistieken', 'Beheer', 'Forum'])
    await expect(item(page)).not.toHaveAttribute('aria-current')

    // The focus goes from Statistieken to Beheer and on to Forum, like between the other items.
    await menu(page).getByRole('link', { name: 'Statistieken' }).focus()
    await page.keyboard.press('Tab')
    await expect(item(page)).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(menu(page).getByRole('link', { name: 'Forum' })).toBeFocused()
    expect(await checkPage(page)).toEqual([])

    await item(page).click()
    await expect(page).toHaveURL(/\/beheer$/)
    await expect(item(page)).toHaveAttribute('aria-current', 'page')
  })

  test('does not move the other items, and is in the menu on a phone too', async ({ baseURL, context, page }) => {
    await page.goto(publicPage)
    const names = ['Nieuws', 'Wedstrijden', 'Statistieken', 'Forum']
    const boxes = () => Promise.all(names.map((name) => menu(page).getByRole('link', { name }).boundingBox()))
    const before = await boxes()

    await context.addCookies([adminCookie(host(baseURL))])
    await page.goto('/beheer')
    await expect.poll(() => mark(page)).toBe('1')
    await page.goto(publicPage)
    await expect(item(page)).toBeVisible()
    // Forum stays on the right edge, where the menu draws its last item.
    expect(await boxes()).toEqual(before)

    await page.setViewportSize({ height: 812, width: 390 })
    await expect(item(page)).toBeVisible()
    expect(await checkPage(page)).toEqual([])
  })

  test('goes away when the editor logs out, which leads to the login page', async ({ baseURL, context, page }) => {
    // A session of its own: logging out ends it on the server, and the other tests share one.
    await context.addCookies([await addAdminSession(host(baseURL))])
    await page.goto('/beheer')
    await expect.poll(() => mark(page)).toBe('1')

    await page.getByRole('navigation', { name: 'Beheer' }).getByRole('button', { name: 'Uitloggen' }).click()
    await expect(page).toHaveURL(/\/beheer\/inloggen$/)
    await expect.poll(() => mark(page)).toBeNull()
    await expect(item(page)).toHaveCount(0)

    await page.goto(publicPage)
    await expect(menu(page).getByRole('link', { name: 'Forum' })).toBeVisible()
    await expect(item(page)).toHaveCount(0)
  })

  test('goes away when the session has ended and the editor opens a page of the admin', async ({
    baseURL,
    context,
    page,
  }) => {
    await context.addCookies([adminCookie(host(baseURL))])
    await page.goto('/beheer')
    await expect.poll(() => mark(page)).toBe('1')

    // The cookie is gone, as when the session ended: the next page of the admin, reached
    // without a new load of the layout, sends the editor to the login page.
    await context.clearCookies()
    await page.getByRole('link', { name: 'Berichten verbergen of weer tonen' }).click()
    await expect(page).toHaveURL(/\/beheer\/inloggen$/)
    await expect.poll(() => mark(page)).toBeNull()
    await expect(item(page)).toHaveCount(0)
  })

  test('is a link to the login page for somebody who made the mark by hand, and the mark goes there', async ({
    page,
  }) => {
    await page.addInitScript((storageKey) => localStorage.setItem(storageKey, '1'), key)
    await page.goto(publicPage)
    await expect(item(page)).toBeVisible()

    await item(page).click()
    await expect(page).toHaveURL(/\/beheer\/inloggen$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Inloggen voor beheer' })).toBeVisible()
    await expect.poll(() => mark(page)).toBeNull()
  })

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false })

    test('is not there, also for an editor', async ({ baseURL, context, page }) => {
      await context.addCookies([adminCookie(host(baseURL))])
      await page.goto(publicPage)

      await expect(menu(page).getByRole('link', { name: 'Forum' })).toBeVisible()
      await expect(item(page)).toHaveCount(0)
    })
  })
})
