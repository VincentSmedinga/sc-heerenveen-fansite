import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Without the comments, which mention env() in words.
const css = readFileSync(join(import.meta.dirname, 'page.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

// The room for the tracks at 52rem, where the columns start side by side: less 2rem between the
// columns and the margin on both sides, which is as wide as the inset of the device. A phone on
// its side has up to 62px (3.875rem) on each side, and a media query can't read that.
const roomAtTheBoundary = 52 - 2 - 2 * 3.875

// jsdom doesn't apply rules in a cascade layer to an element and has no safe area, so the test
// reads the text of the file.
describe('the safe area insets in page.css', () => {
  const uses = [...css.matchAll(/env\(\s*safe-area-inset-[a-z]+[^)]*\)/g)].map(([use]) => use)

  it('uses all four insets: the header, the body and the footer clear the notch, and the bars of the phone', () => {
    expect(new Set(uses.map((use) => use.match(/safe-area-inset-[a-z]+/)?.[0]))).toEqual(
      new Set(['safe-area-inset-bottom', 'safe-area-inset-left', 'safe-area-inset-right', 'safe-area-inset-top']),
    )
  })

  it('gives every inset a fallback of 0, so a browser without insets keeps today’s sizes', () => {
    expect(uses.length).toBeGreaterThan(0)

    for (const use of uses) {
      expect(use).toMatch(/^env\(safe-area-inset-[a-z]+, 0(px)?\)$/)
    }
  })

  it('puts every inset that adds to a margin inside max(), so it can only add room and never take any away', () => {
    // Remove each max(…) that holds an env(). What is left is the strip, which is as tall as
    // the inset (or the top edge, which is no less) and no more.
    const rest = css.replace(/max\([^;{}]*?env\(safe-area-inset-[a-z]+, 0px\)\)/g, '')

    expect([...rest.matchAll(/([a-z-]+):[^;]*env\(/g)].map(([, property]) => property)).toEqual(['block-size'])
  })
})

describe('the strip over the top edge in page.css', () => {
  const strip = css.match(/\.hf-page-top-edge \{([^}]*)\}/)?.[1] ?? ''

  it('is in the colour of the header, fixed, and takes no touch', () => {
    expect(strip).toContain('background-color: var(--hf-colour-background-header);')
    expect(strip).toContain('position: fixed;')
    expect(strip).toContain('pointer-events: none;')
  })

  it('is as tall as the top edge, which is the inset or no height without one', () => {
    expect(strip).toContain('block-size: var(--hf-top-edge, env(safe-area-inset-top, 0));')
  })

  it('is a real element and not a pseudo-element of the page, which Safari does not take the colour of the status bar from', () => {
    expect(css).not.toMatch(/\.hf-page(?![-\w])[^{]*::(before|after)/)
    expect(css.match(/\.hf-page \{([^{}]*)\}/)?.[1]).not.toContain('::')
  })

  it('has no opacity, which Safari does not count either', () => {
    expect(strip).not.toContain('opacity')
  })

  it('is always there: no rule takes it off the page', () => {
    expect(strip).not.toMatch(/display|visibility/)
    expect(css).not.toMatch(/hf-page-top-edge[^{]*\[hidden\]|hf-page-top-edge[^{]*:not\(/)
  })
})

describe('the stripes of the Frisian flag in page.css', () => {
  const footer = css.slice(css.indexOf('.hf-page-footer {'))
  // The rule of a pseudo-element of the footer, without its nested media query.
  const rule = (selector: string) => footer.match(new RegExp(String.raw`\}\s*${selector} \{([^{}]*)\}`))?.[1] ?? ''

  const both = footer.match(/&::before,\s*&::after \{([^{}]*)\}/)?.[1] ?? ''
  const over = rule('&::before')
  const above = rule('&::after')

  it('is made of a gradient and a mask, with no image, no url() and no request', () => {
    expect(both).toContain('repeating-linear-gradient(')
    expect(above).toContain('mask-image: linear-gradient(')
    expect(css).not.toMatch(/url\(|@import|image-set\(/)
  })

  it('takes no touch or mouse on either part', () => {
    expect(both).toContain('pointer-events: none;')
  })

  it('has the part above the footer behind the content, in a page that isolates its stacking', () => {
    expect(above).toContain('z-index: -1;')
    expect(over).not.toContain('z-index')
    expect(css.match(/\.hf-page \{([^{}]*)\}/)?.[1]).toContain('isolation: isolate;')
  })

  it('has no border on the footer, so the padding box is the whole box and the two parts meet exactly at its top edge', () => {
    const own = footer.match(/^\.hf-page-footer \{([^{}]*)/)?.[1] ?? ''

    expect(own).not.toMatch(/(^|\s)border(-[a-z-]+)?:/)
    expect(css).not.toContain('--hf-colour-border-footer')
  })

  it('keeps what is in the footer above the part over it', () => {
    expect(footer.match(/> \* \{([^{}]*)\}/)?.[1]).toContain('position: relative;')
    expect(footer.match(/^\.hf-page-footer \{([^{}]*)/)?.[1]).toContain('position: relative;')
  })

  it('draws both parts from the same gradient, in the colours of the two tokens', () => {
    expect(both).toContain('var(--hf-stripe)')
    expect(over).toContain('--hf-stripe: var(--hf-colour-background-stripe-footer);')
    expect(above).toContain('--hf-stripe: var(--hf-colour-background-stripe);')
  })

  it('has neither part in forced colours or in print', () => {
    const media = footer.match(/@media \(forced-colors: active\), print \{\s*&::before,\s*&::after \{([^{}]*)\}/)?.[1]

    expect(media).toContain('display: none;')
  })
})

describe('the row of the header in page.css', () => {
  const header = css.slice(css.indexOf('.hf-page-header {'), css.indexOf('.hf-page-body {'))

  it('is a grid with the logo and the theme button in one row, and has no place for the menu', () => {
    expect(header).toContain('display: grid;')
    expect(header).toContain('grid-template-columns: minmax(0, 1fr) auto;')
    expect(header).not.toContain('flex-wrap')
    expect(header).not.toContain('.hf-navigation')
    expect(header).not.toContain('grid-column')
  })

  it('keeps the space under the logo that was between the logo and the line of the menu', () => {
    expect(header).toContain('padding-block: max(var(--hf-space-m), env(safe-area-inset-top, 0px)) var(--hf-space-xs);')
    expect(header).toContain('gap: 0 var(--hf-space-s);')
  })

  it('aligns the logo in its link to the top, so the link is as tall as the logo and not as the line of text', () => {
    expect(header).toMatch(/> :has\(> \.hf-logo\) > \.hf-logo \{[^}]*vertical-align: top;/)
  })

  it('keeps the logo an inline box, because a flex container around it would pass the underline of the link on to it', () => {
    expect(header).not.toMatch(/> :has\(> \.hf-logo\) \{[^}]*display: flex;/)
  })

  it('puts the theme button on the right', () => {
    expect(header).toMatch(/> \.hf-theme-button \{[^}]*justify-self: end;/)
  })
})

describe('the text in the footer in page.css', () => {
  const footer = css.slice(css.indexOf('.hf-page-footer {'))
  // A nested media query of the footer, up to the closing brace at the depth of the query.
  const media = (query: string) =>
    footer.match(new RegExp(String.raw`@media \(${query}\) \{(.*?\n    \})\n`, 's'))?.[1] ?? ''

  const nowrap = media('width >= 19\\.5rem')
  const columns = media('width >= 40rem')

  it('keeps every line of text of the footer on one line, but not the links', () => {
    expect(nowrap).toMatch(/> :not\(\.hf-navigation, \.hf-page-top-link\) \{\s*white-space: nowrap;\s*\}/)
  })

  it('does so only above a width where it fits, so a line that does not break cannot make the page scroll sideways', () => {
    // 17rem of text with the spacing of WCAG 1.4.12 and 2rem of margin is 19rem, under 320px.
    expect(footer.match(/^\.hf-page-footer \{[^@]*/)?.[0]).not.toContain('nowrap')
    expect(footer.match(/white-space: nowrap;/g)).toHaveLength(1)
    expect(nowrap).toContain('white-space: nowrap;')
  })

  it('lets the column of the links take what is left, so the links wrap before the text does', () => {
    expect(columns).toContain('grid-template-columns: auto minmax(0, 1fr);')
    expect(columns).toContain('place-self: start end;')
  })

  it('has no place for a control any more: the theme switch is in the header', () => {
    expect(footer).not.toContain('nth-child(3)')
    expect(footer).not.toContain('hf-segmented-control')
  })

  it('has the links span all rows, so a second row of links does not push the lines of text apart', () => {
    expect(columns).toContain('grid-template-rows: auto auto 1fr;')
    expect(columns).toContain('grid-row: 1 / -1;')
  })

  it('balances the rows of links, in a list of inline blocks because a flex row cannot be balanced', () => {
    const list = footer.match(/@supports \(text-wrap: balance\) \{(.*?\n {4}\})\n/s)?.[1] ?? ''

    expect(list).toContain('display: block;')
    expect(list).toContain('text-wrap: balance;')
    expect(list).toMatch(/> li \{[^}]*display: inline-block;[^}]*margin-inline-start: var\(--hf-space-l\);/)
    // The margin before a link, taken back at the start of the list, keeps links apart.
    expect(list).toContain('margin-inline-start: calc(-1 * var(--hf-space-l));')
  })
})

describe('the footer with a link to the top in page.css', () => {
  const footer = css.slice(css.indexOf('.hf-page-footer {'))
  const withLink = footer.slice(footer.indexOf('&:has(> .hf-page-top-link) {'))
  // The part of the rule before its first nested rule.
  const own = withLink.match(/^[^{]*\{([^{}]*)/)?.[1] ?? ''
  const wide = withLink.match(/@media \(width >= 40rem\) \{(.*?\n {6}\})\n/s)?.[1] ?? ''

  it('adds a column for the link only when the footer has one, so a footer without it is as before', () => {
    expect(footer.match(/&:has\(> \.hf-page-top-link\)/g)).toHaveLength(1)
    expect(own).toContain('grid-template-columns: minmax(0, 1fr) auto;')
    expect(footer.match(/^\.hf-page-footer \{[^@]*/)?.[0]).toContain('grid-template-columns: minmax(0, 1fr);')
  })

  it('puts the link level with the two lines of text on a narrow screen and the links under them', () => {
    expect(withLink).toMatch(/> \.hf-page-top-link \{[^}]*grid-column: 2;[^}]*grid-row: 1 \/ 3;/)
    expect(withLink).toMatch(/> \.hf-navigation \{\s*grid-column: 1 \/ -1;/)
    expect(withLink).toMatch(/> :not\(\.hf-navigation, \.hf-page-top-link\) \{\s*grid-column: 1;/)
  })

  it('puts the link in a column of its own, top right, beside the links on a wide screen', () => {
    expect(wide).toContain('grid-template-columns: auto minmax(0, 1fr) auto;')
    expect(wide).toMatch(/> \.hf-page-top-link \{[^}]*grid-column: 3;[^}]*grid-row: 1 \/ -1;/)
    expect(wide).toMatch(/> \.hf-navigation \{\s*grid-column: 2;/)
  })

  it('leaves room for the link beside the text, and lets the text break again where there is none', () => {
    // 14,1rem of text, 0,5rem, 2,75rem of link and 2rem of margin: 19,35rem. With the text
    // spacing of WCAG 1.4.12 the text is 17rem wide: 22,25rem.
    expect(own).toContain('column-gap: var(--hf-space-s);')
    expect(withLink).toMatch(
      /@media \(width < 22\.25rem\) \{\s*> :not\(\.hf-navigation, \.hf-page-top-link\) \{\s*white-space: normal;/,
    )
    expect(wide).toContain('column-gap: var(--hf-space-xl);')
  })

  it('finds the links by their class, and not as the last child, which is the link to the top', () => {
    expect(footer).not.toContain(':last-child')
    expect(footer).toMatch(/> \.hf-navigation \{\s*margin-block-start: var\(--hf-space-s\);/)
  })
})

describe('the body in page.css', () => {
  const layout = readFileSync(join(import.meta.dirname, '../../tokens/layout.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')
  const token = (name: string) => Number(layout.match(new RegExp(String.raw`${name}: (\d+(?:\.\d+)?)rem;`))?.[1])
  const body = css.match(/\.hf-page-body \{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/)?.[1] ?? ''

  it('is one track of the width of the content under 52rem, and one track as wide as the page from there', () => {
    expect(token('--hf-content-max-width')).toBe(38)
    expect(token('--hf-page-max-width')).toBe(64)
    expect(body).toContain('grid-template-columns: minmax(0, var(--hf-content-max-width));')
    expect(body).toMatch(/@media \(width >= 52rem\) \{\s*grid-template-columns: minmax\(0, 1fr\);/)
    expect(body.match(/grid-template-columns:/g)).toHaveLength(2)
  })

  it('puts the same space around the main as between the cells, with no gap of its own', () => {
    expect(body).toContain('--hf-page-body-cell-gap: var(--hf-space-xl);')
    expect(body).toContain('gap: var(--hf-page-body-cell-gap);')
    expect(body).not.toMatch(/(^|\s)column-gap:/)
    expect(css).not.toContain('--hf-page-body-column-gap')
  })

  it('keeps twice the largest space under the main', () => {
    expect(body).toContain('--hf-page-body-end-space: calc(2 * var(--hf-space-xl));')
    expect(body).toContain('padding-block: var(--hf-page-body-cell-gap) var(--hf-page-body-end-space);')
  })

  it('leaves no trace of the old layout: no sidebar, introduction, wide page or subgrid', () => {
    const layoutCss = readFileSync(join(import.meta.dirname, '../../tokens/layout.css'), 'utf8')

    expect(css).not.toMatch(/hf-page-(sidebar|intro|cells|main-wide)|subgrid/)
    expect(layoutCss).not.toMatch(/max-width-(wide|broad)|sidebar-width/)
  })
})

describe('the cells of the main in page.css', () => {
  const rule = css.match(/\.hf-page-main \{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/)?.[1] ?? ''

  it('puts them under each other in one track that can shrink to 0, as wide as the content', () => {
    expect(rule).toContain('grid-template-columns: minmax(0, 1fr);')
    expect(rule).toContain('max-inline-size: var(--hf-content-max-width);')
  })

  it('has no auto-fit: a column never puts its cells side by side by itself', () => {
    expect(css).not.toContain('auto-fit')
  })
})

describe('the title row in page.css', () => {
  const rule = css.match(/\.hf-page-title\s*\{(.*?)\n {2}\}/s)?.[1] ?? ''

  it('wraps, so the control goes under the heading where they do not fit side by side', () => {
    expect(rule).toMatch(/display: flex/)
    expect(rule).toMatch(/flex-wrap: wrap/)
  })

  it('keeps the control at the end of the row, beside the heading and under it', () => {
    expect(rule).toMatch(/> :not\(:first-child\)\s*\{\s*margin-inline-start: auto;/)
  })

  it('lets wrapped="start" keep the control on the left when it wraps', () => {
    expect(css).toMatch(/&\.hf-page-title-start > :not\(:first-child\)\s*\{\s*margin-inline-start: 0;/)
  })
})

describe('the grid of a page with areas in page.css', () => {
  const layout = readFileSync(join(import.meta.dirname, '../../tokens/layout.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')
  const grid = css.match(/\.hf-page-main-grid \{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/)?.[1] ?? ''

  it('has one rule for a narrow screen and one from 52rem, and 52rem is written out once for the grid', () => {
    expect(grid).toContain('grid-template-areas: var(--hf-page-areas-narrow);')
    expect(grid).toContain('@media (width >= 52rem)')
    expect(grid).toContain('grid-template-areas: var(--hf-page-areas-wide);')
    expect(grid).toContain('grid-template-columns: var(--hf-page-columns);')
    expect(grid.match(/52rem/g)).toHaveLength(1)
  })

  it('is as wide as the page, not as wide as the content of a main without areas', () => {
    expect(grid).toContain('max-inline-size: none;')
    expect(css.indexOf('.hf-page-main-grid {')).toBeGreaterThan(css.indexOf('.hf-page-main {'))
  })

  it('has no order and no new rule with :has() for the grid, the toolbar or the section', () => {
    const after = css.slice(css.indexOf('.hf-page-main-grid {'), css.indexOf('.hf-page-title'))

    expect(after).not.toMatch(/(^|[\s;{])order:/)
    expect(after).not.toContain(':has(')
    expect(css.slice(css.indexOf('.hf-page-toolbar'))).not.toMatch(/(^|[\s;{])order:/)
  })

  it('has the same space between the cells as elsewhere, 2rem, across and down', () => {
    expect(css.match(/\.hf-page-main \{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/)?.[1]).toContain(
      'gap: var(--hf-page-body-cell-gap);',
    )
    expect(css.match(/\.hf-page-section \{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/)?.[1]).toContain(
      'gap: var(--hf-page-body-cell-gap);',
    )
  })

  it('does not stick, and makes the toolbar a wrapping row', () => {
    const toolbar = css.match(/\.hf-page-toolbar \{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/)?.[1] ?? ''

    expect(toolbar).toContain('flex-wrap: wrap;')
    expect(toolbar).not.toContain('sticky')
  })

  describe.each(['side', 'equal', 'narrow-side', 'start-side'])('the columns %s', (name) => {
    const value = layout.match(new RegExp(String.raw`--hf-page-columns-${name}: ([^;]*);`))?.[1] ?? ''
    const tracks = value.match(/minmax\([^)]*\)/g) ?? []
    const rem = (track: string, index: number) => Number(track.match(/([\d.]+)rem/g)?.[index]?.replace('rem', '') ?? 0)

    it('has two tracks that fill the page of 64rem with 2rem between them', () => {
      expect(tracks).toHaveLength(2)

      if (name === 'start-side') {
        expect(rem(tracks[0] ?? '', 0)).toBe(17.5)
      } else {
        expect(rem(tracks[0] ?? '', 1) + rem(tracks[1] ?? '', 1) + 2).toBe(64)
      }
    })

    it('lets the tracks shrink only to a width that fits in 52rem, where the columns start side by side', () => {
      expect(rem(tracks[0] ?? '', 0) + rem(tracks[1] ?? '', 0)).toBeLessThanOrEqual(roomAtTheBoundary)
    })
  })
})
