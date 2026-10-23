import { expect, test } from '@playwright/test'

// The footer has two lines of text on the left and the links on the right, centred on the text. On a screen narrower than
// 40 rem, the links are under the text, on the left. header.spec.ts checks that the footer runs from edge to edge.

// The widest the column of the page gets, from --hf-page-max-width in the design system.
const columnWidth = 1200

test('puts the links in the footer on the right of the two lines of text on a wide screen, centred on them', async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1920 })
  await page.goto('/over-ons')

  const logo = await page.getByRole('banner').getByRole('link').first().boundingBox()
  const first = await page.getByRole('contentinfo').getByRole('paragraph').first().boundingBox()
  const last = await page.getByRole('contentinfo').getByRole('paragraph').last().boundingBox()
  const links = await page.getByRole('contentinfo').getByRole('navigation').boundingBox()

  // The two lines right under each other, in line with the logo.
  expect(first?.x).toBeCloseTo(logo?.x ?? NaN, 1)
  expect(last?.x).toBeCloseTo(logo?.x ?? NaN, 1)
  expect(last?.y).toBeCloseTo((first?.y ?? NaN) + (first?.height ?? NaN), 1)

  // The links at the end of the column, centred on the two lines.
  expect((links?.x ?? NaN) + (links?.width ?? NaN)).toBeCloseTo((logo?.x ?? NaN) + columnWidth, 1)
  expect((links?.y ?? NaN) + (links?.height ?? NaN) / 2).toBeCloseTo(
    ((first?.y ?? NaN) + (last?.y ?? NaN) + (last?.height ?? NaN)) / 2,
    0,
  )
})

test('puts the links in the footer under the text on a narrow screen, on the left', async ({ page }) => {
  await page.setViewportSize({ height: 800, width: 320 })
  await page.goto('/over-ons')

  const first = await page.getByRole('contentinfo').getByRole('paragraph').first().boundingBox()
  const last = await page.getByRole('contentinfo').getByRole('paragraph').last().boundingBox()
  const links = await page.getByRole('contentinfo').getByRole('navigation').boundingBox()

  expect(last?.y).toBeCloseTo((first?.y ?? NaN) + (first?.height ?? NaN), 1)
  expect(links?.x).toBeCloseTo(first?.x ?? NaN, 1)
  expect(links?.y).toBeGreaterThanOrEqual((last?.y ?? NaN) + (last?.height ?? NaN))
})
