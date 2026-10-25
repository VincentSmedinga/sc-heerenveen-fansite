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

describe('the header while it scrolls away in page.css', () => {
  const rule = css.match(/\.hf-page-header\[data-scrolled-away\] > \* \{([^}]*)\}/)?.[1] ?? ''

  it('makes what is in the header see-through with opacity, and not with visibility or display', () => {
    expect(rule).toContain('opacity: 0;')
    expect(rule).not.toMatch(/visibility|display/)
  })

  it('leaves the blue band of the header alone, so only its children are see-through', () => {
    expect(css).not.toMatch(/\.hf-page-header\[data-scrolled-away\]\s*\{/)
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
