import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'match-score-bar.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

describe('match-score-bar.css', () => {
  it('colours the pieces with the tokens of an outcome, in a calm part', () => {
    expect(css).toMatch(/color-mix\(in srgb, var\(--hf-match-score-bar-colour\) 80%, transparent\)/u)
    expect(css).toMatch(/\.hf-match-score-bar-win \{\s*--hf-match-score-bar-colour: var\(--hf-colour-outcome-win\)/u)
    expect(css).toMatch(/\.hf-match-score-bar-draw \{\s*--hf-match-score-bar-colour: var\(--hf-colour-outcome-draw\)/u)
    expect(css).toMatch(/\.hf-match-score-bar-loss \{\s*--hf-match-score-bar-colour: var\(--hf-colour-outcome-loss\)/u)
  })

  it('parts the pieces with a transparent border, so the line is the colour of the surface', () => {
    expect(css).toMatch(/background-clip: padding-box/u)
    expect(css).toMatch(/border-inline-start: 2px solid transparent/u)
  })

  it('keeps the pieces visible in forced colours with a system colour', () => {
    expect(css).toMatch(
      /@media \(forced-colors: active\) \{\s*\.hf-match-score-bar-piece \{\s*background-color: CanvasText/u,
    )
  })

  it('has nothing that scrolls sideways, and no minimum width', () => {
    expect(css).not.toMatch(/overflow-x|scroll|min-inline-size|min-width/u)
  })
})
