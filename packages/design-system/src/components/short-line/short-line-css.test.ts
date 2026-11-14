import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'short-line.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

describe('short-line.css', () => {
  it('has no colour of an outcome and no bar of its own', () => {
    expect(css).not.toMatch(/outcome/u)
    expect(css).not.toMatch(/background/u)
  })

  it('lets the line wrap and break long names, so the page never scrolls sideways', () => {
    expect(css).toMatch(/flex-wrap: wrap/u)
    expect(css).toMatch(/overflow-wrap: anywhere/u)
  })

  it('draws the line above a name that stands before a line or a Match, and not between the name and it', () => {
    expect(css).toMatch(
      /li > :not\(:is\(\.hf-short-line, \.hf-match\)\):has\(\+ :is\(\.hf-short-line, \.hf-match\)\) \{[^}]*border-block-start: 1px solid/u,
    )
    expect(css).toMatch(
      /li > :not\(:is\(\.hf-short-line, \.hf-match\)\) \+ :is\(\.hf-short-line, \.hf-match\) \{[^}]*border-block-start: 0;/u,
    )
  })
})
