import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Without the comments, which mention the rules in words.
const strip = (text: string) => text.replace(/\/\*.*?\*\//gs, '')
const css = strip(readFileSync(join(import.meta.dirname, 'submenu.css'), 'utf8'))
const shortcuts = strip(readFileSync(join(import.meta.dirname, 'shortcuts.css'), 'utf8'))
const colours = strip(readFileSync(join(import.meta.dirname, '../../tokens/colour.css'), 'utf8'))

// jsdom has no cascade layers, so the test reads the text of the file.
const rule = (selector: string, text = css) =>
  text.match(
    new RegExp(
      String.raw`\n  ${selector.replace('.', String.raw`\.`)} \{([^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*)\}`,
    ),
  )?.[1] ?? ''

describe('the colours of the submenu', () => {
  it('comes from the roles in the tokens, and no colour is written in the file', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(|color-mix\(/i)
    expect(css).not.toMatch(/--hf-colour-(blue|red|grey|sand|steel)-\d+/)
    expect(css.match(/var\(--hf-colour-[a-z-]+\)/g)?.sort()).toEqual(
      [
        'var(--hf-colour-accent-on-header)',
        'var(--hf-colour-background-submenu)',
        'var(--hf-colour-background-submenu-pressed)',
        'var(--hf-colour-focus-on-header)',
        'var(--hf-colour-text-on-header)',
        'var(--hf-colour-text-submenu-link-hover)',
        'var(--hf-colour-text-submenu-link-hover)',
      ].sort(),
    )
  })

  it('has a role of its own for the surface: a tint of the header, a step lighter, in both themes', () => {
    expect(colours).toContain(
      '--hf-colour-background-submenu: light-dark(var(--hf-colour-blue-800), var(--hf-colour-blue-700));',
    )
    expect(colours).toContain(
      '--hf-colour-background-header: light-dark(var(--hf-colour-blue-900), var(--hf-colour-blue-800));',
    )
    expect(colours).toContain(
      '--hf-colour-background-shortcuts: light-dark(var(--hf-colour-sand-100), var(--hf-colour-blue-900));',
    )
  })

  it('has the light value in the block for browsers without light-dark()', () => {
    expect(colours).toMatch(
      /@supports not \(color: light-dark\(#000, #fff\)\) \{[\s\S]*--hf-colour-background-submenu: var\(--hf-colour-blue-800\);/,
    )
  })

  it('has the links in the text of the header, white under the mouse, with a pill when pressed', () => {
    expect(colours).toContain('--hf-colour-text-on-header: var(--hf-colour-blue-50);')
    expect(colours).toContain('--hf-colour-text-submenu-link-hover: var(--hf-colour-white);')
    expect(colours).toContain(
      '--hf-colour-background-submenu-pressed: color-mix(in srgb, var(--hf-colour-blue-200) 18%, transparent);',
    )
  })
})

describe('the bar in submenu.css', () => {
  const bar = rule('.hf-page-submenu')

  it('is on the colour of its own role, with no line under it or above it, and as wide as the page', () => {
    expect(bar).toContain('background-color: var(--hf-colour-background-submenu);')
    expect(bar).toContain('display: flex;')
    expect(bar).not.toMatch(/border-(block|inline|top|bottom)|border:|box-shadow|outline/)
    expect(bar).not.toMatch(/max-inline-size|max-width|inline-size:/)
  })

  it('has the ring of the header', () => {
    expect(bar).toContain('--hf-colour-focus: var(--hf-colour-focus-on-header);')
  })

  it('puts the text of the first link on the inset of the page, in line with the logo and the menu', () => {
    expect(bar).toContain('padding-inline: calc(max(var(--hf-page-inset), env(safe-area-inset-left, 0px)) - 0.625rem)')
    expect(bar).toContain('env(safe-area-inset-right, 0);')
    expect(css).toContain('padding-inline: 0.625rem;')
  })

  it('never sticks and is never gone, at any width', () => {
    expect(css).not.toMatch(/sticky|fixed|position:|inset-block-start|z-index/)
    expect(css).not.toMatch(/display: none|visibility|@media \(width >=? 56rem\)/)
    expect(css).not.toContain('scroll-padding-block-start')
  })

  it('leaves the stuck bar of anchors its room, which only that bar needs', () => {
    expect(shortcuts).toMatch(/html:has\(\.hf-page-shortcuts\) \{\s*scroll-padding-block-start/)
    expect(shortcuts).not.toContain('submenu')
  })
})

describe('a link in submenu.css', () => {
  const link = rule('.hf-page-submenu-link')

  it('is a pill 36 pixels high at the usual text size, of 1rem in regular weight, on one line', () => {
    expect(link).toContain('block-size: 2.25rem;')
    expect(link).toContain('border-radius: 999px;')
    expect(link).toContain('font-size: 1rem;')
    expect(link).toContain('font-weight: 400;')
    expect(link).toContain('white-space: nowrap;')
    expect(link).toContain('color: var(--hf-colour-text-on-header);')
  })

  it('has no underline at rest, and it appears under the mouse only where there is one', () => {
    expect(link).toContain('text-decoration-line: none;')
    expect(link).toMatch(/@media \(hover: hover\) \{\s*&:hover \{[^}]*text-decoration-line: underline;/)
    expect(link).toMatch(
      /@media \(hover: hover\) \{\s*&:hover \{[^}]*color: var\(--hf-colour-text-submenu-link-hover\);/,
    )
    expect(link).not.toMatch(/}\s*&:hover/)
  })

  it('gets a pill when pressed', () => {
    expect(link).toMatch(/&:active \{[^}]*background-color: var\(--hf-colour-background-submenu-pressed\);/)
  })

  it('changes colour and fill with the motion tokens, so reduced motion takes the change away', () => {
    expect(link).toContain('color var(--hf-motion-duration-short) var(--hf-motion-ease-change)')
    expect(link).toContain('background-color var(--hf-motion-duration-quick) var(--hf-motion-ease-change)')
    expect(css).not.toMatch(/\d(ms|s)\b/)
  })

  it('leaves the focus ring to the base styles, in the colour set on the bar', () => {
    expect(css).not.toMatch(/outline|:focus/)
  })

  const current = link.match(/&\[aria-current='page'\] \{(.*)\n {4}\}/s)?.[1] ?? ''

  it('tells the current page by weight 700 and the red line of the menu, 3px thick, and not by colour alone', () => {
    expect(current).toContain('font-weight: 700;')
    expect(current).toContain('text-decoration-color: var(--hf-colour-accent-on-header);')
    expect(current).toContain('text-decoration-line: underline;')
    expect(current).toContain('text-decoration-thickness: 3px;')
    expect(current).toContain('text-decoration-skip-ink: none;')
    expect(current).toContain('text-underline-offset: 0.35em;')
  })

  it('draws the line as the underline of the text, so it stays in forced colours', () => {
    expect(current.replace(/&:active \{[^}]*\}/, '')).not.toMatch(/border|box-shadow|background|outline/)
    expect(css).not.toContain('forced-color-adjust')
  })

  it('keeps its line under the mouse, because the rule of the current page comes after the one of the mouse', () => {
    expect(link.indexOf("&[aria-current='page']")).toBeGreaterThan(link.indexOf('&:hover'))
    expect(link.indexOf("&[aria-current='page']")).toBeGreaterThan(link.indexOf('&:active'))
  })

  it('has no pill when pressed on the current page, where the line would drop under 3:1', () => {
    expect(current).toMatch(/&:active \{\s*background-color: transparent;/)
  })
})

describe('the row of the submenu', () => {
  it('is the row and the list of the bar of anchors, so both scroll, snap and fade alike', () => {
    expect(shortcuts).toContain('overflow-x: auto;')
    expect(shortcuts).toContain('animation-timeline: scroll(x self);')
    expect(shortcuts).toContain('scroll-snap-type: x proximity;')
    expect(css).not.toMatch(/overflow|mask-image|scroll-snap|animation/)
  })
})

describe('the wrapped bar in submenu.css', () => {
  const narrow = css.match(/@media \(width <= 20em\) \{(.*)\n\s*\}\n\}/s)?.[1] ?? ''

  it('wraps at the same 20em as the bar of anchors, which wraps the row and the list', () => {
    expect(shortcuts).toMatch(/@media \(width <= 20em\) \{[\s\S]*\.hf-page-shortcuts-row \{[^}]*overflow: visible;/)
    expect(narrow).toContain('padding-inline-end: max(var(--hf-page-margin), env(safe-area-inset-right, 0px));')
  })

  it('does not pull the list back, since there is no label to line up with', () => {
    expect(narrow).toMatch(/\.hf-page-submenu \.hf-page-shortcuts-list \{[^}]*margin-inline-start: 0;/)
  })
})
