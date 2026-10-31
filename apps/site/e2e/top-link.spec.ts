import type { Page } from '@playwright/test'

import { expect, test } from '@playwright/test'

import { checkPage } from './check-page'

// The link to the top in the footer is there when the page can scroll further than the height
// of the window. That is a scroll-driven animation in CSS, which jsdom doesn't have and axe
// doesn't see. A browser that doesn't apply it shows the link always, which no unit test would
// notice. The address doesn't matter, so pages that don't read the database will do.
const longPage = '/privacy'
const shortPage = '/contact/verstuurd'
const link = (page: Page) => page.getByRole('link', { name: 'Naar boven' })

// Instant, so the check does not have to wait for the smooth scrolling of the page.
const scrollTo = (page: Page, top: number) =>
  page.evaluate((to) => window.scrollTo({ behavior: 'instant', top: to }), top)

// The scroll position drives the animation that shows the link, and the browser applies it in
// the next frame, not in the task of scrollTo. A key press or a focus() before that frame meets
// a link that is still hidden. Wait for this before using the keyboard.
const waitUntilShown = (page: Page) => expect(page.locator('.hf-page-top-link')).toHaveCSS('visibility', 'visible')

const heights = (page: Page) =>
  page.evaluate(() => ({
    page: document.documentElement.scrollHeight,
    scrollY: Math.round(window.scrollY),
    window: window.innerHeight,
  }))

