import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Without the comments, which mention the rules in words.
const strip = (text: string) => text.replace(/\/\*.*?\*\//gs, '')
const css = strip(readFileSync(join(import.meta.dirname, 'navigation.css'), 'utf8'))
// The part of the file about the bar of sub-pages, which comes last.
const sub = css.slice(css.indexOf('  .hf-navigation-bar {'))
const shortcuts = strip(readFileSync(join(import.meta.dirname, '../page/shortcuts.css'), 'utf8'))
const colours = strip(readFileSync(join(import.meta.dirname, '../../tokens/colour.css'), 'utf8'))

// jsdom has no cascade layers, so the test reads the text of the file.
const rule = (selector: string, text = css) =>
  text.match(
    new RegExp(
      String.raw`\n  ${selector.replace('.', String.raw`\.`)} \{([^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*)\}`,
    ),
  )?.[1] ?? ''

describe('the colours of the bar of sub-pages', () => {
  it('comes from the roles in the tokens, and no colour is written in the file', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(|color-mix\(/i)
    expect(css).not.toMatch(/--hf-colour-(blue|red|grey|sand|steel)-\d+/)
    expect(sub.match(/var\(--hf-colour-[a-z-]+\)/g)?.sort()).toEqual(
      [
        'var(--hf-colour-accent-on-header)',
        'var(--hf-colour-background-submenu)',
        'var(--hf-colour-background-submenu-pressed)',
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

describe('the bar of sub-pages in navigation.css', () => {
  const bar = rule('.hf-navigation-bar')

  it('is on the colour of its own role, with no line under it or above it, and as wide as the page', () => {
    expect(bar).toContain('background-color: var(--hf-colour-background-submenu);')
    expect(bar).toContain('display: flex;')
    expect(bar).not.toMatch(/border-(block|inline|top|bottom)|border:|box-shadow|outline/)
    expect(bar).not.toMatch(/max-inline-size|max-width|(?<![a-z-])inline-size:/)
  })

  it('has the ring of the header, set on the band of the menu that the bar is in', () => {
    expect(rule('.hf-navigation-header')).toContain('--hf-colour-focus: var(--hf-colour-focus-on-header);')
  })

  it('puts the text of the first link on the inset of the page, in line with the logo and the menu', () => {
    expect(rule('.hf-navigation-header')).toContain(
      '--hf-navigation-inset-start: max(var(--hf-page-inset), env(safe-area-inset-left, 0px));',
    )
    expect(bar).toContain('padding-inline: calc(var(--hf-navigation-inset-start) - 0.625rem)')
    expect(bar).toContain('env(safe-area-inset-right, 0);')
    expect(css).toContain('padding-inline: 0.625rem;')
  })

  it('is as wide as the page although the menu above it keeps to the inset, by taking the inset back at both sides', () => {
    expect(bar).toContain('flex: 0 0 calc(100% + var(--hf-navigation-inset-start) + var(--hf-navigation-inset-end));')
    expect(bar).toContain(
      'margin-inline: calc(-1 * var(--hf-navigation-inset-start)) calc(-1 * var(--hf-navigation-inset-end));',
    )
  })

  it('comes after all the links of the menu, whichever row the link of its item is on, with the space of the menu above it', () => {
    expect(bar).toContain('order: 1;')
    expect(bar).toContain('margin-block: var(--hf-navigation-end) calc(-1 * var(--hf-navigation-end));')
    expect(rule('.hf-navigation-header')).toContain('padding-block-end: var(--hf-navigation-end);')
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

describe('a sub-page link in navigation.css', () => {
  const link = rule('.hf-navigation-sublink')

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

describe('the row of the bar of sub-pages', () => {
  it('is the row and the list of the bar of anchors, so both scroll, snap and fade alike', () => {
    expect(shortcuts).toContain('overflow-x: auto;')
    expect(shortcuts).toContain('animation-timeline: scroll(x self);')
    expect(shortcuts).toContain('scroll-snap-type: x proximity;')
    expect(css).not.toMatch(/overflow|mask-image|scroll-snap|animation/)
  })
})

describe('the wrapped bar in navigation.css', () => {
  const narrow = css.match(/@media \(width <= 20em\) \{(.*)\n\s*\}\n\}/s)?.[1] ?? ''

  it('wraps at the same 20em as the bar of anchors, which wraps the row and the list', () => {
    expect(shortcuts).toMatch(/@media \(width <= 20em\) \{[\s\S]*\.hf-page-shortcuts-row \{[^}]*overflow: visible;/)
    expect(narrow).toContain('padding-inline-end: max(var(--hf-page-margin), env(safe-area-inset-right, 0px));')
  })

  it('does not pull the list back, since there is no label to line up with', () => {
    expect(narrow).toMatch(/\.hf-navigation-bar \.hf-page-shortcuts-list \{[^}]*margin-inline-start: 0;/)
  })
})

describe('the main menu in navigation.css', () => {
  const band = rule('.hf-navigation-header')
  const link = rule('.hf-navigation-header .hf-navigation-link')

  it('is a band on the colour of the header, so it is one blue with the header above it', () => {
    expect(band).toContain('background-color: var(--hf-colour-background-header);')
    expect(band).toContain('display: flex;')
    expect(band).toContain('flex-wrap: wrap;')
    expect(band).toContain('gap: 0 1rem;')
  })

  it('has the inset of the page at both sides, and the same space under the links as the header used to keep', () => {
    expect(band).toContain('padding-inline: var(--hf-navigation-inset-start) var(--hf-navigation-inset-end);')
    expect(band).toContain('--hf-navigation-end: 0.4375rem;')
    expect(band).toContain('--hf-navigation-inset-end: max(var(--hf-page-inset), env(safe-area-inset-right, 0px));')
  })

  it('has a thin line above the links that stops at the inset, and that stays in forced colours', () => {
    expect(band).toMatch(/&::before \{[^}]*border-block-start: 1px solid var\(--hf-colour-border-on-header\);/)
    expect(band).toMatch(/&::before \{[^}]*flex: 0 0 100%;/)
    expect(band).toMatch(/&::before \{[^}]*margin-block-end: 0\.25rem;/)
    expect(band).toMatch(/&::before \{[^}]*order: -1;/)
    expect(band).not.toMatch(/&::before \{[^}]*background/)
  })

  it('takes no box for the list and its items, so the bar can go under the links', () => {
    expect(css).toMatch(
      /\.hf-navigation-header \.hf-navigation-list,\s*\.hf-navigation-header \.hf-navigation-list > li \{\s*display: contents;/,
    )
  })

  it('keeps the last link, the forum, on the right', () => {
    expect(css).toMatch(
      /\.hf-navigation-header \.hf-navigation-list > li:last-child > \.hf-navigation-link \{\s*margin-inline-start: auto;/,
    )
  })

  it('puts the links in the lightest colour of the header, and the current one in red-underlined weight 800', () => {
    expect(link).toContain('color: var(--hf-colour-text-on-header);')
    expect(link).toMatch(/&:is\(\[aria-current='page'\], \[aria-current='true'\]\) \{[^}]*font-weight: 800;/)
    expect(link).toMatch(/&:is\([^)]*\) \{[^}]*text-decoration-color: var\(--hf-colour-accent-on-header\);/)
    expect(link).toMatch(/&:is\([^)]*\) \{[^}]*text-decoration-thickness: 3px;/)
  })

  it('marks the item of the current sub-page like the current page in the footer too, in the plain row', () => {
    expect(css).toMatch(/\.hf-navigation-link \{[^}]*&:is\(\[aria-current='page'\], \[aria-current='true'\]\) \{/s)
  })
})
