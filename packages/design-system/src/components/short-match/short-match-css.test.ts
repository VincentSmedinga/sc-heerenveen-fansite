import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'short-match.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

describe('short-match.css', () => {
  it('has no colour of the outcome and no bar: the list of clean sheets is quiet', () => {
    expect(css).not.toMatch(/outcome/u)
    expect(css).not.toMatch(/background/u)
  })

  it('lets the line wrap and break long names, so the page never scrolls sideways', () => {
    expect(css).toMatch(/flex-wrap: wrap/u)
    expect(css).toMatch(/overflow-wrap: anywhere/u)
  })

  it('draws the line above a name that stands before the match, and not between the name and the match', () => {
    expect(css).toMatch(
      /li > :not\(\.hf-short-match\):has\(\+ \.hf-short-match\) \{[^}]*border-block-start: 1px solid/u,
    )
    expect(css).toMatch(/li > :not\(\.hf-short-match\) \+ \.hf-short-match \{[^}]*border-block-start: 0;/u)
  })
})
