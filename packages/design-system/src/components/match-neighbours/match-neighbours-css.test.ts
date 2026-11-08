import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'match-neighbours.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

describe('match-neighbours.css', () => {
  it('puts the two links next to each other from 40 rem and under each other below it', () => {
    expect(css).toMatch(/@container hf-match-neighbours \(min-width: 40rem\) \{\s*grid-template-columns: 1fr 1fr/u)
    expect(css).toMatch(/\.hf-match-neighbours-list \{\s*display: grid/u)
  })

  it('keeps "Volgende" at the right, also without "Vorige"', () => {
    expect(css).toMatch(/\[data-side='next'\] \{\s*@container[^{]*\{\s*grid-column: 2/u)
  })

  it('lets a long name break instead of scrolling the page sideways', () => {
    expect(css).toMatch(/overflow-wrap: anywhere/u)
    expect(css).toMatch(/min-inline-size: 0/u)
  })
})
