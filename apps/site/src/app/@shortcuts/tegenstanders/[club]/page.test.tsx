import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ClubPage as ClubPageView } from '#src/app/tegenstanders/opponents-pages'
import { getMatchSeasons } from '#src/matches'
import { type ClubPage, getClubPage, getSourcePages } from '#src/opponents'
import { beker, komend, matchSeasons, promovendus, sourcePages, testclub } from '#src/test-opponents'

import ClubShortcuts from './page'

vi.mock('#src/matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getEditedMatches: () => Promise.resolve(false),
  getMatchSeasons: vi.fn(),
}))
vi.mock('#src/opponents', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getClubPage: vi.fn(),
  getSourcePages: vi.fn(),
}))

const pages: Record<string, ClubPage> = {
  'beker-united': beker,
  'komend-fc': komend,
  'nieuw-promovendus': promovendus,
  testclub,
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-30T13:40:00Z'))
  vi.mocked(getClubPage).mockReset()
  vi.mocked(getClubPage).mockImplementation((slug) => Promise.resolve(pages[slug]))
  vi.mocked(getMatchSeasons).mockReset()
  vi.mocked(getMatchSeasons).mockResolvedValue(matchSeasons)
  vi.mocked(getSourcePages).mockReset()
  vi.mocked(getSourcePages).mockResolvedValue(sourcePages)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const bar = async (slug: string, searchParams: Record<string, string | string[]> = {}) =>
  ClubShortcuts({ params: Promise.resolve({ club: slug }), searchParams: Promise.resolve(searchParams) })

const hrefs = (html: string) => [...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map(([, href]) => href)

/** The links of the bar and the ids of the page of the same club, to compare. */
const compare = async (slug: string, searchParams: Record<string, string> = {}) => {
  const element = await bar(slug, searchParams)
  const page = renderToStaticMarkup(await ClubPageView({ searchParams: Promise.resolve(searchParams), slug }))

  return {
    html: element === null ? '' : renderToStaticMarkup(element),
    ids: new Set([...page.matchAll(/\sid="([^"]*)"/g)].map(([, id]) => id)),
  }
}

describe('the bar of the page of a club', () => {
  it('is a navigation named Op deze pagina:, with a link to each card, in the order of the page', async () => {
    const { html } = await compare('testclub')

    expect(html).toContain('Op deze pagina:')
    expect(hrefs(html)).toEqual([
      '#wedstrijden',
      '#onze-uitslagen',
      '#resultaten-sinds',
      '#hoe-vaak-welke-uitslag',
      '#doelpuntenmakers',
      '#stadion',
    ])
  })

  it.each([
    ['testclub', {}],
    ['testclub', { competitie: 'eredivisie' }],
    ['komend-fc', {}],
    ['nieuw-promovendus', {}],
    ['beker-united', {}],
  ])('has only links to an id that is on the page of %s %j', async (slug, searchParams) => {
    const { html, ids } = await compare(slug, searchParams)

    for (const href of hrefs(html)) {
      expect(ids, `${href} on ${slug}`).toContain(href?.slice(1))
    }
  })

  it('has the card Doelpuntenmakers only with five matches: the bar has no link for a club with fewer', async () => {
    expect(hrefs(renderToStaticMarkup((await bar('beker-united')) ?? <></>))).not.toContain('#doelpuntenmakers')
  })

  it('has the card Doelpuntenmakers with the Eredivisie too, as the page has it', async () => {
    const html = renderToStaticMarkup((await bar('testclub', { competitie: 'eredivisie' })) ?? <></>)

    expect(hrefs(html)).toContain('#doelpuntenmakers')
  })

  it('has only Wedstrijden for a club with a match to come and none played', async () => {
    expect(hrefs(renderToStaticMarkup((await bar('nieuw-promovendus')) ?? <></>))).toEqual(['#wedstrijden'])
  })

  it('has no bar for a slug that no club has, for a choice that is not known and for an unreadable database', async () => {
    expect(await bar('bestaat-niet')).toBeNull()
    expect(await bar('testclub', { competitie: 'onzin' })).toBeNull()

    vi.mocked(getClubPage).mockRejectedValue(new Error('no database'))

    expect(await bar('testclub')).toBeNull()
  })
})
