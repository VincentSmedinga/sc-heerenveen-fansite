import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'match-penalty-series.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

describe('match-penalty-series.css', () => {
  it('writes the total in the font of the headings', () => {
    expect(css).toMatch(/\.hf-match-penalty-total \{[^}]*font-family: var\(--hf-font-family-display\)/su)
  })

  it('lets the kicks wrap and the words of a cell break, so nothing scrolls sideways on a phone', () => {
    expect(css).toMatch(/\.hf-match-penalty-kicks \{[^}]*flex-wrap: wrap/su)
    expect(css).toMatch(/overflow-wrap: anywhere/u)
    expect(css).not.toMatch(/overflow-x|scroll|min-inline-size|min-width/u)
  })

  it('leaves an open space before the deciding rounds', () => {
    expect(css).toMatch(/\.hf-match-penalty-deciding \{\s*margin-inline-start: var\(--hf-space-s\)/u)
  })
})
