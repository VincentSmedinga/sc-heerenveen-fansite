import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ClubListPage } from '#src/app/tegenstanders/opponents-pages'
import { getEditedMatches, getMatchSeasons, getMatchSource } from '#src/matches'
import { getClubRecords, getLastWinPlaces, getSourcePages } from '#src/opponents'
import { allRecords, cupRecords, leagueRecords, matchSeasons, sourcePages } from '#src/test-opponents'

import OpponentsShortcuts from './page'

vi.mock('#src/matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getEditedMatches: vi.fn(),
  getMatchSeasons: vi.fn(),
  getMatchSource: vi.fn(),
}))
vi.mock('#src/opponents', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getClubRecords: vi.fn(),
  getLastWinPlaces: vi.fn(),
  getSourcePages: vi.fn(),
}))

const lastWins = { all: [], away: [], home: [] }

beforeEach(() => {
  vi.mocked(getClubRecords).mockReset()
  vi.mocked(getClubRecords).mockImplementation((choice) =>
    Promise.resolve({ all: allRecords, cup: cupRecords, europe: [], league: leagueRecords, playoffs: [] }[choice]),
  )
  vi.mocked(getLastWinPlaces).mockReset()
  vi.mocked(getLastWinPlaces).mockResolvedValue(lastWins)
  vi.mocked(getEditedMatches).mockResolvedValue(false)
  vi.mocked(getMatchSeasons).mockResolvedValue(matchSeasons)
  vi.mocked(getMatchSource).mockResolvedValue('wikipedia')
  vi.mocked(getSourcePages).mockResolvedValue(sourcePages)
})

const bar = async (searchParams: Record<string, string> = {}) =>
  OpponentsShortcuts({ searchParams: Promise.resolve(searchParams) })

const hrefs = (html: string) => [...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map(([, href]) => href)

describe('the bar of the page Tegenstanders', () => {
  it('has four links, in the order of the cards, and only to ids on the page', async () => {
    const html = renderToStaticMarkup((await bar()) ?? <></>)
    const page = renderToStaticMarkup(await ClubListPage({ searchParams: Promise.resolve({}) }))
    const ids = new Set([...page.matchAll(/\sid="([^"]*)"/g)].map(([, id]) => id))

    expect(html).toContain('Op deze pagina:')
    expect(hrefs(html)).toEqual(['#alle-tegenstanders', '#het-makkelijkst', '#het-moeilijkst', '#laatste-overwinning'])

    for (const href of hrefs(html)) {
      expect(ids, href).toContain(href?.slice(1))
    }
  })

  it('has no link to Laatste overwinning when the page has no such card', async () => {
    vi.mocked(getLastWinPlaces).mockResolvedValue(undefined)

    expect(hrefs(renderToStaticMarkup((await bar()) ?? <></>))).toEqual([
      '#alle-tegenstanders',
      '#het-makkelijkst',
      '#het-moeilijkst',
    ])
  })

  it('has no bar for a choice that is not known or an unreadable database', async () => {
    expect(await bar({ competitie: 'onzin' })).toBeNull()

    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(getClubRecords).mockRejectedValue(new Error('no database'))

    expect(await bar()).toBeNull()
  })
})
