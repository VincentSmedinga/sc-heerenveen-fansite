import { expect, test } from '@playwright/test'

// A scrollbar that takes room, as on Windows. Playwright hides the scrollbars of headless Chromium, and a header of 100vw
// would then look right. With this one, 100vw is 15 pixels wider than the page, and the page scrolls sideways. The window
// is lower than the page, because the page has no scrollbar when it fits.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } })

const visibleScrollbar = 'html { overflow-y: scroll } ::-webkit-scrollbar { width: 15px }'

// The margin on either side of the column, and its widest, from the tokens of the design system. The main column is
// narrower than the column of the page (content-column.spec.ts checks that).
const margin = 16
const columnWidth = 1200
const contentWidth = 768

for (const width of [320, 1920]) {
  test(`the header runs from edge to edge in a window of ${width} pixels, with the logo in line with the content`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 300, width })
    await page.goto('/')
    await page.addStyleTag({ content: visibleScrollbar })

    // The scrollbar appears on the next frame.
    await expect
      .poll(() => page.evaluate(() => innerWidth - document.documentElement.clientWidth), 'the scrollbar takes room')
      .toBe(15)

    const pageWidth = await page.evaluate(() => document.documentElement.clientWidth)
    const header = await page.getByRole('banner').boundingBox()
    const logo = await page.getByRole('banner').getByRole('link').first().boundingBox()
    const main = await page.getByRole('main').boundingBox()
    const footer = await page.getByRole('contentinfo').boundingBox()

    expect(header?.x).toBe(0)
    expect(header?.width).toBe(pageWidth)

    // The column is between the margins and no wider than the maximum. The footer fills it. The content starts in line with
    // it, and is no wider than its own maximum.
    expect(footer?.width).toBeCloseTo(Math.min(pageWidth - 2 * margin, columnWidth), 1)
    expect(main?.width).toBeCloseTo(Math.min(pageWidth - 2 * margin, contentWidth), 1)
    expect(footer?.x).toBeCloseTo(main?.x ?? NaN, 1)
    expect(logo?.x).toBeCloseTo(main?.x ?? NaN, 1)

    const tooWide = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(tooWide, 'the page scrolls sideways').toBe(0)
  })
}
