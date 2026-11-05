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
    expect(css).toContain('background-color: var(--hf-colour-text-default);')
    expect(css).toContain('color: var(--hf-colour-background-surface);')
    expect(css).not.toMatch(/var\(--hf-colour-(?:blue|grey|red|steel|sand)-/)
  })

  it('ignores the pointer, so the pointer can pass over it', () => {
    expect(css).toContain('pointer-events: none;')
  })

  it('is medium bold, so the figures stay readable at a small size', () => {
    expect(css).toContain('font-weight: var(--hf-tooltip-font-weight);')
  })

  it('slides to its new place, with the duration of a motion token and nothing else moving', () => {
    expect(css).toContain('inset-block-start var(--hf-motion-duration-short) var(--hf-motion-ease-enter)')
    expect(css).toContain('inset-inline-start var(--hf-motion-duration-short) var(--hf-motion-ease-enter)')
    expect(css).not.toMatch(/animation/)
  })

  it.each(['light', 'dark'] as const)('has text that reaches 4.5:1 on its own fill in %s', (theme) => {
    expect(contrast(role('background-surface')[theme], role('text-default')[theme])).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['light', 'dark'] as const)('has a fill that reaches 3:1 on every surface in %s', (theme) => {
    for (const ground of surfaces) {
      expect(contrast(role('text-default')[theme], role(`background-${ground}`)[theme]), ground).toBeGreaterThanOrEqual(
        3,
      )
    }
  })
})
