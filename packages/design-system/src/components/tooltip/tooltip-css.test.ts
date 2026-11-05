import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contrast, role } from '../../tokens/colourRoles'

// jsdom doesn't apply rules in a cascade layer, so the test reads the file's text, without the
// comments, which mention the rules in words.
const css = readFileSync(join(import.meta.dirname, 'tooltip.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

const surfaces = ['page', 'surface', 'surface-strong', 'surface-soft', 'surface-warm']

describe('tooltip.css', () => {
  it('takes its colours from colour roles, never from a scale', () => {
    expect(css).toContain('background-color: var(--hf-colour-background-surface);')
    expect(css).toContain('border: 1px solid var(--hf-colour-border-input);')
    expect(css).toContain('color: var(--hf-colour-text-default);')
    expect(css).not.toMatch(/var\(--hf-colour-(?:blue|grey|red|steel|sand)-/)
  })

  it('ignores the pointer, so the pointer can pass over it', () => {
    expect(css).toContain('pointer-events: none;')
  })

  it('has no transition or animation: it is at the new place at once', () => {
    expect(css).not.toMatch(/transition|animation/)
  })

  it.each(['light', 'dark'] as const)('has text that reaches 4.5:1 on its own fill in %s', (theme) => {
    expect(contrast(role('text-default')[theme], role('background-surface')[theme])).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['light', 'dark'] as const)(
    'has a border that reaches 3:1 on its fill and on every surface in %s',
    (theme) => {
      for (const ground of surfaces) {
        expect(
          contrast(role('border-input')[theme], role(`background-${ground}`)[theme]),
          ground,
        ).toBeGreaterThanOrEqual(3)
      }
    },
  )
})
