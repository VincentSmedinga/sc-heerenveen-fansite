import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contrast, fallback, role } from '../../tokens/colourRoles'

// jsdom doesn't apply rules in a cascade layer, so the test reads the file's text, without the
// comments, which mention the rules in words.
const css = readFileSync(join(import.meta.dirname, 'button.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')
const danger = css.slice(css.indexOf('.hf-button-danger {'))

const surfaces = ['page', 'surface', 'surface-strong', 'surface-soft', 'surface-warm']

describe('the danger button', () => {
  it('takes its fill and its hover from colour roles of its own, and the text of the filled button', () => {
    expect(danger).toContain('background-color: var(--hf-colour-background-button-danger);')
    expect(danger).toContain('background-color: var(--hf-colour-background-button-danger-hover);')
    expect(danger).not.toContain('color: var(--hf-colour-text')
    expect(css).not.toMatch(/var\(--hf-colour-(?:blue|grey|red|steel|sand)-/)
  })

  it.each(['light', 'dark'] as const)('has text that reaches 4.5:1 on the fill and on the hover in %s', (theme) => {
    const text = role('text-on-button')[theme]

    expect(contrast(text, role('background-button-danger')[theme])).toBeGreaterThanOrEqual(4.5)
    expect(contrast(text, role('background-button-danger-hover')[theme])).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['light', 'dark'] as const)('has a fill that reaches 3:1 on every surface in %s', (theme) => {
    for (const surface of surfaces) {
      const ground = role(`background-${surface}`)[theme]

      expect(contrast(role('background-button-danger')[theme], ground), surface).toBeGreaterThanOrEqual(3)
      expect(contrast(role('background-button-danger-hover')[theme], ground), surface).toBeGreaterThanOrEqual(3)
    }
  })

  it('has the fallback colours for a browser without light-dark(), the same as the light ones', () => {
    for (const name of ['background-button-danger', 'background-button-danger-hover']) {
      expect(fallback(name), name).toBe(role(name).light)
    }
  })
})
