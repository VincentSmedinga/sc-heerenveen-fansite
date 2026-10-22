import { expect, test } from '@playwright/test'

// The content of every page is in the main column, which starts in line with the logo, with room beside it for a sidebar.
// These are the pages with text of some length. The second copy of the site has no database, so its pages are the error
// page (see playwright.config.ts).
const pages = [
  { origin: undefined, path: '/' },
  { origin: undefined, path: '/bronnen' },
  { origin: undefined, path: '/over-ons' },
  { origin: undefined, path: '/wat-is-er-nieuw' },
  { origin: undefined, path: '/bestaat-niet' },
  { origin: 'http://127.0.0.1:3125', path: '/bronnen' },
]

// The widest the main column gets, from --hf-content-max-width in the design system.
const contentWidth = 768
const columnWidth = 1200

for (const { origin = '', path } of pages) {
  test(`${origin}${path} has its content in a main column of 48 rem on a wide screen`, async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1920 })
    await page.goto(`${origin}${path}`)

    const logo = await page.getByRole('banner').getByRole('link').first().boundingBox()
    const main = await page.getByRole('main').boundingBox()
    const footer = await page.getByRole('contentinfo').boundingBox()

    // In line with the logo, no wider than the main column, and the rest of the page column left free.
    expect(main?.x).toBeCloseTo(logo?.x ?? NaN, 1)
    expect(main?.width).toBeCloseTo(contentWidth, 1)
    expect(footer?.width).toBeCloseTo(columnWidth, 1)
  })

  test(`${origin}${path} uses the whole width on a narrow screen`, async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 360 })
    await page.goto(`${origin}${path}`)

    const main = await page.getByRole('main').boundingBox()

    // The window minus the margin of 1 rem on either side.
    expect(main?.width).toBeCloseTo(360 - 32, 1)
  })
}

test('puts 3 rem between the content and the footer', async ({ page }) => {
  // A window lower than the page, so the body doesn't grow to fill it and push the footer down.
  await page.setViewportSize({ height: 300, width: 1920 })
  await page.goto('/over-ons')

  const main = await page.getByRole('main').boundingBox()
  const footer = await page.getByRole('contentinfo').boundingBox()

  // The footer starts where the body ends, and the body ends 3 rem under the main.
  expect((footer?.y ?? NaN) - ((main?.y ?? NaN) + (main?.height ?? NaN))).toBeCloseTo(48, 1)
})

test('counts the padding and the border in the size of the parts of the page', async ({ page }) => {
  await page.goto('/bestaat-niet')

  const boxSizing = await page.evaluate(() =>
    ['.hf-page-header', '.hf-page-body', '.hf-page-footer'].map(
      (selector) => getComputedStyle(document.querySelector(selector)!).boxSizing,
    ),
  )

  expect(boxSizing).toEqual(['border-box', 'border-box', 'border-box'])
})
