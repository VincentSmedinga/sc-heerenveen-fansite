import { describe, expect, it } from 'vitest'

import { seasonSourceOf, sourceName, sourceOf } from './match-sources'

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

describe('seasonSourceOf', () => {
  it('is Wikipedia when a season is not found, as before there was an archive', () => {
    expect(seasonSourceOf(undefined)).toBe('wikipedia')
  })

  it('adds Wikipedia to a season of old matches that has a page of Wikipedia, for the table', () => {
    expect(seasonSourceOf({ matches: [archive], pages: [] })).toBe('archive')
    expect(seasonSourceOf({ matches: [archive], pages: [{}] })).toBe('both')
    expect(seasonSourceOf({ matches: [wikipedia], pages: [] })).toBe('wikipedia')
  })
})

describe('sourceName', () => {
  it('names the source in a sentence', () => {
    expect(sourceName('wikipedia')).toBe('de Nederlandse Wikipedia')
    expect(sourceName('archive')).toBe('het archief van de oude sc Heerenveen Fansite')
    expect(sourceName('both')).toBe('de Nederlandse Wikipedia en het archief van de oude sc Heerenveen Fansite')
  })
})
