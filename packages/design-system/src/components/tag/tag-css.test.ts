import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contrast, fallback, role } from '../../tokens/colourRoles'

// jsdom doesn't apply rules in a cascade layer, so the test reads the file's text, without the
// comments, which mention the rules in words.
const css = readFileSync(join(import.meta.dirname, 'tag.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

const surfaces = ['page', 'surface', 'surface-strong', 'surface-soft', 'surface-warm']

// The text of each tone, and what its text lies on: the surfaces, or for the highlight tone its
// own fill.
const tones = [
  { ground: surfaces, text: 'text-missing' },
  { ground: surfaces, text: 'text-secondary' },
  { ground: ['highlight'], text: 'text-highlight' },
]

describe('the tones of a tag', () => {
  it('take their colours from colour roles, never from a scale', () => {
    expect(css).toContain('color: var(--hf-colour-text-missing);')
    expect(css).toContain('background-color: var(--hf-colour-background-highlight);')
    expect(css).toContain('border-color: var(--hf-colour-border-highlight);')
    expect(css).toContain('color: var(--hf-colour-text-highlight);')
    expect(css).not.toMatch(/var\(--hf-colour-(?:blue|grey|red|steel|sand)-/)
  })

  it.each(['light', 'dark'] as const)('have text that reaches 4.5:1 on what it lies on in %s', (theme) => {
    for (const { ground, text } of tones) {
      for (const surface of ground) {
        expect(
          contrast(role(text)[theme], role(`background-${surface}`)[theme]),
          `${text} on ${surface}`,
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it.each(['light', 'dark'] as const)('have a rim that reaches 3:1 on what it lies on in %s', (theme) => {
    // The attention and neutral tones have a rim in the colour of their text, which reaches
    // 4.5:1. The rim of the highlight tone is a colour of its own, against its fill and the
    // surfaces.
    for (const ground of ['highlight', ...surfaces]) {
      expect(
        contrast(role('border-highlight')[theme], role(`background-${ground}`)[theme]),
        ground,
      ).toBeGreaterThanOrEqual(3)
    }
  })

  it('has the fallback colour of the rim for a browser without light-dark(), the same as the light one', () => {
    expect(fallback('border-highlight')).toBe(role('border-highlight').light)
  })

  it('keeps a visible rim in forced colours', () => {
    expect(css).toMatch(/@media \(forced-colors: active\) \{\s*border-color: CanvasText;/)
  })
})
