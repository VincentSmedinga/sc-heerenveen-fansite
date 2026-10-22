import type { Page } from '@playwright/test'

import { expect, test } from '@playwright/test'

// The content of every page is in a narrower column than the page, with room beside it for a sidebar later. A line of
// running text or a headline holds at most 80 characters there. These are the pages that have text of some length. The
// second copy of the site has no database, so its pages are the error page (see playwright.config.ts).
const pages = [
  { origin: undefined, path: '/' },
  { origin: undefined, path: '/bronnen' },
  { origin: undefined, path: '/bestaat-niet' },
  { origin: 'http://127.0.0.1:3125', path: '/bronnen' },
]

// The widest the content gets, from --hf-content-max-width in the design system.
const contentWidth = 576
const columnWidth = 1200

/**
 * The most characters on one line of text in the main content. Each paragraph, heading and headline is one block: the
 * characters that sit at the same height in it are one line, across the links and the text around them. The spaces count.
 */
function longestLine(page: Page) {
  return page.evaluate(() => {
    let longest = 0

    for (const block of document.querySelectorAll('main :is(h1, h2, h3, h4, p, a.hf-headline)')) {
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
      const range = document.createRange()
      // No line yet: the first character starts one.
      let top = -Infinity
      let count = 0

      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        for (let index = 0; index < (node.textContent ?? '').length; index++) {
          range.setStart(node, index)
          range.setEnd(node, index + 1)

          // White space that the browser collapses has no box.
          const box = range.getClientRects()[0]

          if (box === undefined) {
            continue
          }

          if (Math.abs(box.top - top) > 2) {
            top = box.top
            count = 0
          }

          count++
          longest = Math.max(longest, count)
        }
      }
    }

    return longest
  })
}

for (const { origin = '', path } of pages) {
  test(`${origin}${path} has its content in a column of at most 80 characters on a wide screen`, async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1920 })
    await page.goto(`${origin}${path}`)

    const logo = await page.getByRole('banner').getByRole('link').first().boundingBox()
    const main = await page.getByRole('main').boundingBox()
    const footer = await page.getByRole('contentinfo').boundingBox()

    // In line with the logo, no wider than the content column, and the rest of the page column left free.
    expect(main?.x).toBeCloseTo(logo?.x ?? NaN, 1)
    expect(main?.width).toBeCloseTo(contentWidth, 1)
    expect(footer?.width).toBeCloseTo(columnWidth, 1)
    expect(await longestLine(page)).toBeLessThanOrEqual(80)
  })

  test(`${origin}${path} uses the whole width on a narrow screen`, async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 360 })
    await page.goto(`${origin}${path}`)

    const main = await page.getByRole('main').boundingBox()

    // The window minus the margin of 1 rem on either side.
    expect(main?.width).toBeCloseTo(360 - 32, 1)
  })
}

// The measurement must see a line that is too long, or a green run says nothing.
test('counts the characters of a line that is too long when the column is as wide as the page', async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1920 })
  await page.goto('/bronnen')
  await page.addStyleTag({ content: 'main { max-inline-size: none !important }' })

  expect(await longestLine(page)).toBeGreaterThan(100)
})
