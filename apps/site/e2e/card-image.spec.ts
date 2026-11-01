import { expect, type Page, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

import { hexOf, readPng } from '../src/read-png'

// The card is drawn 29 rem wide, with the padding it has in the sidebar of a wide screen, in a
// frame of one and a half rem. So the image is 32 rem wide, at twice the size 32 x 16 x 2
// pixels, whatever the window.
const imageWidth = 32 * 16 * 2

const button = (page: Page) => page.getByRole('button', { name: 'Maak een afbeelding van Stand' })

/** The addresses the page asks for, apart from its own and the `data:` and `blob:` ones. */
function watchForeignRequests(page: Page) {
  const foreign: string[] = []

  page.on('request', (request) => {
    const url = request.url()

    if (!url.startsWith(new URL(page.url() === 'about:blank' ? 'http://127.0.0.1' : page.url()).origin)) {
      if (!/^(data|blob):/.test(url)) {
        foreign.push(url)
      }
    }
  })

  return foreign
}

// The unit tests can't see this: it needs a browser that draws the card, with the fonts and the
// styles of the real page, under the content security policy of the site.
test.describe('the image of a card on /wedstrijden', () => {
  test('is downloaded as a PNG of the card with its strip, without a request to another domain', async ({ page }) => {
    // A browser without file sharing, so the download is the way out.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'canShare', { value: undefined })
    })
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/wedstrijden')
    const foreign = watchForeignRequests(page)
    const violations: string[] = []

    page.on('console', (message) => {
      if (message.text().includes('Content Security Policy')) {
        violations.push(message.text())
      }
    })

    const download = page.waitForEvent('download')

    await button(page).click()

    const file = await download

    expect(file.suggestedFilename()).toMatch(/^sc-heerenveen-stand-\d{4}-\d{2}-\d{2}\.png$/)

    const png = readPng(await readFile(await file.path()))
    const colours = new Set<string>()

    expect(png.width).toBe(imageWidth)
    expect(png.height).toBeGreaterThan(300)

    // Not an empty image: a pixel every so often holds more than one colour.
    for (let y = 0; y < png.height; y += 7) {
      for (let x = 0; x < png.width; x += 7) {
        colours.add(hexOf(png.pixel(x, y)))
      }
    }

    expect(colours.size).toBeGreaterThan(5)
    await expect(page.getByRole('status').filter({ hasText: 'Afbeelding is klaar' })).toHaveCount(1)
    expect(foreign).toEqual([])
    expect(violations).toEqual([])
  })

  test('leaves the line "Laatst gewijzigd" out, though the card on the page has it', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'canShare', { value: undefined })
      // Writes down the text of the copy of the card that the image is drawn from.
      const copies: string[] = []

      Object.assign(window, { copies })
      new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node instanceof HTMLElement && node.matches('.hf-card-share-copy')) {
              copies.push(node.textContent ?? '')
            }
          }
        }
      }).observe(document, { childList: true, subtree: true })
    })
    await page.setViewportSize({ height: 800, width: 390 })
    await page.goto('/wedstrijden')
    // The card on the page ends with the date of the source.
    await expect(page.locator('section[aria-labelledby="stand"]')).toContainText('Laatst gewijzigd:')

    const download = page.waitForEvent('download')

    await button(page).click()
    await download

    const copies = await page.evaluate(() => (window as unknown as { copies: string[] }).copies)

    expect(copies).toHaveLength(1)
    expect(copies[0]).toContain('Stand')
    expect(copies[0]).not.toContain('Laatst gewijzigd')
  })

  test('is shared with the share sheet where the browser can share files, and a closed sheet is no error', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const shared: { files: number; title: string | undefined }[] = []
      let cancel = false

      Object.assign(window, { cancelShare: () => (cancel = true), shared })
      navigator.canShare = () => true
      navigator.share = (data) => {
        shared.push({ files: data?.files?.length ?? 0, title: data?.title })

        return cancel ? Promise.reject(new DOMException('Cancelled', 'AbortError')) : Promise.resolve()
      }
    })
    await page.goto('/wedstrijden')

    await button(page).click()
    await expect(page.getByRole('status').filter({ hasText: 'Afbeelding is klaar' })).toHaveCount(1)
    expect(await page.evaluate(() => (window as unknown as { shared: unknown[] }).shared)).toEqual([
      { files: 1, title: 'Stand' },
    ])

    await page.evaluate(() => (window as unknown as { cancelShare: () => void }).cancelShare())
    await button(page).click()
    await expect(page.getByRole('status').filter({ hasText: 'Afbeelding is klaar' })).toHaveCount(0)
    await expect(page.getByText('Het maken van de afbeelding is niet gelukt.')).toHaveCount(0)
    await expect(button(page)).not.toHaveAttribute('aria-disabled', 'true')
  })

  test('has a button on the five statistics cards that have facts, and on no other card', async ({ page }) => {
    await page.goto('/wedstrijden')

    await expect(button(page)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Maak een afbeelding van / })).not.toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Maak een afbeelding van (Programma|Uitslagen)$/ })).toHaveCount(0)

    await page.goto('/')
    await expect(page.getByRole('button', { name: /^Maak een afbeelding van / })).toHaveCount(0)
  })
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('a card has no button for an image, which would do nothing', async ({ page }) => {
    await page.goto('/wedstrijden')

    await expect(page.getByRole('heading', { name: 'Stand' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Maak een afbeelding van / })).toHaveCount(0)
  })
})
