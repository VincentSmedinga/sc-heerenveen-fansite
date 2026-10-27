// Makes the screenshots for the description of a pull request that changes what visitors see,
// from a build that is already running: the site, or Storybook. For every page or story it
// writes a PNG for a phone (390 pixels wide) and for a small desktop (900 pixels wide), light
// unless you ask for dark, at one device pixel per CSS pixel. It starts no server and takes
// nothing but the Playwright that the accessibility checks use. The decisions "Screenshots
// staan op een eigen branch, niet in de repository" and "Licht is genoeg, donker alleen met een
// reden" in docs/beslissingen.md say why.
//
//   pnpm screenshots <address of the build> <path or story id>... [--dark] [--full-page]
//     [--out <folder>]
//
//   pnpm screenshots http://localhost:3000 / /podcasts
//   pnpm screenshots http://localhost:6006 componenten-pagina-page-footer--light --dark
//
// A target that starts with a slash is a path on the site. Anything else is the id of a story,
// and opens iframe.html of Storybook with it. Only a build on this computer is accepted, so a
// screenshot never shows data of the host. The default folder is screenshots in the folder
// where you ran pnpm, which Git ignores.
//
// What decides something is a function without side effects, exported for the tests. What
// touches the computer (the browser and the files) is below that, and only runs when this file
// is started directly.
import { chromium } from '@playwright/test'
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'

/** A problem we expect: it is shown as a message, without a stack. */
export class ScreenshotsError extends Error {
  constructor(message, exitCode = 1) {
    super(message)
    this.exitCode = exitCode
  }
}

/**
 * The two sizes: a phone and a small desktop. What fits in 900 pixels fits in every width above
 * it.
 */
export const viewports = [
  { height: 844, name: 'phone', width: 390 },
  { height: 640, name: 'desktop', width: 900 },
]

const usage =
  'Usage: pnpm screenshots <address of the build> <path or story id>... [--dark] [--full-page] [--out <folder>]'

const isLocalHost = (hostname) =>
  hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1' || hostname === '[::1]'

/** The address of the page or the story. */
export function addressOf(base, target) {
  if (target.startsWith('/')) {
    const address = new URL(target, base)

    // A path such as //example.org/x is an address on another site.
    if (address.origin !== new URL(base).origin) {
      throw new ScreenshotsError(`"${target}" is not a path on ${base}.`, 2)
    }

    return address.href
  }

  return `${base}/iframe.html?id=${encodeURIComponent(target)}&viewMode=story`
}

/** Reads the command line: where the build is, what to photograph, and the options. */
export function parseArguments(argv) {
  let parsed

  try {
    parsed = parseArgs({
      allowPositionals: true,
      args: argv,
      options: { dark: { type: 'boolean' }, 'full-page': { type: 'boolean' }, out: { type: 'string' } },
    })
  } catch (error) {
    throw new ScreenshotsError(`${error.message}\n${usage}`, 2)
  }

  const [address, ...targets] = parsed.positionals

  if (address === undefined || targets.length === 0) {
    throw new ScreenshotsError(usage, 2)
  }

  let base

  try {
    base = new URL(address)
  } catch {
    throw new ScreenshotsError(
      `"${address}" is not an address. Give the address of the build, such as http://localhost:3000.`,
      2,
    )
  }

  if (base.protocol !== 'http:' && base.protocol !== 'https:') {
    throw new ScreenshotsError(`"${address}" is not an http address.`, 2)
  }

  if (!isLocalHost(base.hostname)) {
    throw new ScreenshotsError(
      `${base.host} is not on this computer. Photograph a local build with made-up data, never a site with real data.`,
      2,
    )
  }

  const duplicate = targets.find((target, index) => targets.indexOf(target) !== index)

  if (duplicate !== undefined) {
    throw new ScreenshotsError(`"${duplicate}" is in the list twice.`, 2)
  }

  for (const target of targets) {
    addressOf(base.origin, target)
  }

  return {
    base: base.origin,
    dark: parsed.values.dark === true,
    fullPage: parsed.values['full-page'] === true,
    out: parsed.values.out,
    targets,
  }
}

/**
 * The start of the file name: the path or the story id, with only letters, digits and hyphens.
 */
export function slugOf(target) {
  const slug = target
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')

  return slug === '' ? 'home' : slug
}

/**
 * The name of a file, such as podcasts-390.png, or home-900-dark.png when dark was asked for.
 */
export const fileNameOf = (target, width, dark) => `${slugOf(target)}-${width}${dark ? '-dark' : ''}.png`

/**
 * The files that go with a list of targets, in the order they are made. Two targets must not
 * end up in one file.
 */
export function planFiles(targets, dark) {
  const files = targets.flatMap((target) =>
    viewports.map((viewport) => ({ file: fileNameOf(target, viewport.width, dark), target, viewport })),
  )
  const clash = files.find(({ file }, index) => files.findIndex((other) => other.file === file) !== index)

  if (clash !== undefined) {
    throw new ScreenshotsError(`"${clash.target}" gives ${clash.file}, which another target gives as well.`, 2)
  }

  return files
}

/**
 * Opens every page or story in both widths and writes the files. Returns what it wrote, for the
 * summary.
 */
async function photograph({ base, dark, fullPage, out, targets }) {
  const plan = planFiles(targets, dark)
  const folder = path.resolve(process.env['INIT_CWD'] ?? process.cwd(), out ?? 'screenshots')
  const browser = await chromium.launch()
  const written = []

  mkdirSync(folder, { recursive: true })

  try {
    for (const { file, target, viewport } of plan) {
      // One device pixel per CSS pixel and a colour scheme that is always set, so the default
      // is light on any computer.
      const context = await browser.newContext({
        colorScheme: dark ? 'dark' : 'light',
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
        viewport: { height: viewport.height, width: viewport.width },
      })

      try {
        const page = await context.newPage()
        const address = addressOf(base, target)
        const response = await page.goto(address, { waitUntil: 'load' })

        if (response === null || !response.ok()) {
          throw new ScreenshotsError(`${address} answered ${response?.status() ?? 'nothing'}.`)
        }

        await page.evaluate(() => document.fonts.ready)

        const png = await page.screenshot({ animations: 'disabled', fullPage })

        writeFileSync(path.join(folder, file), png)
        written.push({ file, size: png.length })
      } finally {
        await context.close()
      }
    }
  } finally {
    await browser.close()
  }

  return { folder, written }
}

// `import.meta.main` only exists from Node 24.2, and engines allows 24.0 and 24.1 too, so
// compare the paths ourselves.
if (process.argv[1] !== undefined && realpathSync(process.argv[1]) === import.meta.filename) {
  try {
    const { folder, written } = await photograph(parseArguments(process.argv.slice(2)))

    for (const { file, size } of written) {
      console.log(`${file}  ${(size / 1024).toFixed(1)} kB`)
    }

    console.log(`Wrote ${written.length} files in ${folder}.`)
  } catch (error) {
    if (!(error instanceof ScreenshotsError)) {
      throw error
    }

    console.error(error.message)
    process.exitCode = error.exitCode
  }
}
