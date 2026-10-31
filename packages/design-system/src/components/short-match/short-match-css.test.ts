import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'short-match.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

describe('short-match.css', () => {
  it('leaves the colour of the outcome to the classes of match.css, and has no bar of its own', () => {
    expect(css).not.toMatch(/outcome/u)
    expect(css).not.toMatch(/background/u)
  })

  it('gives the result the weight of a result in Match and does not take the colour away in forced colours', () => {
    const match = readFileSync(join(import.meta.dirname, '../match/match.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')
    const weight = (source: string, selector: string) =>
      new RegExp(`${selector} \\{[^}]*font-weight: var\\(--hf-figure-font-weight\\)`, 'u').test(source)

    expect(weight(match, '\\.hf-match-score')).toBe(true)
    expect(weight(css, '\\.hf-short-match-score')).toBe(true)
    expect(css).not.toMatch(/forced-color-adjust/u)
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
