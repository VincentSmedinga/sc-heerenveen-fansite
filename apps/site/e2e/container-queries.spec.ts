import { expect, type Page, test } from '@playwright/test'

// The key figures, the question cards, the list of players and the line of the results wait for
// the width of their own column, not the window (#1421). The markup is put in the page of the
// site, so the real CSS applies, in a column of a width we choose.

const figures = ['52', '1,26', '315', '12'].map(
  (figure) =>
    `<li class="hf-card hf-key-figure"><div class="hf-key-figure-parts"><span class="hf-key-figure-number">${figure}</span> <span class="hf-key-figure-label">doelpunten</span><span class="hf-key-figure-stop">, </span><span class="hf-key-figure-note">in alle competities</span></div></li>`,
)

const questions = [1, 2, 3].map(
  (n) =>
    `<li class="hf-question-item"><a class="hf-card hf-question-card" href="/x${n}"><span class="hf-question-text">Vraag ${n}</span> <span class="hf-question-figure">${n}</span></a></li>`,
)

const players = ['Aken', 'Bakker', 'Claes', 'Dijk'].map(
  (name) => `<li class="hf-player-list-row"><strong class="hf-player-list-surname">${name}</strong></li>`,
)

const markup = {
  across: `<ul class="hf-key-figures hf-key-figures-four hf-key-figures-across" role="list">${figures.join('')}</ul>`,
  four: `<ul class="hf-key-figures hf-key-figures-four" role="list">${figures.join('')}</ul>`,
  line: '<div class="hf-outcome-line"><div class="hf-outcome-bar hf-outcome-line-bar"></div><span>9 gewonnen</span></div>',
  list: `<div class="hf-player-list-container"><ul class="hf-player-list" role="list">${players.join('')}</ul></div>`,
  questions: `<ul class="hf-question-grid" role="list">${questions.join('')}</ul>`,
}

/** The width in pixels of the bar of the line of the results. */
async function barWidth(page: Page, column: number) {
  return page.evaluate(
    ([html, width]) => {
      const host = document.createElement('div')

      host.style.inlineSize = `${width}px`
      host.innerHTML = html
      document.body.append(host)

      return Math.round(host.querySelector('.hf-outcome-line-bar')?.getBoundingClientRect().width ?? 0)
    },
    [markup.line, column] as const,
  )
}

/** The distinct left edges, in pixels, of the elements that match: the number of columns. */
async function columns(page: Page, markupOf: string, selector: string, column: number) {
  return page.evaluate(
    ([html, items, width]) => {
      const host = document.createElement('div')

      host.id = 'host'
      host.style.inlineSize = `${width}px`
      host.innerHTML = html
      document.body.append(host)

      return [
        ...new Set([...host.querySelectorAll(items)].map((item) => Math.round(item.getBoundingClientRect().left))),
      ].length
    },
    [markupOf, selector, column] as const,
  )
}

// The column is 300 pixels (a card on a phone) or 800 (a wide column), in a window of 320, 390
// or 1280 pixels, so only the column can make the difference.
for (const [window, name] of [
  [320, 'a phone of 320 pixels'],
  [390, 'a phone of 390 pixels'],
  [1280, 'a wide window'],
] as const) {
  test.describe(name, () => {
    test.use({ viewport: { height: 800, width: window } })

    test('the key figures wait for the width of their column', async ({ page }) => {
      await page.goto('/')
      expect(await columns(page, markup.across, '.hf-key-figure', 300)).toBe(2)
      expect(await columns(page, markup.four, '.hf-key-figure', 800)).toBe(2)
      expect(await columns(page, markup.across, '.hf-key-figure', 800)).toBe(4)
    })

    test('the question cards wait for the width of their column', async ({ page }) => {
      await page.goto('/')
      expect(await columns(page, markup.questions, '.hf-question-item', 300)).toBe(1)
      expect(await columns(page, markup.questions, '.hf-question-item', 800)).toBe(3)
    })

    test('the list of players has two columns when its column is wide', async ({ page }) => {
      await page.goto('/')
      expect(await columns(page, markup.list, '.hf-player-list-row', 300)).toBe(1)
      expect(await columns(page, markup.list, '.hf-player-list-row', 800)).toBe(2)
    })

    test('the bar of the results is as wide as its column when the column is narrow', async ({ page }) => {
      await page.goto('/')
      expect(await barWidth(page, 300)).toBe(300)
      expect(await barWidth(page, 800)).toBe(160)
    })
  })
}
