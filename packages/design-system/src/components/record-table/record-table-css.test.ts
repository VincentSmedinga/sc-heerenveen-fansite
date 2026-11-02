import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'record-table.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

describe('record-table.css', () => {
  it('makes the figures of the total row bold, with the weight of the figures that people look up', () => {
    expect(css).toMatch(/tfoot \{\s*font-weight: var\(--hf-figure-font-weight\)/u)
  })

  it('puts a line above the total, thicker than the line between the other rows', () => {
    expect(css).toMatch(/border-block-start: 2px solid var\(--hf-colour-border-default\)/u)
  })
})
