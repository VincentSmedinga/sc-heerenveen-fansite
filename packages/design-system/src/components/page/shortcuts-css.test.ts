import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Without the comments, which mention the rules in words.
const strip = (text: string) => text.replace(/\/\*.*?\*\//gs, '')
const css = strip(readFileSync(join(import.meta.dirname, 'shortcuts.css'), 'utf8'))
const page = strip(readFileSync(join(import.meta.dirname, 'page.css'), 'utf8'))

// jsdom has no cascade layers and no scroll animations, so the test reads the text of the file.
const rule = (selector: string) =>
  css.match(
    new RegExp(
      String.raw`\n  ${selector.replace('.', String.raw`\.`)} \{([^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*)\}`,
    ),
  )?.[1] ?? ''

describe('the bar in shortcuts.css', () => {
  const bar = rule('.hf-page-shortcuts')

  it('is on the colours of its own roles, with a line under it, and as wide as the page', () => {
    expect(bar).toContain('background-color: var(--hf-colour-background-shortcuts);')
    expect(bar).toContain('border-block-end: 1px solid var(--hf-colour-border-shortcuts);')
    expect(bar).toContain('display: flex;')
    expect(bar).not.toMatch(/max-inline-size|max-width|inline-size:/)
  })

  it('is gone from the width where the body has two columns, with display: none, so a screen reader skips it', () => {
    const wide = page.match(/@media \(width >= ([\d.]+rem)\) \{\s*grid-template-columns: minmax\(24rem/)?.[1]

    expect(wide).toBe('56rem')
    expect(bar).toContain(`@media (width >= ${wide}) {\n      display: none;`)
    expect(css).not.toContain('visibility')
  })

  it('sticks to the top of the window under the top inset, over the cells, but not when it wraps', () => {
    expect(bar).toMatch(/@media \(width > 20em\) \{[^}]*inset-block-start: env\(safe-area-inset-top, 0\);/)
    expect(bar).toMatch(/@media \(width > 20em\) \{[^}]*position: sticky;/)
    expect(bar).toMatch(/@media \(width > 20em\) \{[^}]*z-index: 1;/)
  })

  it('keeps the heading of a link out from under the bar that sticks, as far as the bar shows and sticks', () => {
    expect(css).toMatch(
      /@media \(20em < width < 56rem\) \{\s*html:has\(\.hf-page-shortcuts\) \{\s*scroll-padding-block-start: calc\(env\(safe-area-inset-top, 0px\) \+ var\(--hf-shortcuts-height\)\);/,
    )
    expect(css).toContain('--hf-shortcuts-height: calc(2.25rem + 11px);')
  })

  it('has no padding at the end, so the row runs to the edge, apart from the notch', () => {
    expect(bar).toContain(
      'padding-inline: max(var(--hf-page-margin), env(safe-area-inset-left, 0px)) env(safe-area-inset-right, 0);',
    )
  })
})

describe('the label in shortcuts.css', () => {
  const label = rule('.hf-page-shortcuts-label')

  it('stays where it is and on one line, in the type style of the label', () => {
    expect(label).toContain('flex: none;')
    expect(label).toContain('white-space: nowrap;')
    expect(label).toContain('text-transform: uppercase;')
    expect(label).toContain('var(--hf-label-font-size)')
    expect(label).toContain('color: var(--hf-colour-text-shortcuts-label);')
  })
})

describe('the row in shortcuts.css', () => {
  const row = rule('.hf-page-shortcuts-row')

  it('scrolls sideways with no scrollbar, and the page does not', () => {
    expect(row).toContain('overflow-x: auto;')
    expect(row).toContain('scrollbar-width: none;')
    expect(row).toContain('&::-webkit-scrollbar {\n      display: none;')
    expect(row).toContain('min-inline-size: 0;')
  })

  it('fades at both edges with a mask moved by two registered lengths', () => {
    expect(row).toContain('mask-image: linear-gradient(')
    expect(row).toContain('var(--hf-shortcuts-fade-start)')
    expect(row).toContain('var(--hf-shortcuts-fade-end)')
    expect(css).toMatch(/@property --hf-shortcuts-fade-start \{[^}]*syntax: '<length>';/)
    expect(css).toMatch(/@property --hf-shortcuts-fade-end \{[^}]*syntax: '<length>';/)
  })

  it('moves the fade with the scrolling, in CSS and with no time of its own', () => {
    expect(row).toContain('animation-timeline: scroll(x self);')
    expect(row).toContain('animation-name: hf-shortcuts-fade;')
    expect(css).not.toMatch(/animation-duration|animation:|\d(ms|s)\b/)
    expect(css).toMatch(
      /@keyframes hf-shortcuts-fade \{\s*0% \{[^}]*--hf-shortcuts-fade-start: 0;[^}]*\}\s*4% \{[^}]*--hf-shortcuts-fade-start: 1\.5rem;[^}]*\}\s*96% \{[^}]*--hf-shortcuts-fade-end: 1\.5rem;[^}]*\}\s*100% \{[^}]*--hf-shortcuts-fade-end: 0;/,
    )
  })

  it('falls back to a fixed fade at the right and room behind the last link, without scroll animations', () => {
    expect(row).toMatch(/@supports not \(animation-timeline: scroll\(\)\) \{\s*--hf-shortcuts-fade-end: 1\.5rem;/)
    expect(css).toMatch(
      /@supports not \(animation-timeline: scroll\(\)\) \{\s*\.hf-page-shortcuts-list \{\s*padding-inline-end: 1\.5rem;/,
    )
  })

  it('snaps to the start of a link, near one only, with the first link where it stands at rest', () => {
    expect(row).toContain('scroll-snap-type: x proximity;')
    expect(row).toContain('scroll-padding-inline-start: 5px;')
    expect(css).toMatch(/\.hf-page-shortcuts-list > li \{\s*scroll-snap-align: start;/)
    expect(css).not.toContain('mandatory')
  })

  it('leaves room round the links for the focus ring, which the scroll area would cut off', () => {
    expect(rule('.hf-page-shortcuts-list')).toContain('padding: 5px;')
    expect(row).toContain('margin-inline-start: -5px;')
  })
})

describe('a link in shortcuts.css', () => {
  const link = rule('.hf-page-shortcuts-link')

  it('is a pill 36 pixels high at the usual text size, and so over the 24 pixels WCAG asks for', () => {
    expect(link).toContain('block-size: 2.25rem;')
    expect(link).toContain('border-radius: 999px;')
    expect(link).toContain('white-space: nowrap;')
  })

  it('has no underline at rest, and it appears under the mouse only where there is one', () => {
    expect(link).toContain('text-decoration-line: none;')
    expect(link).toMatch(/@media \(hover: hover\) \{\s*&:hover \{[^}]*text-decoration-line: underline;/)
    expect(link).not.toMatch(/}\s*&:hover/)
  })

  it('gets a fill when pressed, and the colour of its roles', () => {
    expect(link).toContain('color: var(--hf-colour-text-shortcuts-link);')
    expect(link).toMatch(/&:active \{[^}]*background-color: var\(--hf-colour-background-shortcuts-pressed\);/)
  })

  it('changes colour and fill with the motion tokens, so reduced motion takes the change away', () => {
    expect(link).toContain('color var(--hf-motion-duration-short) var(--hf-motion-ease-change)')
    expect(link).toContain('background-color var(--hf-motion-duration-quick) var(--hf-motion-ease-change)')
  })

  it('leaves the focus ring to the base styles', () => {
    expect(css).not.toMatch(/outline|:focus/)
  })
})

describe('the wrapped bar in shortcuts.css', () => {
  const narrow = css.match(/@media \(width <= 20em\) \{(.*)\n\s*\}\n\}/s)?.[1] ?? ''

  it('wraps at 20em, which follows the text size of the visitor, so nothing scrolls sideways', () => {
    expect(narrow).toMatch(/\.hf-page-shortcuts \{[^}]*flex-wrap: wrap;/)
    expect(narrow).toMatch(/\.hf-page-shortcuts-row \{[^}]*overflow: visible;/)
    expect(narrow).toMatch(/\.hf-page-shortcuts-row \{[^}]*mask-image: none;/)
    expect(narrow).toMatch(/\.hf-page-shortcuts-row \{[^}]*animation-name: none;/)
    expect(narrow).toMatch(/\.hf-page-shortcuts-row \{[^}]*scroll-snap-type: none;/)
    expect(narrow).toMatch(/\.hf-page-shortcuts-list \{[^}]*flex-wrap: wrap;/)
  })

  it('pulls the list back by the padding of a link, so the text of the first link is in line with the label', () => {
    expect(narrow).toMatch(/\.hf-page-shortcuts-list \{[^}]*margin-inline-start: -0\.625rem;/)
  })
})
