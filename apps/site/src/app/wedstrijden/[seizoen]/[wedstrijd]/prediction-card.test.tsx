import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { predictionMatches } from '#src/fans/prediction'
import { type MatchCrowd, matchCrowd } from '#src/fans/prediction-crowd'
import { getMatchNeighbours } from '#src/match-neighbours'
import { getLeagueResults, getMatchData } from '#src/matches'
import { getClubNews, getClubPage, getSquadPersonIds, getStadiumPlace } from '#src/opponents'
import { getPreviewMatch, getPublicReport } from '#src/report-data'
import { matchData } from '#src/test-matches'
import { reportedMatch } from '#src/test-reports'
import { withoutIcons } from '#src/without-icons'

import MatchPage from './page'

// The card Prognose on the page of a match (issue 1453), on the report and on the preview.

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/fans/prediction-crowd', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  matchCrowd: vi.fn(),
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

const spread = {
  actual: { outcome: 'win', score: '2–1' },
  draws: 13,
  losses: 8,
  other: 4,
  scores: [
    { count: 14, label: '2–1' },
    { count: 6, label: '1–0' },
  ],
  wins: 33,
} as const

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.stubEnv('SITE_ENV', 'production')
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_PROGNOSE', 'on')
  vi.mocked(getMatchNeighbours).mockResolvedValue({ next: undefined, previous: undefined })
  vi.mocked(getMatchData).mockResolvedValue(matchData)
  vi.mocked(getLeagueResults).mockResolvedValue([])
  vi.mocked(getClubPage).mockResolvedValue({ matches: [] } as never)
  vi.mocked(getClubNews).mockResolvedValue([])
  vi.mocked(getSquadPersonIds).mockResolvedValue([])
  vi.mocked(getStadiumPlace).mockResolvedValue('Testdorp')
  vi.mocked(getPublicReport).mockResolvedValue(undefined)
  vi.mocked(getPreviewMatch).mockResolvedValue(preview())
  vi.mocked(predictionMatches).mockResolvedValue({ next: { id: 1 } } as never)
  vi.mocked(matchCrowd).mockReset()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('the card Prognose on the Voorbeschouwing', () => {
  it('says how many predicted and not what, with the link while the form of this match is open', async () => {
    vi.mocked(matchCrowd).mockResolvedValue({ count: 48 })
    vi.mocked(getPreviewMatch).mockResolvedValue(preview({ id: 1 }))

    const html = await render()
    const text = plain(html)

    expect(headings(html)).toContain('Prognose')
    expect(text).toContain('Van supporters')
    expect(text).toContain('48 supporters voorspelden deze wedstrijd. Wat ze voorspelden, zie je bij de aftrap.')
    expect(html).toMatch(/<a[^>]*href="\/fans\/prognose"[^>]*>Voorspel ook<\/a>/)
    expect(matchCrowd).toHaveBeenCalledWith(1, false)
    expect(html).not.toContain('hf-outcome-bar')
  })

  it('has no link when the form is for another match, a match further away', async () => {
    vi.mocked(matchCrowd).mockResolvedValue({ count: 1 })
    vi.mocked(getPreviewMatch).mockResolvedValue(preview({ id: 2 }))

    const text = plain(await render())

    expect(text).toContain('1 supporter voorspelde deze wedstrijd.')
    expect(text).not.toContain('Voorspel ook')
  })

  it('has no card and asks nothing when the game is off', async () => {
    vi.stubEnv('FANS_PROGNOSE', 'off')

    const html = await render()

    expect(headings(html)).not.toContain('Prognose')
    expect(matchCrowd).not.toHaveBeenCalled()
    expect(predictionMatches).not.toHaveBeenCalled()
  })

  it('has no card for a match nobody predicted', async () => {
    vi.mocked(matchCrowd).mockResolvedValue(undefined)

    expect(headings(await render())).not.toContain('Prognose')
  })

  it('keeps the page when the figures cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(matchCrowd).mockRejectedValue(new Error('down'))

    const html = await render()

    expect(headings(html)).not.toContain('Prognose')
    expect(headings(html)?.[0]).toBe('Testdorp FC – sc Heerenveen')
  })

  it('has no link once the match has begun, and the figures with the h3 under the h2', async () => {
    vi.setSystemTime(new Date('2026-11-21T19:30:00Z'))
    vi.mocked(matchCrowd).mockResolvedValue({ count: 54, spread: { ...spread, actual: undefined } } as MatchCrowd)

    const html = await render()
    const text = plain(html)

    expect(matchCrowd).toHaveBeenCalledWith(expect.any(Number), true)
    expect(text).toContain('Winst 33 · Gelijk 13 · Verlies 8')
    expect(html).toMatch(/<h3[^>]*>Meest voorspelde eindstanden<\/h3>/)
    expect(text).not.toContain('Voorspel ook')
  })
})

describe('the card Prognose on the page of a match with a report', () => {
  const played = () => reportedMatch()
  const crowd: MatchCrowd = {
    after: { average: '1,9–0,8', exact: 14, outcome: 38 },
    count: 54,
    spread,
  }

  beforeEach(() => {
    vi.mocked(getPublicReport).mockImplementation((season, slug) =>
      Promise.resolve(season === '2026/27' && slug === '2026-10-24-testdorp-fc' ? played() : undefined),
    )
    vi.mocked(matchCrowd).mockResolvedValue(crowd)
  })

  it('shows the figures after the match, the outcome marked in words and the link to the ranking', async () => {
    const html = await render('2026-27', '2026-10-24-testdorp-fc')
    const text = plain(html)

    expect(text).toContain('1,9–0,8 gemiddeld voorspeld')
    expect(text).toContain('14 precies goed , 26 procent')
    expect(text).toContain('38 goede uitslag , 70 procent')
    expect(text).toContain('Winst 33 (uitslag) · Gelijk 13 · Verlies 8')
    expect(text).toContain('2–1 (uitslag)')
    expect(text).toContain('anders')
    expect(html).toMatch(/<a[^>]*href="\/fans\/prognose\/stand\?wedstrijd=\d+"[^>]*>Stand Prognose<\/a>/)
    expect(headings(html)).toContain('Prognose')
  })

  it('stands after the line-ups and before the credit, and has the h2 under the h1', async () => {
    const found = headings(await render('2026-27', '2026-10-24-testdorp-fc')) ?? []

    expect(found.indexOf('Prognose')).toBeGreaterThan(found.indexOf('Verloop'))
    expect(found.filter((heading) => heading === 'Prognose')).toHaveLength(1)
  })

  it('shows only the count under five predictions, without the link to the ranking', async () => {
    vi.mocked(matchCrowd).mockResolvedValue({ count: 4 })

    const html = await render('2026-27', '2026-10-24-testdorp-fc')

    expect(plain(html)).toContain('4 supporters voorspelden deze wedstrijd.')
    expect(html).not.toContain('Stand Prognose')
    expect(html).not.toContain('hf-outcome-bar')
  })

  it('has no card when the game is off', async () => {
    vi.stubEnv('FANS_PROGNOSE', 'off')

    expect(headings(await render('2026-27', '2026-10-24-testdorp-fc'))).not.toContain('Prognose')
    expect(matchCrowd).not.toHaveBeenCalled()
  })
})
