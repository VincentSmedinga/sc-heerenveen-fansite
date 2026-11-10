import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// jsdom doesn't apply rules in a cascade layer, so the test reads the text of the file.
const css = readFileSync(join(import.meta.dirname, 'form.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

describe('form.css', () => {
  it('puts space between the cards of a form of cards, and only there', () => {
    const rule = css.match(/\.hf-form:has\(> \.hf-card\) \{([^}]*)\}/)?.[1] ?? ''

    expect(rule).toContain('display: grid;')
    expect(rule).toContain('gap: var(--hf-space-xl);')
    expect(css).not.toMatch(/(^|\n)\s*\.hf-form \{[^}]*display: grid/)
  })

  it('puts the buttons of Form.Buttons in columns of one width with space between them', () => {
    const rule = css.match(/\.hf-form-buttons \{([^}]*)\}/)?.[1] ?? ''

    expect(rule).toContain('display: grid;')
    expect(rule).toContain('gap: var(--hf-space-s);')
    expect(rule).toContain('grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));')
  })
})
