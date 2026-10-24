// Makes the icons in public from the logo of the design system, packages/design-system/src/assets/logo.svg, exactly as
// it is:
// - icon.svg, a copy of the logo for the tab;
// - favicon.ico, with PNGs of 16, 32 and 48 pixels, for browsers and search engines that ask for it themselves;
// - icon-192.png and icon-512.png, transparent, for the manifest (`any`);
// - apple-touch-icon.png (180 by 180) and icon-maskable-512.png, the shield on a solid tile of the dark blue of the
//   header, for an iPhone and for Android, which cut the shape out of the icon themselves.
// It draws the SVG in the Chromium of Playwright and takes screenshots, so it needs no dependency of its own. The blue
// is read from the colour tokens of the design system (see src/header-colour.ts). Run it again only when the vector or
// the colour changes, and commit the new files.
//
//   pnpm --filter site icons
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { headerColourOf } from '../src/header-colour.ts'

const designSystem = path.resolve(import.meta.dirname, '../../../packages/design-system/src')
const publicFolder = path.resolve(import.meta.dirname, '../public')

const icon = readFileSync(path.join(designSystem, 'assets/logo.svg'), 'utf8')
const tile = headerColourOf(readFileSync(path.join(designSystem, 'tokens/colour.css'), 'utf8')).light
// The logo on a tile is this much of its width. A maskable icon keeps its content inside a circle of 80% of the width,
// and the corners of the shield are the farthest points from the middle: at 88% the shield is 76% of the height and
// its corners reach 79.4%.
const shieldOnTile = 0.88

/** Draws the icon at `size` pixels square, on a tile of the given colour or on nothing, and returns the PNG. */
async function draw(page, size, background) {
  await page.setViewportSize({ height: size, width: size })
  await page.setContent(`<!doctype html>
<style>
  html, body { height: 100%; margin: 0; }
  ${background === undefined ? '' : `html { background: ${background}; }`}
  body { align-items: center; display: flex; justify-content: center; }
  svg { height: ${background === undefined ? 100 : shieldOnTile * 100}%; width: ${background === undefined ? 100 : shieldOnTile * 100}%; }
</style>
${icon}`)

  return page.screenshot({ omitBackground: background === undefined, type: 'png' })
}

/** An ICO file that holds the given PNGs, which it embeds as they are. */
function makeIco(images) {
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = header.length

  images.forEach(({ png, size }, index) => {
    const entry = 6 + 16 * index
    header.writeUInt8(size, entry)
    header.writeUInt8(size, entry + 1)
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(png.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += png.length
  })

  return Buffer.concat([header, ...images.map(({ png }) => png)])
}

const browser = await chromium.launch()

try {
  const page = await browser.newPage()
  // One after the other: the drawings share the page and its size.
  const faviconImages = []

  for (const size of [16, 32, 48]) {
    faviconImages.push({ png: await draw(page, size), size })
  }

  const files = {
    'apple-touch-icon.png': await draw(page, 180, tile),
    'favicon.ico': makeIco(faviconImages),
    'icon-192.png': await draw(page, 192),
    'icon-512.png': await draw(page, 512),
    'icon-maskable-512.png': await draw(page, 512, tile),
    'icon.svg': icon,
  }

  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(publicFolder, name), content)
    console.log(`Wrote ${path.join(publicFolder, name)}.`)
  }
} finally {
  await browser.close()
}
