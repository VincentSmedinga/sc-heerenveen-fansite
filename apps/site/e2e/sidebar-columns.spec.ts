import type { Page } from '@playwright/test'

import { expect, test } from '@playwright/test'

// The cells of the sidebar sit in two equal columns under the main column from 40 rem (640 pixels) to 77 rem (1232
// pixels), under each other below that, and beside the main column from 77 rem on. /bronnen has a sidebar with two cards.

const boxesOf = async (page: Page) => {
  const main = await page.getByRole('main').boundingBox()
  const sidebar = page.getByRole('complementary', { name: 'Contact over bronnen' })
  const first = await sidebar.locator(':scope > *').nth(0).boundingBox()
  const second = await sidebar.locator(':scope > *').nth(1).boundingBox()

  return { first, main, second }
}

test('puts the two cards in the sidebar side by side, under the main column, on a middle-sized screen', async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 800 })
  await page.goto('/bronnen')

  const { first, main, second } = await boxesOf(page)

  expect(first?.y).toBeCloseTo(second?.y ?? NaN, 1)
  expect(first?.width).toBeCloseTo(second?.width ?? NaN, 1)
  expect(second?.x).toBeGreaterThan((first?.x ?? NaN) + (first?.width ?? NaN))
  expect(first?.y).toBeGreaterThanOrEqual((main?.y ?? NaN) + (main?.height ?? NaN))
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(800)
})

test('puts the two cards in the sidebar under each other on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ height: 800, width: 360 })
  await page.goto('/bronnen')

  const { first, second } = await boxesOf(page)

  expect(second?.x).toBeCloseTo(first?.x ?? NaN, 1)
  expect(second?.width).toBeCloseTo(first?.width ?? NaN, 1)
  expect(second?.y).toBeGreaterThanOrEqual((first?.y ?? NaN) + (first?.height ?? NaN))
})

test('puts the sidebar beside the main column on a wide screen', async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1920 })
  await page.goto('/bronnen')

  const { first, main, second } = await boxesOf(page)

  expect(first?.x).toBeGreaterThanOrEqual((main?.x ?? NaN) + (main?.width ?? NaN))
  expect(second?.x).toBeCloseTo(first?.x ?? NaN, 1)
  expect(second?.y).toBeGreaterThanOrEqual((first?.y ?? NaN) + (first?.height ?? NaN))
})
