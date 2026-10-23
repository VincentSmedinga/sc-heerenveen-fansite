import type { Page } from '@playwright/test'

import AxeBuilder from '@axe-core/playwright'

// WCAG 2.0, 2.1 and 2.2 at levels A and AA, and the best practices of axe. axe has no separate tag for the level A
// criteria of 2.2. No rule is switched off: a violation fails the check.
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

/**
 * Checks the page that is open with axe, and for what axe doesn't see or sees only half: exactly one h1, lang="nl" on the
 * html element, nothing loaded from another domain (principle 3 of the Redactie), and no sideways scrolling in a window of
 * 320 pixels wide. Returns one line per problem, with the rule and the element, or an empty list. It resizes the window.
 */
export async function checkPage(page: Page) {
  const problems: string[] = []

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

  // Everything the page has loaded, as the browser lists it, also what failed. The first check runs after the page has loaded.
  const loaded = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name))
  const { origin } = new URL(page.url())
  const foreign = new Set(loaded.map((url) => new URL(url).origin).filter((other) => other !== origin))

  for (const other of foreign) {
    problems.push(`no-third-party-requests (the page loads something from ${other}, another domain than ${origin})`)
  }

  await page.setViewportSize({ height: 800, width: 320 })
  const tooWide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

  if (tooWide > 0) {
    problems.push(`no-horizontal-scroll (at 320 px wide the page scrolls sideways, it is ${tooWide} px too wide)`)
  }

  return problems
}
