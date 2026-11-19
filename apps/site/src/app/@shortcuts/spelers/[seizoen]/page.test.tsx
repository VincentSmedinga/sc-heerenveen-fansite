import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PlayerPageView } from '#src/app/spelers/player-page'
import { loadPlayerPage, type PlayerPage } from '#src/player-page'
import { loadPlayerSeasonFacts, loadPlayerSeasons, type PlayerSeason } from '#src/player-seasons'
import { getReportAddresses } from '#src/report-data'

import PlayerShortcuts from './page'

vi.mock('#src/player-page', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  loadPlayerPage: vi.fn(),
}))
vi.mock('#src/player-seasons', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  loadPlayerSeasonFacts: vi.fn(),
  loadPlayerSeasons: vi.fn(),
}))
vi.mock('#src/report-data', () => ({ getReportAddresses: vi.fn() }))

const match = {
  competition: 'Eredivisie' as const,
  goalsAgainst: 0,
  goalsFor: 1,
  home: true,
  id: 1,
  matchDate: '2003-10-11',
  opponent: 'Testclub',
  round: '1',
  season: '2003/04',
}

const season = (extra: Partial<PlayerSeason> = {}): PlayerSeason => ({
  assists: 2,
  cleanSheets: undefined,
  conceded: undefined,
  goalMoments: [],
  goals: 5,
  goalsByCompetition: { Eredivisie: 5 },
  lineupMatches: [],
  matchesInSeason: 34,
  played: 30,
  red: 0,
  reportedMatches: 34,
  season: '2003/04',
  shirtNumber: 9,
  source: 'lineups',
  started: 25,
  yellow: 3,
  ...extra,
})

/** Two seasons with everything: five goals with a minute and a match in the line-up. */
const full = [
  season({ goalMoments: [10, 20, 30, 40, 50].map((minute) => ({ match, minute, stoppage: undefined })) }),
  season({ goals: 1, lineupMatches: [match], season: '2004/05' }),
]

const player: PlayerPage = {
  age: 52,
  birthPlace: 'Emmen',
  birthYear: '1974',
  bornLongAgo: false,
  country: 'NL',
  deathYear: undefined,
  edited: false,
  line: 'aanvaller',
  name: 'Jan de Vries',
  nameParts: { givenName: 'Jan', surname: 'de Vries' },
  personId: 7,
  readAt: undefined,
  seasons: ['2003/04'],
  slug: 'jan-de-vries',
  wikipedia: undefined,
}

beforeEach(() => {
  vi.mocked(loadPlayerPage).mockResolvedValue({ kind: 'found', page: player })
  vi.mocked(loadPlayerSeasons).mockResolvedValue(full)
  vi.mocked(loadPlayerSeasonFacts).mockResolvedValue({
    appearances: [],
    assists: [],
    goals: [],
    matchCounts: [],
    players: [],
    tables: [],
  })
  vi.mocked(getReportAddresses).mockResolvedValue(new Map())
})

afterEach(() => {
  vi.mocked(loadPlayerPage).mockReset()
})

const bar = async (slug = 'jan-de-vries', searchParams: Record<string, string> = {}) =>
  PlayerShortcuts({ params: Promise.resolve({ seizoen: slug }), searchParams: Promise.resolve(searchParams) })

const html = async (searchParams: Record<string, string> = {}) => {
  const element = await bar('jan-de-vries', searchParams)

  return element === null ? '' : renderToStaticMarkup(element)
}

const hrefs = (markup: string) => [...markup.matchAll(/<a [^>]*href="([^"]*)"/g)].map(([, href]) => href)

const idsOnPage = async (searchParams: Record<string, string> = {}) =>
  new Set(
    [
      ...renderToStaticMarkup(
        await PlayerPageView({ searchParams: Promise.resolve(searchParams), slug: 'jan-de-vries' }),
      ).matchAll(/\sid="([^"]*)"/g),
    ].map(([, id]) => id),
  )

describe('the bar of the page of a player', () => {
  it('has a link to each card with short labels, in the order of the page, and only to ids on the page', async () => {
    const markup = await html()

    expect(markup).toContain('Op deze pagina:')
    expect(hrefs(markup)).toEqual([
      '#per-seizoen',
      '#loopbaan',
      '#grafiek-per-seizoen',
      '#wanneer-hij-scoort',
      '#uitslagen',
    ])
    expect(markup).toContain('>Per seizoen<')
    expect(markup).toContain('>Loopbaan<')
    expect(markup).toContain('>Doelpunten per seizoen<')
    expect(markup).toContain('>Record<')

    const ids = await idsOnPage()

    for (const href of hrefs(markup)) {
      expect(ids, href).toContain(href?.slice(1))
    }
  })

  it('leaves out the link of a card he has no data for, and links only to ids on the page', async () => {
    vi.mocked(loadPlayerSeasons).mockResolvedValue([season({ goals: 2 })])

    const markup = await html()

    expect(hrefs(markup)).toEqual(['#per-seizoen', '#loopbaan'])

    const ids = await idsOnPage()

    for (const href of hrefs(markup)) {
      expect(ids, href).toContain(href?.slice(1))
    }
  })

  it('has no bar with fewer than two links', async () => {
    vi.mocked(loadPlayerSeasons).mockResolvedValue([])

    expect(await bar()).toBeNull()
  })

  it('keeps a choice of competition on the page, as the page has it', async () => {
    const markup = await html({ competitie: 'eredivisie' })

    expect(hrefs(markup)).toContain('#per-seizoen')
  })

  it('has no bar for a season, a choice that is not known, nobody, a moved address and an error', async () => {
    expect(await bar('2025-26')).toBeNull()
    expect(await bar('jan-de-vries', { competitie: 'onzin' })).toBeNull()

    vi.mocked(loadPlayerPage).mockResolvedValue({ kind: 'unknown' })
    expect(await bar()).toBeNull()

    vi.mocked(loadPlayerPage).mockResolvedValue({ kind: 'moved', slug: 'nieuw' })
    expect(await bar()).toBeNull()

    vi.mocked(loadPlayerPage).mockResolvedValue({ kind: 'error', reason: 'no database' })
    expect(await bar()).toBeNull()
  })

  it('has no bar when the seasons cannot be read', async () => {
    vi.mocked(loadPlayerSeasons).mockRejectedValue(new Error('no database'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(await bar()).toBeNull()
  })
})
