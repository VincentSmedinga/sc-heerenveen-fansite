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

  const nowrap = media('width >= 17rem')
  const columns = media('width >= 40rem')

  it('keeps every line of text, button label and control of the footer on one line, but not the links', () => {
    expect(nowrap).toMatch(/> :not\(:last-child\) \{\s*white-space: nowrap;\s*\}/)
    expect(nowrap).toMatch(/\.hf-segmented-control \{\s*flex-wrap: nowrap;\s*\}/)
  })

  it('does so only above a width where it fits, so a line that does not break cannot make the page scroll sideways', () => {
    // 14,1rem of text and 2rem of margin is 16,1rem, so 17rem is the least that fits.
    expect(footer.match(/^\.hf-page-footer \{[^@]*/)?.[0]).not.toContain('nowrap')
    expect(footer.match(/white-space: nowrap;/g)).toHaveLength(1)
    expect(nowrap).toContain('white-space: nowrap;')
  })

  it('lets the column of the links take what is left, so the links wrap before the text does', () => {
    expect(columns).toContain('grid-template-columns: auto minmax(0, 1fr);')
    expect(columns).toContain('justify-self: end;')
  })

  it('has the links span all rows, so a second row of links does not push the lines of text apart', () => {
    expect(columns).toContain('grid-template-rows: auto auto 1fr;')
    expect(columns).toContain('grid-row: 1 / -1;')
  })
})
