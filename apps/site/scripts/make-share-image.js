// Makes public/share-image.png, the picture that a shared link shows (see shareImage in src/pages.ts): the shield of the
// site, from the logo of the design system, in the middle of a 1200 by 630 picture on the dark blue of the header. It
// draws the SVG in the Chromium of Playwright and takes a screenshot, so it needs no dependency of its own. Run it again
// only when the logo changes, and commit the new PNG.
//
//   pnpm --filter site share-image
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { shareImage } from '../src/pages.ts'

const logoFile = path.resolve(import.meta.dirname, '../../../packages/design-system/src/assets/logo.svg')
const imageFile = path.resolve(import.meta.dirname, '../public', shareImage.path.slice(1))
// blue-900 of the palette, the colour of the header in light.
const background = '#04214e'

const logo = readFileSync(logoFile, 'utf8')
const browser = await chromium.launch()

try {
  const page = await browser.newPage({ viewport: { height: shareImage.height, width: shareImage.width } })
  await page.setContent(`<!doctype html>
<style>
  html, body { background: ${background}; height: 100%; margin: 0; }
  body { align-items: center; display: flex; justify-content: center; }
  svg { height: ${shareImage.height}px; width: ${shareImage.height}px; }
</style>
${logo}`)
  await page.screenshot({ path: imageFile })
} finally {
  await browser.close()
}

console.log(`Wrote ${imageFile}.`)
