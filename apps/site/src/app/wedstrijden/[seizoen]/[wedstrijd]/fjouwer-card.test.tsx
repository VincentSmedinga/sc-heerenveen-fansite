import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fjouwerCrowd } from '#src/fans/fjouwer-crowd'
import { predictionMatches } from '#src/fans/prediction'
import { matchCrowd, oldMatchCrowd } from '#src/fans/prediction-crowd'
import { getMatchNeighbours } from '#src/match-neighbours'
import { getLeagueResults, getMatchData } from '#src/matches'
import { getClubNews, getClubPage, getSquadPersonIds, getStadiumPlace } from '#src/opponents'
import { getPreviewMatch, getPublicReport } from '#src/report-data'
import { matchData } from '#src/test-matches'
import { reportedMatch } from '#src/test-reports'
import { withoutIcons } from '#src/without-icons'

import MatchPage from './page'

// The card Fjouwer on the page of a match (issue 1475): from the kick-off, never before it.

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/fans/fjouwer-crowd', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fjouwerCrowd: vi.fn(),
}))
vi.mock('#src/fans/prediction-crowd', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  matchCrowd: vi.fn(),
  oldMatchCrowd: vi.fn(),
}))
vi.mock('#src/fans/prediction', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  predictionMatches: vi.fn(),
}))
vi.mock('#src/match-neighbours', () => ({ getMatchNeighbours: vi.fn() }))
vi.mock('#src/matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getEditorSources: vi.fn(() => Promise.resolve([])),
  getLeagueResults: vi.fn(),
  getMatchData: vi.fn(),
}))
vi.mock('#src/opponents', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getClubNews: vi.fn(),
  getClubPage: vi.fn(),
  getSquadPersonIds: vi.fn(),
  getStadiumPlace: vi.fn(),
}))
vi.mock('#src/report-data', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPreviewMatch: vi.fn(),
  getPublicReport: vi.fn(),
}))

// The afternoon of Friday 20 November 2026, the day before the match of the preview.
const now = new Date('2026-11-20T13:40:00Z')

const render = async (seizoen = '2026-27', wedstrijd = '2026-11-21-testdorp-fc') =>
  withoutIcons(renderToStaticMarkup(await MatchPage({ params: Promise.resolve({ seizoen, wedstrijd }) })))

const plain = (html: string) =>
  html
    .replaceAll(/<[^>]*>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()

const headings = (html: string) => html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)?.map((heading) => plain(heading))

const preview = (values = {}) => ({
  clubSlug: 'testdorp-fc',
  match: {
    ...reportedMatch().match,
    attendance: null,
    goalsAgainst: null,
    goalsFor: null,
    home: false,
    kickoffAt: new Date('2026-11-21T19:00:00Z'),
    matchDate: '2026-11-21',
    referee: null,
    round: 'Speelronde 13',
    stadiumId: 7,
    status: 'scheduled' as const,
    ...values,
  },
})

const crowd = {
  count: 87,
  players: [
    { name: 'Vente', percentage: 71 },
    { name: 'Noppert', percentage: 44 },
    { name: 'Proper', percentage: 39 },
  ],
}

const played = () => reportedMatch()

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.stubEnv('SITE_ENV', 'production')
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_PROGNOSE', 'on')
  vi.stubEnv('FANS_UITBLINKER', 'on')
  vi.stubEnv('FANS_VIER', 'on')
  vi.mocked(getMatchNeighbours).mockResolvedValue({ next: undefined, previous: undefined })
  vi.mocked(getMatchData).mockResolvedValue(matchData)
  vi.mocked(getLeagueResults).mockResolvedValue([])
  vi.mocked(getClubPage).mockResolvedValue({ matches: [] } as never)
  vi.mocked(getClubNews).mockResolvedValue([])
  vi.mocked(getSquadPersonIds).mockResolvedValue([])
  vi.mocked(getStadiumPlace).mockResolvedValue('Testdorp')
  vi.mocked(getPreviewMatch).mockResolvedValue(preview())
  vi.mocked(getPublicReport).mockImplementation((season, slug) =>
    Promise.resolve(season === '2026/27' && slug === '2026-10-24-testdorp-fc' ? played() : undefined),
  )
  vi.mocked(predictionMatches).mockResolvedValue({ next: { id: 1 } } as never)
  vi.mocked(matchCrowd).mockReset().mockResolvedValue(undefined)
  vi.mocked(oldMatchCrowd).mockReset()
  vi.mocked(fjouwerCrowd).mockReset().mockResolvedValue(crowd)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

const report = () => render('2026-27', '2026-10-24-testdorp-fc')

describe('the card Fjouwer on the page of a match', () => {
  it('shows the most chosen players with their share, and how many fans chose, from the kick-off', async () => {
    const html = await report()
    const text = plain(html)

    expect(headings(html)).toContain('Fjouwer')
    expect(headings(html)).toContain('Het vaakst gekozen')
    expect(text).toContain('Van de fans')
    expect(text).toMatch(/Vente\s*71%\s*Noppert\s*44%\s*Proper\s*39%/)
    expect(text).toContain('87 fans kozen hun vier.')
    expect(html).toContain('hf-card-game-fjouwer')
    expect(fjouwerCrowd).toHaveBeenCalledWith(expect.any(Number))
  })

  it('has no card and reads nothing before the kick-off, not even a count', async () => {
    const html = await render()

    expect(headings(html)).not.toContain('Fjouwer')
    expect(plain(html)).not.toContain('kozen hun vier')
    expect(fjouwerCrowd).not.toHaveBeenCalled()
  })

  it('shows only the count and a sentence under five fans', async () => {
    vi.mocked(fjouwerCrowd).mockResolvedValue({ count: 4 })

    const html = await report()

    expect(plain(html)).toContain('4 fans kozen hun vier. Er deden te weinig fans mee om de keuzes te laten zien.')
    expect(html).not.toContain('hf-bar-list')
  })

  it('has no card for a match without a four', async () => {
    vi.mocked(fjouwerCrowd).mockResolvedValue(undefined)

    expect(headings(await report())).not.toContain('Fjouwer')
  })

  it('has no card, and reads nothing, when the game is off', async () => {
    vi.stubEnv('FANS_VIER', 'off')

    expect(headings(await report())).not.toContain('Fjouwer')
    expect(fjouwerCrowd).not.toHaveBeenCalled()
  })

  it('has no card of a game when every part of Fans is off', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'off')

    const found = headings(await report()) ?? []

    expect(found).not.toContain('Fjouwer')
    expect(found).not.toContain('Prognose')
    expect(fjouwerCrowd).not.toHaveBeenCalled()
  })

  it('stands after Prognose and before the credit, and keeps the page when the figures cannot be read', async () => {
    vi.mocked(matchCrowd).mockResolvedValue({ count: 54 })

    const found = headings(await report()) ?? []

    expect(found.indexOf('Fjouwer')).toBeGreaterThan(found.indexOf('Prognose'))
    expect(found.filter((heading) => heading === 'Fjouwer')).toHaveLength(1)

    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(fjouwerCrowd).mockRejectedValue(new Error('database away'))

    const html = await report()

    expect(headings(html)).not.toContain('Fjouwer')
    expect(headings(html)).toContain('Verloop')
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('what supporters chose for match'))
  })
})
