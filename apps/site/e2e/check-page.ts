import type { Page, Request } from '@playwright/test'

import AxeBuilder from '@axe-core/playwright'
import { expect } from '@playwright/test'

// WCAG 2.0, 2.1 and 2.2 at levels A and AA, and the best practices of axe. axe has no separate
// tag for the level A criteria of 2.2. No rule is switched off: a violation fails the check.
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

/**
 * Checks the page that is open with axe, and for what axe doesn't see or sees only half:
 * exactly one h1, lang="nl" on the html element, nothing loaded from another domain (principle
 * 3 of the Redactie), and no sideways scrolling in a window of 320 pixels wide. Returns one
 * line per problem, with the rule and the element, or an empty list. It resizes the window.
 */
export async function checkPage(page: Page) {
  const problems: string[] = []

  // After a form that redirects, the site changes pages without loading a new document. Next.js
  // puts the new body in first and the <title> a moment later, so for a few milliseconds the
  // document has no title, and axe reports document-title on a page that has one. Wait for the
  // title to be back. A page that has none still fails: after the wait, axe reports it.
  await page.waitForFunction(() => document.title.trim() !== '', undefined, { timeout: 2000 }).catch(() => undefined)

  const { violations } = await new AxeBuilder({ page }).withTags(tags).analyze()

  for (const { help, id, nodes } of violations) {
    for (const { html, target } of nodes) {
      problems.push(`${id} (${help}): ${target.join(' ')}, ${html}`)
    }
  }

  const headings = await page.locator('h1').count()

  if (headings !== 1) {
    problems.push(`one-h1 (a page has exactly one h1, this one has ${headings})`)
  }

  const lang = await page.locator('html').getAttribute('lang')

  if (lang !== 'nl') {
    problems.push(`html-lang-nl (the lang of the html element is ${JSON.stringify(lang)}, not "nl")`)
  }

  // The resize can make the page load something new, such as a picture for a narrow screen.
  // Keep track of the requests that start from here. Waiting for 'networkidle' doesn't work: it
  // fires only once, and it has often fired by now.
  const open = new Set<Request>()
  const opened = (request: Request) => open.add(request)
  const closed = (request: Request) => open.delete(request)
  page.on('request', opened)
  page.on('requestfinished', closed)
  page.on('requestfailed', closed)

  await page.setViewportSize({ height: 800, width: 320 })
  // Two frames, so the page has reacted to the new size before anything is measured or waited
  // for.
  const tooWide = await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    return document.documentElement.scrollWidth - document.documentElement.clientWidth
  })

  if (tooWide > 0) {
    problems.push(`no-horizontal-scroll (at 320 px wide the page scrolls sideways, it is ${tooWide} px too wide)`)
  }

  // Everything the page has loaded, as the browser lists it, also what failed. It is read last,
  // after the resize and after what the resize started has finished, so something that only
  // loads on a narrow screen counts too.
  await expect.poll(() => open.size, { message: 'the page is still loading after the resize' }).toBe(0)
  page.off('request', opened)
  page.off('requestfinished', closed)
  page.off('requestfailed', closed)
  const loaded = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name))
  const { origin } = new URL(page.url())
  const foreign = new Set(loaded.map((url) => new URL(url).origin).filter((other) => other !== origin))

  for (const other of foreign) {
    problems.push(`no-third-party-requests (the page loads something from ${other}, another domain than ${origin})`)
  }

  return problems
}
