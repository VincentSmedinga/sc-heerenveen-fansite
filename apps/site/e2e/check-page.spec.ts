import type { Page } from '@playwright/test'

import { expect, test } from '@playwright/test'

import { checkPage } from './check-page'

// The check must catch a mistake, or a green run says nothing. The pages below don't exist on the site: the test serves
// them itself, one page without a mistake and the same page with one.
const good = `<!doctype html>
<html lang="nl">
  <head><title>Test</title></head>
  <body>
    <main>
      <h1>Kop</h1>
      <a href="/">Naar de voorpagina</a>
    </main>
  </body>
</html>`

const mistakes = [
  { html: good.replace('>Naar de voorpagina<', '><'), name: 'a link without a name', rule: 'link-name' },
  { html: good.replace('</main>', '<h1>Nog een kop</h1></main>'), name: 'two h1', rule: 'one-h1' },
  { html: good.replace('lang="nl"', 'lang="en"'), name: 'lang="en"', rule: 'html-lang-nl' },
  {
    // A request to another domain, such as a font or a script. It can't be answered here, so the test answers it itself.
    html: good.replace('</main>', '<img src="https://derde-partij.test/pixel.gif" alt=""></main>'),
    name: 'a request to another domain',
    rule: 'no-third-party-requests',
  },
  {
    html: good.replace('<h1>', '<div style="width: 400px">Breed</div><h1>'),
    name: 'sideways scrolling at 320 px',
    rule: 'no-horizontal-scroll',
  },
]

/** Opens a page with this HTML on the address of the site, and checks it. */
async function checkServed(page: Page, html: string) {
  await page.route('**/zelftest', (route) => route.fulfill({ body: html, contentType: 'text/html' }))
  // Another domain doesn't answer: the browser has still made the request.
  await page.route('https://derde-partij.test/**', (route) => route.abort())
  await page.goto('/zelftest')

  return checkPage(page)
}

test('passes a page without a mistake', async ({ page }) => {
  expect(await checkServed(page, good)).toEqual([])
})

for (const { html, name, rule } of mistakes) {
  test(`fails on ${name}`, async ({ page }) => {
    // Exactly the one problem: the rest of the page is fine.
    expect(await checkServed(page, html)).toEqual([expect.stringMatching(`^${rule} `)])
  })
}
