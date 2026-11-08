import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Without the comments, which mention the rules in words.
const read = (file: string) => readFileSync(join(import.meta.dirname, file), 'utf8').replace(/\/\*.*?\*\//gs, '')

// jsdom doesn't apply rules in a cascade layer or know ::picker-icon, so the test reads the
// text of the files.
const css = read('select.css')
const supports = '@supports (appearance: base-select)'

describe('the styled list in select.css', () => {
  it('puts every rule for .hf-select-styled inside @supports, so another browser keeps its own list', () => {
    expect(css.split(supports)).toHaveLength(2)
    expect(css.slice(0, css.indexOf(supports))).not.toContain('hf-select-styled')
  })

  it('makes the closed list and the open list customisable, and styles the arrow and the options', () => {
    expect(css).toMatch(/\.hf-select-styled,\s*\.hf-select-styled::picker\(select\) \{\s*appearance: base-select;/)
    expect(css).toContain('&::picker-icon')
    expect(css).toContain('&::picker(select)')
    expect(css).toMatch(/option \{[^]*&:checked \{/)
    expect(css).toContain('&::checkmark')
  })

  it('does not draw the arrow as a background: it is the arrow of the browser, which keeps its shape in forced colours', () => {
    expect(css).not.toContain('background-image')
    expect(css).not.toMatch(/gradient/)
  })

  it('gives each option a target of 44 pixels and no colour that is not a token', () => {
    expect(css).toContain('min-block-size: var(--hf-size-control)')
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i)
  })
})

describe('the open list in select.css', () => {
  it('is as wide as its longest option, never wider than the screen, and wraps a long option', () => {
    expect(css).toContain('inline-size: max-content')
    expect(css).toMatch(/@position-try --hf-select-below-end \{[^}]*max-inline-size: stretch/)
    expect(css).not.toMatch(/\dvw/)
    expect(css).toMatch(/white-space: normal/)
    expect(css).toMatch(/overflow-inline: hidden/)
  })

  it('opens below first, then above, and tries the other side of the field before leaving the screen', () => {
    expect(css).not.toContain('most-block-size')
    expect(css).toContain('position-try-order: normal')
    expect(css).toMatch(/max-block-size: none/)
    expect(css).toMatch(
      /position-try-fallbacks:\s*--hf-select-below-end, flip-block, --hf-select-above-end, --hf-select-below-shrunk, --hf-select-above-shrunk;/,
    )
    expect(css).toMatch(/@position-try --hf-select-below-end \{[^}]*position-area: block-end span-inline-start/)
    expect(css).toMatch(/@position-try --hf-select-above-end \{[^}]*position-area: block-start span-inline-start/)
  })

  it('shrinks to the room on the side with most room when the list fits on neither side', () => {
    expect(css).toMatch(
      /@position-try --hf-select-below-shrunk \{[^}]*max-block-size: stretch[^}]*min-block-size: calc\(\(100dvb - anchor-size\(block\)\) \/ 2\)/,
    )
    expect(css).toMatch(/@position-try --hf-select-above-shrunk \{[^}]*max-block-size: stretch/)
    expect(css.match(/anchor-size\(/g)).toHaveLength(1)
  })

  it('tries at most five places, because Chromium ignores a sixth', () => {
    const fallbacks = /position-try-fallbacks:([^;]*);/.exec(css)![1]!.split(',')

    expect(fallbacks.length).toBeLessThanOrEqual(5)
    expect(css.match(/@position-try /g)!.length).toBeLessThanOrEqual(5)
  })

  it('scrolls itself and not the page, with no fixed height', () => {
    expect(css).toContain('overscroll-behavior: contain')
    expect(css).not.toMatch(/(?:max-)?block-size: \d/)
    expect(css).not.toMatch(/max-height/)
  })

  it('has proportional figures in the field, the open list and the options, and nowhere outside the styled list', () => {
    const styled = css.slice(css.indexOf(supports))

    expect(styled.match(/font-variant-numeric: proportional-nums/g)).toHaveLength(3)
    expect(css.slice(0, css.indexOf(supports))).not.toContain('font-variant-numeric')
    expect(css).not.toContain('tabular-nums')
  })
})

describe('the season picker', () => {
  it('asks for the styled list', () => {
    expect(read('../season-picker/SeasonPicker.tsx')).toContain('className="hf-select-styled"')
  })
})
