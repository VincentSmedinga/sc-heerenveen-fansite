import type { Page } from '@playwright/test'

import { expect, test } from '@playwright/test'

import { adminCookie, adminItems } from './admin'
import { checkPage } from './check-page'

// Hides and shows a made-up item in the admin, as the moderator of the global setup, once with JavaScript and once
// without. The forms are plain posts, so both have to work. The items sit on the source that is switched off (see admin.ts),
// so no other check reads them, and the checks here run one after the other because they change what they read.

test.describe.configure({ mode: 'serial' })

test.beforeEach(async ({ baseURL, context }) => {
  await context.addCookies([adminCookie(new URL(baseURL ?? '').hostname)])
})

/** The form of an item in the list: the one under its headline. */
const itemOf = (page: Page, title: string) =>
  page.getByRole('listitem').filter({ has: page.getByRole('link', { name: title }) })

for (const [name, javaScriptEnabled, title] of [
  ['with JavaScript', true, adminItems.withScript],
  ['without JavaScript', false, adminItems.withoutScript],
] as const) {
  test.describe(name, () => {
    test.use({ javaScriptEnabled })

    test(`hides an item with a reason and shows it again ${name}`, async ({ page }) => {
      await page.goto(`/beheer/berichten?q=${encodeURIComponent(title)}`)
      await expect(page.getByRole('link', { name: title })).toBeVisible()

      // No reason: the item stays, and the error is at the field, in the summary and in the text.
      await itemOf(page, title)
        .getByRole('button', { name: `Verberg: ${title}` })
        .click()
      await expect(page.getByRole('heading', { name: 'Er is iets mis' })).toBeVisible()
      await expect(itemOf(page, title).getByText('Schrijf een reden')).toBeVisible()
      await expect(itemOf(page, title).getByLabel('Reden')).toHaveAttribute('aria-invalid', 'true')
      if (javaScriptEnabled) {
        // axe is a script that runs in the page, so it can't check a page without JavaScript.
        expect(await checkPage(page)).toEqual([])
      }

      // With a reason: the item is hidden, the page says when it is gone from the site, and the search is kept.
      await itemOf(page, title).getByLabel('Reden').fill('Fout in het bericht')
      await itemOf(page, title)
        .getByRole('button', { name: `Verberg: ${title}` })
        .click()
      await expect(page.getByRole('heading', { name: 'Verborgen' })).toBeVisible()
      await expect(page.getByText(`${title}. Staat binnen vijf minuten niet meer op de site.`)).toBeVisible()
      await expect(itemOf(page, title).getByText('Reden: Fout in het bericht')).toBeVisible()
      await expect(page.getByLabel('Zoeken')).toHaveValue(title)
      if (javaScriptEnabled) {
        // axe is a script that runs in the page, so it can't check a page without JavaScript.
        expect(await checkPage(page)).toEqual([])
      }

      // Shown again.
      await itemOf(page, title)
        .getByRole('button', { name: `Toon weer: ${title}` })
        .click()
      await expect(page.getByRole('heading', { name: 'Weer getoond' })).toBeVisible()
      await expect(itemOf(page, title).getByRole('button', { name: `Verberg: ${title}` })).toBeVisible()
      if (javaScriptEnabled) {
        // axe is a script that runs in the page, so it can't check a page without JavaScript.
        expect(await checkPage(page)).toEqual([])
      }
    })
  })
}

test('sends a visitor without a session to the login page', async ({ context, page }) => {
  await context.clearCookies()

  await page.goto('/beheer/berichten')

  await expect(page).toHaveURL(/\/beheer\/inloggen$/)
})
