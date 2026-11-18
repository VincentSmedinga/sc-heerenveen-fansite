import { expect, test } from '@playwright/test'

// The unit tests can't see this: it needs a browser that wraps the lines of each source at the
// width of a small phone, with the fonts and the styles of the real page.
test.describe('the sources on /bronnen', () => {
  test('are only a name, at most three lines high at 320 px, and the page doesn’t scroll sideways', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 800, width: 320 })
    await page.goto('/bronnen')

    const items = page.locator('[aria-labelledby="nieuws"] li')

    expect(await items.count()).toBeGreaterThan(5)

    const rows = await items.evaluateAll((elements) =>
      elements.map((element) => ({
        height: element.getBoundingClientRect().height,
        lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
        text: (element as HTMLElement).innerText,
      })),
    )

    for (const row of rows) {
      expect(row.height, row.text).toBeLessThanOrEqual(row.lineHeight * 3 + 1)
    }

    // Only the name: no description under it.
    const descriptions = await page.locator('[aria-labelledby="nieuws"] li p').count()

    expect(descriptions).toBe(0)

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )

    expect(overflow).toBe(0)
  })

  test('are read as a list with a heading, and the link of each source is named after it, once', async ({ page }) => {
    await page.goto('/bronnen')

    const card = page.locator('[aria-labelledby="nieuws"]')

    await expect(card.getByRole('heading', { level: 2, name: 'Nieuws' })).toHaveCount(1)
    await expect(card.getByRole('list')).toHaveCount(1)

    const names = await card.getByRole('listitem').getByRole('link').allInnerTexts()

    expect(names.length).toBeGreaterThan(5)
    expect(new Set(names).size).toBe(names.length)
    // The name of a source is the name, without the arrow of the external link.
    expect(names.every((name) => !/[↗→]/u.test(name))).toBe(true)
  })

  test('start with the Frisian sources, then the national ones, in each group in the order of the name', async ({
    page,
  }) => {
    await page.goto('/bronnen')

    const names = await page
      .locator('[aria-labelledby="nieuws"] li')
      .evaluateAll((elements) => elements.map((element) => element.querySelector('a')?.textContent?.trim() ?? ''))
    const position = (name: string) => names.indexOf(name)

    expect(names.slice(0, 3)).toEqual(['Friesch Dagblad', 'Leeuwarder Courant', 'Omrop Fryslân'])
    expect(position('Omrop Fryslân')).toBeLessThan(position('Algemeen Dagblad'))
    expect(position('Nederlands Dagblad')).toBeLessThan(position('Dagblad van het Noorden'))
    expect(position('Dagblad van het Noorden')).toBeLessThan(position('RTV Noord'))
  })

  test('have no publisher next to them', async ({ page }) => {
    await page.goto('/bronnen')

    await expect(page.getByText(/DPG Media|Mediahuis/u)).toHaveCount(0)
  })
})
