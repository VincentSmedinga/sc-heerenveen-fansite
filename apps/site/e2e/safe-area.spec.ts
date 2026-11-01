import { expect, test } from '@playwright/test'

// The tags are made by Next.js from the viewport and metadata of the layout, so a unit test
// can't see what a browser gets. A page that loses viewport-fit=cover draws inside the safe
// area again, with a bar of the page colour next to the header. The address doesn't matter, so
// the page without a database is enough.
test.describe('the page on a screen with a notch', () => {
  test('asks for the whole screen in the viewport tag', async ({ page }) => {
    await page.goto('/over-ons')

    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /(^|, )viewport-fit=cover(,|$)/)
  })

  test('makes the status bar of the home screen app see-through', async ({ page }) => {
    await page.goto('/over-ons')

    await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute(
      'content',
      'black-translucent',
    )
  })

  test('has the strip for the status bar as the first element of the page, hidden from a screen reader', async ({
    page,
  }) => {
    await page.goto('/over-ons')

    const edge = page.locator('.hf-page > .hf-page-top-edge:first-child')

    await expect(edge).toHaveCount(1)
    await expect(edge).toHaveAttribute('aria-hidden', 'true')
    await expect(edge).toBeEmpty()
  })

  // What this can't show: Safari on an iPhone, which colours its status bar from the strip.
  // There the strip is at least 8px tall (-webkit-touch-callout, which Chromium doesn't know),
  // and only the phone shows the colour of the bar.
  test('is fixed, takes no touch, and has no height without a top inset', async ({ page }) => {
    await page.goto('/over-ons')

    const style = await page
      .locator('.hf-page-top-edge')
      .evaluate((edge) => ({ ...getComputedStyle(edge) }) as unknown as Record<string, string>)

    expect(style['position']).toBe('fixed')
    expect(style['pointerEvents']).toBe('none')
    expect(style['height']).toBe('0px')
  })

  for (const scheme of ['light', 'dark'] as const) {
    test(`has the colour of the header and of theme-color in ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto('/over-ons')

      const colours = await page.evaluate((wanted) => {
        // The same colour in the notation of getComputedStyle, from a hex code or from a name.
        const normalise = (value: string) => {
          const probe = document.createElement('div')

          probe.style.color = value
          document.body.append(probe)
          const result = getComputedStyle(probe).color

          probe.remove()

          return result
        }
        const background = (selector: string) => getComputedStyle(document.querySelector(selector)!).backgroundColor
        const themeColour = document.querySelector<HTMLMetaElement>(`meta[name="theme-color"][media*="${wanted}"]`)

        return {
          edge: background('.hf-page-top-edge'),
          header: background('header'),
          themeColour: normalise(themeColour?.content ?? ''),
        }
      }, scheme)

      expect(colours.edge).toBe(colours.header)
      expect(colours.themeColour).toBe(colours.header)
    })
  }

  test('follows the theme button, and is back on the page a moment after pressing it', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/over-ons')

    const edge = page.locator('.hf-page-top-edge')
    const header = page.locator('header')
    const colourOf = (element: typeof edge) => element.evaluate((node) => getComputedStyle(node).backgroundColor)
    const lightHeader = await colourOf(header)

    await page.getByRole('button', { name: 'Donker' }).click()

    // Safari only reads the colour of the strip again when it has been off the page for a
    // moment, so it must come back: without this it would be gone for good.
    await expect.poll(() => edge.evaluate((node) => (node as HTMLElement).style.display)).toBe('')
    expect(await colourOf(edge)).toBe(await colourOf(header))
    expect(await colourOf(edge)).not.toBe(lightHeader)
  })

  // In Safari on an iPhone the status bar has the colour of the strip, so the strip must stay,
  // in the blue of the theme, when the header has scrolled away. Only a phone shows the colour
  // of the bar itself.
  for (const scheme of ['light', 'dark'] as const) {
    test(`stays on the page in the colour of the header after scrolling, in ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.setViewportSize({ height: 400, width: 390 })
      await page.goto('/over-ons')

      const edge = page.locator('.hf-page-top-edge')
      const colourOf = (selector: string) =>
        page.evaluate((s) => getComputedStyle(document.querySelector(s)!).backgroundColor, selector)
      const atTop = await colourOf('.hf-page-top-edge')

      await page.evaluate(() => window.scrollTo(0, document.querySelector('header')!.offsetHeight + 100))
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100)

      // The header is off the screen now, and the strip is still there and has the same colour.
      await expect(edge).not.toHaveAttribute('hidden')
      expect(await edge.evaluate((node) => getComputedStyle(node).display)).not.toBe('none')
      expect(await colourOf('.hf-page-top-edge')).toBe(atTop)
      expect(atTop).toBe(await colourOf('header'))

      await page.evaluate(() => window.scrollTo(0, 0))
      await expect(edge).not.toHaveAttribute('hidden')
      expect(await colourOf('.hf-page-top-edge')).toBe(atTop)
    })
  }
})
