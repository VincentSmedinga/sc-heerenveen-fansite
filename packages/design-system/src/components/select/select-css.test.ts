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
    expect(css).toContain('min-block-size: 2.75rem')
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i)
  })
})

describe('the season picker', () => {
  it('asks for the styled list', () => {
    expect(read('../season-picker/SeasonPicker.tsx')).toContain('className="hf-select-styled"')
  })
})
