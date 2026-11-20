import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The CSS is read as text: jsdom doesn't apply rules in a cascade layer or under the mouse.
const read = (path: string) => readFileSync(join(import.meta.dirname, path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

// The rule of a selector, up to its first closing brace.
const rule = (css: string, selector: string) =>
  new RegExp(`${selector.replaceAll('.', '\\.')}\\s*\\{([^}]*)\\}`, 'u').exec(css)?.[1] ?? ''

describe('the underline of a link in the content', () => {
  const links = [
    ['../news-item/news-item.css', '.hf-news-item-headline'],
    ['../discussion-item/discussion-item.css', '.hf-discussion-item-title'],
    ['../match/match.css', '.hf-match-link'],
    ['../tile/tile.css', '.hf-tile-link'],
    ['../question-card/question-card.css', '.hf-question-text'],
  ] as const

  it('is there at rest, for the headline, the title, the match, the tile and the question', () => {
    for (const [path, selector] of links) {
      const css = rule(read(path), selector)

      if (selector === '.hf-tile-link') {
        // The tile link takes the line of the base styles.
        expect(css, selector).not.toMatch(/text-decoration(-line)?: none/u)
      } else {
        expect(css, selector).toMatch(/text-decoration-line: underline/u)
      }
    }
  })

  it('is not taken away at rest in the base styles', () => {
    expect(read('link.css')).not.toMatch(/text-decoration(-line)?: none/u)
  })

  it('is 1,5 pixels thick under the mouse and with the focus, from one token', () => {
    expect(read('../../tokens/typography.css')).toMatch(/--hf-link-underline-thickness-hover: 1\.5px;/u)
    expect(read('link.css')).toMatch(
      /&:hover,\s*&:focus-visible \{[^}]*text-decoration-line: underline;\s*text-decoration-thickness: var\(--hf-link-underline-thickness-hover\)/u,
    )
  })

  it('has no thickness of its own under the mouse for the headline and the title', () => {
    for (const path of ['../news-item/news-item.css', '../discussion-item/discussion-item.css']) {
      expect(read(path), path).not.toMatch(/1\.5px|text-decoration-thickness/u)
    }
  })
})

describe('the links that are not content', () => {
  it('has no line at rest in the footer, and every link there gets the line under the mouse and with the focus', () => {
    expect(rule(read('../page/page.css'), '& a:not\\(:hover, :focus-visible\\)')).toMatch(/text-decoration-line: none/u)
  })
})

describe('the links that are navigation', () => {
  // The base styles underline a link with the focus, so each of these sets its own line, in the
  // components layer, which wins over the base layer.
  it.each([
    ['../navigation/navigation.css', 'the menu and the pagination'],
    ['../page/shortcuts.css', 'the shortcuts'],
    ['../segmented-control/segmented-control.css', 'the switch links'],
    ['../chip/chip.css', 'the filter chips'],
    ['../round-button/round-button.css', 'the round buttons, such as the link to the top'],
    ['../heading/heading.css', 'the anchor link at a heading'],
  ])('keeps its own line in %s, for %s', (path) => {
    expect(read(path)).toMatch(/text-decoration(-line)?: none/u)
  })

  it('gives the sort button of a table header the line of 1,5 pixels under the mouse', () => {
    expect(read('../data-table/data-table.css')).toMatch(
      /&:hover \{[^}]*text-decoration-thickness: var\(--hf-link-underline-thickness-hover\)/u,
    )
  })
})
