import type { Page } from '@playwright/test'

import { expect, test } from '@playwright/test'

import { adminCookie } from './admin'

// A click on the header of a table sorts it, a second click turns it round and a third gives
// the order of the page back, on a table of the site and on a table of the admin. The sorting
// itself is checked in the unit tests of DataTable; these checks show the buttons work in a
// browser, on the pages that use them.

/** The row headers of the first table of the page, from the top. */
const rowHeaders = (page: Page) => page.locator('table').first().locator('tbody th').allInnerTexts()

/** Clicks the header three times and checks what each click did. */
async function clickThreeTimes(page: Page, name: string) {
  const header = page.getByRole('columnheader', { exact: true, name })
  const button = page.getByRole('button', { exact: true, name })
  const given = await rowHeaders(page)

  expect(given.length).toBeGreaterThan(2)
  await expect(header).toHaveAttribute('aria-sort', 'none')

  await button.click()
  await expect(header).not.toHaveAttribute('aria-sort', 'none')
  const first = await rowHeaders(page)

  await button.click()
  const second = await rowHeaders(page)

  expect(second).not.toEqual(first)
  expect([...second].toSorted()).toEqual([...given].toSorted())

  await button.click()
  await expect(header).toHaveAttribute('aria-sort', 'none')
  expect(await rowHeaders(page)).toEqual(given)
  await expect(page.locator('table').first().locator('thead [aria-sort]:not([aria-sort="none"])')).toHaveCount(0)
  await expect(page.locator('div[role="status"]').first()).toHaveText(
    'Niet meer gesorteerd, in de volgorde van de pagina',
  )
}

test('puts a table of the site back in the order of the page on the third click', async ({ page }) => {
  await page.goto('/tegenstanders')
  await clickThreeTimes(page, 'G gespeeld')
})

test('puts a table of the admin back in the order of the page on the third click', async ({
  baseURL,
  context,
  page,
}) => {
  await context.addCookies([adminCookie(new URL(baseURL ?? '').hostname)])
  await page.goto('/beheer/clubs')
  await clickThreeTimes(page, 'Club')
})
