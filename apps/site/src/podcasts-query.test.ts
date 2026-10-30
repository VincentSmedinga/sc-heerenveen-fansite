import { describe, expect, it } from 'vitest'

import { parsePodcastsQuery, podcastsHeading, podcastsHref, podcastsQuery, podcastsTitle } from './podcasts-query'

describe('parsePodcastsQuery', () => {
  it('reads no podcast and the first page when the address has neither', () => {
    expect(parsePodcastsQuery({})).toEqual({ page: 1, podcasts: [] })
    expect(parsePodcastsQuery({ utm_source: 'nieuwsbrief' })).toEqual({ page: 1, podcasts: [] })
  })

  it('reads one podcast, as one slug', () => {
    expect(parsePodcastsQuery({ podcast: 'omroep-abe' })).toEqual({ page: 1, podcasts: ['omroep-abe'] })
  })

  it('reads more podcasts, in the order of the address', () => {
    expect(parsePodcastsQuery({ podcast: ['radio-camataru', 'omroep-abe'] })).toEqual({
      page: 1,
      podcasts: ['radio-camataru', 'omroep-abe'],
    })
  })

  it('reads the page', () => {
    expect(parsePodcastsQuery({ pagina: '3', podcast: ['omroep-abe', 'radio-camataru'] })).toEqual({
      page: 3,
      podcasts: ['omroep-abe', 'radio-camataru'],
    })
    expect(parsePodcastsQuery({ pagina: '1' })).toEqual({ page: 1, podcasts: [] })
  })

  it('refuses a podcast that is given twice, also next to another', () => {
    expect(parsePodcastsQuery({ podcast: ['omroep-abe', 'omroep-abe'] })).toBeUndefined()
    expect(parsePodcastsQuery({ podcast: ['omroep-abe', 'radio-camataru', 'omroep-abe'] })).toBeUndefined()
  })

  it('leaves an empty or an unknown slug to the list of podcasts, which does not know them', () => {
    expect(parsePodcastsQuery({ podcast: '' })).toEqual({ page: 1, podcasts: [''] })
    expect(parsePodcastsQuery({ podcast: ['omroep-abe', 'bestaat-niet'] })).toEqual({
      page: 1,
      podcasts: ['omroep-abe', 'bestaat-niet'],
    })
  })

  it('does not read the parameter of the news archive', () => {
    expect(parsePodcastsQuery({ bron: 'nos' })).toEqual({ page: 1, podcasts: [] })
  })

  it.each(['0', '-1', '2.5', 'abc', '', '+2', '02', ' 2', '99999999999999999999'])('refuses the page %j', (pagina) => {
    expect(parsePodcastsQuery({ pagina })).toBeUndefined()
  })

  it('refuses a page that is given twice', () => {
    expect(parsePodcastsQuery({ pagina: ['1', '2'] })).toBeUndefined()
  })
})

describe('podcastsQuery and podcastsHref', () => {
  it('have no query for the first page of all podcasts', () => {
    expect(podcastsQuery([], 1)).toBe('')
    expect(podcastsHref([], 1)).toBe('/podcasts')
  })

  it('write one podcast for each podcast, in the order given, and the page after them', () => {
    expect(podcastsHref(['omroep-abe'], 1)).toBe('/podcasts?podcast=omroep-abe')
    expect(podcastsHref(['omroep-abe', 'radio-camataru'], 1)).toBe(
      '/podcasts?podcast=omroep-abe&podcast=radio-camataru',
    )
    expect(podcastsHref([], 2)).toBe('/podcasts?pagina=2')
    expect(podcastsHref(['omroep-abe', 'radio-camataru'], 3)).toBe(
      '/podcasts?podcast=omroep-abe&podcast=radio-camataru&pagina=3',
    )
    expect(podcastsQuery(['omroep-abe'], 3)).toBe('podcast=omroep-abe&pagina=3')
  })

  it('escape what is not safe in an address', () => {
    expect(podcastsHref(['a&b=c'], 1)).toBe('/podcasts?podcast=a%26b%3Dc')
  })
})

describe('podcastsHeading and podcastsTitle', () => {
  it('say Podcasts for all podcasts', () => {
    expect(podcastsHeading([])).toBe('Podcasts')
    expect(podcastsTitle([], 1)).toBe('Podcasts')
  })

  it('name one podcast, two with "en", and three or more with commas and "en"', () => {
    expect(podcastsHeading(['A'])).toBe('Podcasts van A')
    expect(podcastsHeading(['A', 'B'])).toBe('Podcasts van A en B')
    expect(podcastsHeading(['A', 'B', 'C'])).toBe('Podcasts van A, B en C')
    expect(podcastsHeading(['A', 'B', 'C', 'D'])).toBe('Podcasts van A, B, C en D')
  })

  it('add the page after the first page', () => {
    expect(podcastsTitle([], 2)).toBe('Podcasts, pagina 2')
    expect(podcastsTitle(['A', 'B'], 3)).toBe('Podcasts van A en B, pagina 3')
  })
})
