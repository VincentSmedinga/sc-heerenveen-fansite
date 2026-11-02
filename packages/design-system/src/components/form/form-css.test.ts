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
})
