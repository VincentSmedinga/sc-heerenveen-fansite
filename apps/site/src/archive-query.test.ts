import { describe, expect, it } from 'vitest'

import { archiveHeading, archiveHref, archiveQuery, archiveTitle, parseArchiveQuery } from './archive-query'

describe('parseArchiveQuery', () => {
  it('reads no source and the first page when the address has neither', () => {
    expect(parseArchiveQuery({})).toEqual({ page: 1, sources: [] })
    expect(parseArchiveQuery({ utm_source: 'nieuwsbrief' })).toEqual({ page: 1, sources: [] })
  })

  it('reads one source, as one slug', () => {
    expect(parseArchiveQuery({ bron: 'nos' })).toEqual({ page: 1, sources: ['nos'] })
  })

  it('reads more sources, in the order of the address', () => {
    expect(parseArchiveQuery({ bron: ['nos', 'lc'] })).toEqual({ page: 1, sources: ['nos', 'lc'] })
  })

  it('reads the page', () => {
    expect(parseArchiveQuery({ bron: ['nos', 'lc'], pagina: '3' })).toEqual({ page: 3, sources: ['nos', 'lc'] })
    expect(parseArchiveQuery({ pagina: '1' })).toEqual({ page: 1, sources: [] })
  })

  it('refuses a source that is given twice, also next to another', () => {
    expect(parseArchiveQuery({ bron: ['nos', 'nos'] })).toBeUndefined()
    expect(parseArchiveQuery({ bron: ['nos', 'lc', 'nos'] })).toBeUndefined()
  })

  it('leaves an empty or an unknown slug to the list of sources, which does not know them', () => {
    expect(parseArchiveQuery({ bron: '' })).toEqual({ page: 1, sources: [''] })
    expect(parseArchiveQuery({ bron: ['nos', 'bestaat-niet'] })).toEqual({ page: 1, sources: ['nos', 'bestaat-niet'] })
  })

  it.each(['0', '-1', '2.5', 'abc', '', '+2', '02', ' 2', '99999999999999999999'])('refuses the page %j', (pagina) => {
    expect(parseArchiveQuery({ pagina })).toBeUndefined()
  })

  it('refuses a page that is given twice', () => {
    expect(parseArchiveQuery({ pagina: ['1', '2'] })).toBeUndefined()
  })
})

describe('archiveQuery and archiveHref', () => {
  it('have no query for the first page of all sources', () => {
    expect(archiveQuery([], 1)).toBe('')
    expect(archiveHref([], 1)).toBe('/nieuws')
  })

  it('write one bron for each source, in the order given, and the page after them', () => {
    expect(archiveHref(['nos'], 1)).toBe('/nieuws?bron=nos')
    expect(archiveHref(['lc', 'nos'], 1)).toBe('/nieuws?bron=lc&bron=nos')
    expect(archiveHref([], 2)).toBe('/nieuws?pagina=2')
    expect(archiveHref(['lc', 'nos'], 3)).toBe('/nieuws?bron=lc&bron=nos&pagina=3')
    expect(archiveQuery(['lc', 'nos'], 3)).toBe('bron=lc&bron=nos&pagina=3')
  })

  it('escape what is not safe in an address', () => {
    expect(archiveHref(['a&b=c'], 1)).toBe('/nieuws?bron=a%26b%3Dc')
  })
})

describe('archiveHeading and archiveTitle', () => {
  it('say Nieuwsarchief for all sources', () => {
    expect(archiveHeading([])).toBe('Nieuwsarchief')
    expect(archiveTitle([], 1)).toBe('Nieuwsarchief')
  })

  it('name one source, two with "en", and three or more with commas and "en"', () => {
    expect(archiveHeading(['A'])).toBe('Nieuwsarchief van A')
    expect(archiveHeading(['A', 'B'])).toBe('Nieuwsarchief van A en B')
    expect(archiveHeading(['A', 'B', 'C'])).toBe('Nieuwsarchief van A, B en C')
    expect(archiveHeading(['A', 'B', 'C', 'D'])).toBe('Nieuwsarchief van A, B, C en D')
  })

  it('add the page after the first page', () => {
    expect(archiveTitle([], 2)).toBe('Nieuwsarchief, pagina 2')
    expect(archiveTitle(['A', 'B'], 3)).toBe('Nieuwsarchief van A en B, pagina 3')
  })
})