test.describe('the link to the top in the footer', () => {
  test('is not there on a page that fits in the window, not even at the bottom', async ({ page }) => {
    await page.setViewportSize({ height: 3000, width: 1280 })
    await page.goto(shortPage)
    const { page: pageHeight, window: windowHeight } = await heights(page)

    expect(pageHeight).toBeLessThanOrEqual(windowHeight)
    await expect(page.locator('.hf-page-top-link')).toBeHidden()
    await expect(page.locator('.hf-page-top-link')).toHaveCSS('visibility', 'hidden')
    // A hidden link is not in the accessibility tree, and the keyboard does not stop at it.
    await expect(link(page)).toHaveCount(0)
    await page.getByRole('navigation', { name: 'Over de site' }).getByRole('link').last().focus()
    await page.keyboard.press('Tab')
    await expect(page.locator('.hf-page-top-link')).not.toBeFocused()
  })

  test('is not there on a page that can scroll less than the height of the window', async ({ page }) => {
    // A page that is higher than the window, but not twice as high.
    await page.setViewportSize({ height: 800, width: 1280 })
    await page.goto(shortPage)
    await page.evaluate(() => {
      document.body.style.minBlockSize = `${Math.round(window.innerHeight * 1.8)}px`
    })
    const { page: pageHeight, window: windowHeight } = await heights(page)

    expect(pageHeight).toBeGreaterThan(windowHeight)
    expect(pageHeight).toBeLessThan(windowHeight * 2)
    await scrollTo(page, pageHeight)
    await expect(page.locator('.hf-page-top-link')).toHaveCSS('visibility', 'hidden')
  })

  test('is there at the bottom of a page that is more than twice as high as the window, and not at the top', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 500, width: 390 })
    await page.goto(longPage)
    const { page: pageHeight, window: windowHeight } = await heights(page)

    expect(pageHeight).toBeGreaterThan(windowHeight * 2)
    await expect(link(page)).toHaveCount(0)
    await expect(page.locator('.hf-page-top-link')).toHaveCSS('visibility', 'hidden')

    await scrollTo(page, pageHeight)
    await expect(link(page)).toBeVisible()
    await expect(page.locator('.hf-page-top-link')).toHaveCSS('visibility', 'visible')
  })

  test('appears when the page has scrolled further than the height of the window, and not before', async ({ page }) => {
    await page.setViewportSize({ height: 500, width: 390 })
    await page.goto(longPage)
    const { window: windowHeight } = await heights(page)
    const topLink = page.locator('.hf-page-top-link')

    await scrollTo(page, windowHeight - 1)
    await expect(topLink).toHaveCSS('visibility', 'hidden')
    await scrollTo(page, windowHeight)
    await expect(topLink).toHaveCSS('visibility', 'hidden')
    await scrollTo(page, windowHeight + 2)
    await expect(topLink).toHaveCSS('visibility', 'visible')
    // And it goes again when the visitor scrolls back.
    await scrollTo(page, 0)
    await expect(topLink).toHaveCSS('visibility', 'hidden')
  })

  test('is last in the footer, so the keyboard reaches it after the other links', async ({ page }) => {
    await page.setViewportSize({ height: 500, width: 390 })
    await page.goto(longPage)
    await scrollTo(page, (await heights(page)).page)
    await waitUntilShown(page)

    await page.getByRole('navigation', { name: 'Over de site' }).getByRole('link').last().focus()
    await page.keyboard.press('Tab')
    await expect(link(page)).toBeFocused()
    await expect(link(page)).toHaveCSS('outline-style', 'solid')
  })

  test('is round, 44 pixels, on the right and over the stripes, without taking room from the text or the links', async ({
    page,
  }) => {
    for (const width of [320, 390, 640, 900]) {
      await page.setViewportSize({ height: 500, width })
      await page.goto(longPage)
      await scrollTo(page, (await heights(page)).page)
      const box = await link(page).boundingBox()
      const footer = await page.getByRole('contentinfo').boundingBox()
      const text = await page.getByRole('contentinfo').locator('p').last().boundingBox()
      const links = await page.getByRole('navigation', { name: 'Over de site' }).boundingBox()

      expect(box?.width, `${width}`).toBe(44)
      expect(box?.height, `${width}`).toBe(44)
      // On the right, inside the footer.
      expect((box?.x ?? 0) + (box?.width ?? 0), `${width}`).toBeLessThanOrEqual((footer?.x ?? 0) + (footer?.width ?? 0))
      expect((box?.x ?? 0) + (box?.width ?? 0), `${width}`).toBeGreaterThan(width - 40)
      // Not over the text, and not over the links.
      expect(box?.x, `${width}`).toBeGreaterThanOrEqual((text?.x ?? 0) + (text?.width ?? 0))
      const overLinks =
        (box?.x ?? 0) < (links?.x ?? 0) + (links?.width ?? 0) &&
        (box?.y ?? 0) < (links?.y ?? 0) + (links?.height ?? 0) &&
        (box?.x ?? 0) + (box?.width ?? 0) > (links?.x ?? 0) &&
        (box?.y ?? 0) + (box?.height ?? 0) > (links?.y ?? 0)
      expect(overLinks, `${width}`).toBe(false)
      // The page is not wider than the window, also at 400% zoom (320 pixels).
      const sideways = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(sideways, `${width}`).toBeLessThanOrEqual(0)
    }
  })

  test('brings the page to the top, and the next Tab starts at the top of the page', async ({ page }) => {
    await page.setViewportSize({ height: 500, width: 390 })
    await page.goto(longPage)
    await scrollTo(page, (await heights(page)).page)
    expect((await heights(page)).scrollY).toBeGreaterThan(500)

    await link(page).click()
    // The page scrolls smoothly, so it takes a moment.
    await expect.poll(async () => (await heights(page)).scrollY).toBe(0)
    await expect(page).toHaveURL(/#top$/)

    // The first thing the keyboard reaches is the start of the page: the logo, not the footer.
    await page.keyboard.press('Tab')
    await expect(page.getByRole('banner').getByRole('link').first()).toBeFocused()
  })

  test('works with the keyboard', async ({ page }) => {
    await page.setViewportSize({ height: 500, width: 390 })
    await page.goto(longPage)
    await scrollTo(page, (await heights(page)).page)
    await waitUntilShown(page)

    await link(page).focus()
    await page.keyboard.press('Enter')
    await expect.poll(async () => (await heights(page)).scrollY).toBe(0)
    await page.keyboard.press('Tab')
    await expect(page.getByRole('banner').getByRole('link').first()).toBeFocused()
  })

  test('works without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { height: 500, width: 390 } })
    const page = await context.newPage()

    await page.goto(longPage)
    await expect(link(page)).toHaveCount(0)
    await page.keyboard.press('End')
    await expect(link(page)).toBeVisible()
    await link(page).click()
    await expect.poll(async () => (await heights(page)).scrollY).toBe(0)
    await context.close()
  })

  test('scrolls at once with less motion, and smoothly otherwise', async ({ page }) => {
    await page.setViewportSize({ height: 500, width: 390 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(longPage)
    await scrollTo(page, (await heights(page)).page)
    await link(page).click()
    // At once: the next frame is already at the top.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    expect((await heights(page)).scrollY).toBe(0)

    await page.emulateMedia({ reducedMotion: 'no-preference' })
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('smooth')
  })

  test('is not printed', async ({ page }) => {
    await page.setViewportSize({ height: 500, width: 390 })
    await page.goto(longPage)
    await scrollTo(page, (await heights(page)).page)
    await expect(link(page)).toBeVisible()

    await page.emulateMedia({ media: 'print' })
    await expect(page.locator('.hf-page-top-link')).toHaveCSS('display', 'none')
  })

  test('has a rim in a system colour in forced colours', async ({ page }) => {
    await page.setViewportSize({ height: 500, width: 390 })
    await page.emulateMedia({ forcedColors: 'active' })
    await page.goto(longPage)
    await scrollTo(page, (await heights(page)).page)

    const colours = await link(page).evaluate((element) => {
      const style = getComputedStyle(element)

      return { border: style.borderTopColor, colour: style.color }
    })
    // A system colour is not one of ours: the link takes the colours of the system.
    expect(colours.border).not.toBe('rgba(0, 0, 0, 0)')
    expect(colours.colour).toBe(colours.border)
  })

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`passes axe at the bottom of a long page in ${colorScheme}, with the link in view`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await page.setViewportSize({ height: 500, width: 390 })
      await page.goto(longPage)
      await scrollTo(page, (await heights(page)).page)
      await expect(link(page)).toBeVisible()

      expect(await checkPage(page)).toEqual([])
    })
  }
})
