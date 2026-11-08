import { describe, expect, it } from 'vitest'

import { sourceOf } from './match-sources'

const wikipedia = { dataSource: 'wikipedia' } as const
const archive = { dataSource: 'oude-fansite' } as const

describe('sourceOf', () => {
  it('is Wikipedia for matches from Wikipedia, and for no match at all', () => {
    expect(sourceOf([wikipedia, wikipedia])).toBe('wikipedia')
    expect(sourceOf([])).toBe('wikipedia')
  })

  it('is the archive when every match comes from the old fansite', () => {
    expect(sourceOf([archive, archive])).toBe('archive')
  })

  it('is both when the matches come from both', () => {
    expect(sourceOf([archive, wikipedia])).toBe('both')
  })
})
