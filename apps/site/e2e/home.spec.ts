import { expect, test } from '@playwright/test'

import { headlines } from './headlines'

// The headlines are made up and put in the database by global-setup.ts. The axe check of this page is in pages.spec.ts;
// this file checks what axe doesn't see: the order of the headings, what is shown and left out, and the size of the links.

test('has the headings in order: an h1, an h2 for the news and an h3 for each day', async ({ page }) => {
  await page.goto('/')

  const levels = await page.getByRole('heading').evaluateAll((headings) => headings.map((h) => Number(h.tagName[1])))

  expect(levels.slice(0, 2)).toEqual([1, 2])
  // The items are spread over at least four days, so there are at least four day headings.
  expect(levels.slice(2).length).toBeGreaterThanOrEqual(4)
  expect(levels.slice(2).every((level) => level === 3)).toBe(true)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('sc Heerenveen in de media')
})

test('shows the news of the week as links to the sources, and leaves out the rest', async ({ page }) => {
  await page.goto('/')

  for (const { domain, title } of headlines.insideTheWeek) {
    const link = page.getByRole('link', { exact: true, name: title })

    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', new RegExp(`^https://${domain.replaceAll('.', '\\.')}/`))
    // The same tab: there is no target.
    expect(await link.getAttribute('target')).toBeNull()
  }

  // Older than the week, and from a source that is switched off.
  await expect(page.getByText(headlines.outsideTheWeek.title)).toHaveCount(0)
  await expect(page.getByText(headlines.disabledSource.title)).toHaveCount(0)
  await expect(page.getByText('We hebben deze week nog geen nieuws gevonden')).toHaveCount(0)
  await expect(page.getByRole('main').getByRole('link', { name: 'Onze bronnen' })).toHaveAttribute('href', '/bronnen')
})

test('gives each item its source, its time and, behind a paywall, "voor abonnees" in text', async ({ page }) => {
  await page.goto('/')

  for (const { paywalled, source, title } of headlines.insideTheWeek) {
    const line = page.getByRole('listitem').filter({ has: page.getByRole('link', { exact: true, name: title }) })

    // The name of the source is what the register says: the credit line, or else the name.
    await expect(line.getByText(source, { exact: true })).toBeVisible()
    await expect(line.getByText('voor abonnees')).toHaveCount(paywalled ? 1 : 0)
    await expect(line.locator('time')).toHaveText(/^\d{2}:\d{2}$/)
    await expect(line.locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/)
  }
})

for (const width of [1280, 320]) {
  test(`makes every headline a link of at least 24 pixels high in a window of ${width} pixels`, async ({ page }) => {
    await page.setViewportSize({ height: 800, width })
    await page.goto('/')

    for (const link of await page.getByRole('main').getByRole('listitem').getByRole('link').all()) {
      const box = await link.boundingBox()

      expect(box?.height, (await link.textContent()) ?? '').toBeGreaterThanOrEqual(24)
    }
  })
}

test('loads nothing from another domain', async ({ baseURL, page }) => {
  const origins = new Set<string>()

  page.on('request', (request) => origins.add(new URL(request.url()).origin))
  await page.goto('/', { waitUntil: 'networkidle' })

  expect([...origins]).toEqual([new URL(baseURL ?? '').origin])
})
