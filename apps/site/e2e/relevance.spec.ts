import { expect, test } from '@playwright/test'

import { adminCookie, adminItems } from './admin'
import { checkPage } from './check-page'
import { headlines } from './headlines'

// The importer keeps the items it finds doubtful or not about the club, and the site never
// shows them to a visitor (#74). Only the admin lists them, so a moderator can find them.

const [doubtful, irrelevant] = headlines.notForVisitors

const visitorPages = [
  '/',
  '/nieuws',
  '/nieuws?bron=testkrant',
  '/nieuws/podcasts',
  '/nieuws/podcasts?podcast=testpodcast',
  '/bronnen',
  '/over-ons',
]

test.describe('the items that are not relevant', () => {
  for (const path of visitorPages) {
    test(`are on no page for a visitor: ${path}`, async ({ page }) => {
      await page.goto(path)

      const html = await page.content()

      expect(html).not.toContain(doubtful?.title ?? 'missing')
      expect(html).not.toContain(irrelevant?.title ?? 'missing')
    })
  }

  test('are in the list of the admin that is not on the site, with what the importer found', async ({
    baseURL,
    context,
    page,
  }) => {
    await context.addCookies([adminCookie(new URL(baseURL ?? '').hostname)])
    await page.goto('/beheer/berichten?q=Verzonnen')

    await expect(page.getByRole('link', { name: doubtful?.title ?? '' })).toBeHidden()
    await expect(page.getByRole('link', { name: irrelevant?.title ?? '' })).toBeHidden()

    await page.goto('/beheer/berichten?q=Verzonnen&toon=niet-op-de-site')

    await expect(page.getByRole('link', { name: doubtful?.title ?? '' })).toBeVisible()
    await expect(page.getByRole('link', { name: irrelevant?.title ?? '' })).toBeVisible()
    await expect(page.getByText('twijfelgeval, niet op de site')).toBeVisible()
    await expect(page.getByText('niet over de club, niet op de site')).toBeVisible()
    // The importer leaves them off the site, so hiding them would do nothing: no form for it.
    await expect(page.getByRole('button', { name: /^Verberg:/ })).toBeHidden()
  })
})

// A moderator puts a doubtful item on the site, and takes it back. The item sits on the source
// that is switched off (see admin.ts), so no other check reads it. "On the site" is the group
// of the admin that is called so: the made-up source is off, so no page of a visitor shows it.
test.describe('an item that a moderator approves', () => {
  const title = adminItems.approving

  test('is on the site after "Op de site zetten", and off it after "Terug naar het oordeel van het filter"', async ({
    baseURL,
    context,
    page,
  }) => {
    await context.addCookies([adminCookie(new URL(baseURL ?? '').hostname)])
    await page.goto(`/beheer/berichten?q=${encodeURIComponent(title)}&toon=niet-op-de-site`)

    const itemOf = () => page.getByRole('listitem').filter({ has: page.getByRole('link', { name: title }) })

    await expect(itemOf().getByText('twijfelgeval, niet op de site')).toBeVisible()
    await itemOf()
      .getByRole('button', { name: `Op de site zetten: ${title}` })
      .click()

    await expect(page.getByRole('heading', { name: 'Op de site gezet' })).toBeVisible()
    await expect(page.getByRole('link', { name: title })).toBeHidden()
    expect(await checkPage(page)).toEqual([])

    await page.getByRole('link', { exact: true, name: 'Op de site' }).click()
    await expect(itemOf().getByText('door een moderator op de site gezet', { exact: false }).first()).toBeVisible()
    await expect(itemOf().getByText(/door .+@.+\./)).toBeVisible()

    await itemOf()
      .getByRole('button', { name: `Herstellen, terug naar het oordeel van het filter: ${title}` })
      .click()

    await expect(page.getByRole('heading', { name: 'Terug naar het oordeel van het filter' })).toBeVisible()
    await expect(page.getByRole('link', { name: title })).toBeHidden()

    await page.getByRole('link', { exact: true, name: 'Niet op de site' }).click()
    await expect(itemOf().getByText('twijfelgeval, niet op de site')).toBeVisible()
    await expect(itemOf().getByRole('button', { name: `Op de site zetten: ${title}` })).toBeVisible()
  })
})
