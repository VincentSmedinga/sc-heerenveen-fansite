import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Without the comments, which mention env() in words.
const css = readFileSync(join(import.meta.dirname, 'page.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

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

describe('the text and the control in the footer in page.css', () => {
  const footer = css.slice(css.indexOf('.hf-page-footer {'))
  // A nested media query of the footer, up to the closing brace at the depth of the query.
  const media = (query: string) =>
    footer.match(new RegExp(String.raw`@media \(${query}\) \{(.*?\n    \})\n`, 's'))?.[1] ?? ''

  const nowrap = media('width >= 19\\.5rem')
  const columns = media('width >= 40rem')

  it('keeps every line of text, button label and control of the footer on one line, but not the links', () => {
    expect(nowrap).toMatch(/> :not\(:last-child\) \{\s*white-space: nowrap;\s*\}/)
    expect(nowrap).toMatch(/\.hf-segmented-control \{\s*flex-wrap: nowrap;\s*\}/)
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

  it('has the links span all rows, so a second row of links does not push the lines of text apart', () => {
    expect(columns).toContain('grid-template-rows: auto auto 1fr;')
    expect(columns).toContain('grid-row: 1 / -1;')
  })

  it('balances the rows of links, in a list of inline blocks because a flex row cannot be balanced', () => {
    const list = footer.match(/@supports \(text-wrap: balance\) \{(.*?\n {4}\})\n/s)?.[1] ?? ''

    expect(list).toContain('display: block;')
    expect(list).toContain('text-wrap: balance;')
    expect(list).toMatch(/> li \{[^}]*display: inline-block;[^}]*margin-inline-start: 1\.5rem;/)
    // The margin before a link, taken back at the list's start, keeps links 1,5rem apart.
    expect(list).toContain('margin-inline-start: -1.5rem;')
  })
})

describe('the columns of the body in page.css', () => {
  const layout = readFileSync(join(import.meta.dirname, '../../tokens/layout.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')
  const token = (name: string) => Number(layout.match(new RegExp(String.raw`${name}: (\d+(?:\.\d+)?)rem;`))?.[1])
  const body = css.match(/\.hf-page-body \{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/)?.[1] ?? ''
  const tracks = body.match(
    /grid-template-columns: minmax\((\d+)rem, var\(--hf-content-max-width\)\) minmax\((\d+)rem, (\d+)rem\);/,
  )

  it('has a main of 38rem, a sidebar of 24rem and 2rem between them, which fill the page of 64rem', () => {
    const [, , , sidebar] = tracks ?? []

    expect(token('--hf-content-max-width')).toBe(38)
    expect(Number(sidebar)).toBe(24)
    expect(token('--hf-page-max-width')).toBe(64)
    expect(body).toContain('--hf-page-body-cell-gap: 2rem;')
    expect(token('--hf-content-max-width') + Number(sidebar) + 2).toBe(token('--hf-page-max-width'))
  })

  it('puts the same space between the columns as between the cells, with no gap of its own', () => {
    expect(body).toContain('gap: var(--hf-page-body-cell-gap);')
    expect(body).not.toMatch(/(^|\s)column-gap:/)
    expect(css).not.toContain('--hf-page-body-column-gap')
  })

  it('keeps 4rem under the columns, and the main as wide with a sidebar as without', () => {
    expect(body).toContain('--hf-page-body-end-space: 4rem;')
    expect(body).toContain('padding-block: var(--hf-page-body-cell-gap) var(--hf-page-body-end-space);')
    expect(body.match(/grid-template-columns:/g)).toHaveLength(2)
  })

  it('lets the tracks shrink only to a width that fits in 56rem, where the columns start side by side', () => {
    const [, mainMinimum, sidebarMinimum] = tracks ?? []

    // 56rem less 2rem of margin and 2rem between the columns.
    expect(Number(mainMinimum) + Number(sidebarMinimum)).toBeLessThanOrEqual(56 - 2 - 2)
    expect(body).toContain('@media (width >= 56rem)')
  })
})

describe('the wide sidebar in page.css', () => {
  const layout = readFileSync(join(import.meta.dirname, '../../tokens/layout.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')
  const pageWidth = Number(layout.match(/--hf-page-max-width: (\d+)rem;/)?.[1])
  const wide = css.match(
    /@media \(width >= 56rem\) \{\s*\.hf-page-body:has\(> \.hf-page-sidebar-wide\) \{\s*grid-template-columns: minmax\((\d+)rem, (\d+)rem\) minmax\((\d+)rem, (\d+)rem\);/,
  )

  it('has a main and a sidebar of 31rem each and 2rem between them, which fill the page of 64rem', () => {
    const [, , main, , sidebar] = wide ?? []

    expect(Number(main)).toBe(31)
    expect(Number(sidebar)).toBe(31)
    expect(Number(main) + Number(sidebar) + 2).toBe(pageWidth)
  })

  it('lets the tracks shrink only to a width that fits in 56rem, where the columns start side by side', () => {
    const [, mainMinimum, , sidebarMinimum] = wide ?? []

    expect(Number(mainMinimum) + Number(sidebarMinimum)).toBeLessThanOrEqual(56 - 2 - 2)
  })

  it('shrinks both tracks to the same minimum, so they are equally wide at every width', () => {
    const [, mainMinimum, , sidebarMinimum] = wide ?? []

    expect(mainMinimum).toBe(sidebarMinimum)
  })

  it('is chosen by the sidebar, which the page renders, and leaves the other pages with 38, 2 and 24rem', () => {
    expect(css.match(/\.hf-page-body:has\(> \.hf-page-sidebar-wide\)/g)).toHaveLength(1)
    expect(css).toContain('grid-template-columns: minmax(24rem, var(--hf-content-max-width)) minmax(16rem, 24rem);')
  })

  it('needs no rule of its own to keep the cells under each other, because every sidebar does', () => {
    expect(css).not.toMatch(/\.hf-page-sidebar-wide \{/)
  })
})

describe('the cells of the sidebar in page.css', () => {
  const rule = (selector: string) => css.match(new RegExp(String.raw`${selector} \{([^{}]*)\}`))?.[1] ?? ''
  const columns = css.match(
    /\.hf-page-main,\s*\.hf-page-cells,\s*\.hf-page-sidebar \{[^{}]*?grid-template-columns: ([^;]*);/,
  )?.[1]

  it('puts them under each other by default, at every width, also under the main where two of 16rem fit', () => {
    expect(columns).toBe('minmax(0, 1fr)')
    expect(rule(String.raw`\.hf-page-sidebar`)).not.toContain('grid-template-columns')
  })

  it('puts them side by side with `split`, as long as two of 16rem and 2rem between them fit', () => {
    expect(rule(String.raw`\.hf-page-sidebar-split`)).toContain(
      'grid-template-columns: repeat(auto-fit, minmax(min(16rem, 100%), 1fr));',
    )
    expect(css.indexOf('.hf-page-sidebar-split {')).toBeGreaterThan(css.indexOf('.hf-page-sidebar {'))
  })

  it('has one rule with auto-fit, so only `split` can put the cells side by side', () => {
    expect(css.match(/auto-fit/g)).toHaveLength(1)
  })
})
