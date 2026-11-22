import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type MatchRatings, oldMatchRatings, type RatedPlayer } from '#src/fans/match-ratings'
import { getMatchNeighbours } from '#src/match-neighbours'
import { getLeagueResults, getMatchData } from '#src/matches'
import { getClubNews, getClubPage, getSquadPersonIds, getStadiumPlace } from '#src/opponents'
import { getPreviewMatch, getPublicReport } from '#src/report-data'
import { matchData } from '#src/test-matches'
import { reportedMatch } from '#src/test-reports'
import { withoutIcons } from '#src/without-icons'

import MatchPage from './page'

// The card Uitblinker on the page of an old match (issue 1467).

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/fans/match-ratings', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  oldMatchRatings: vi.fn(),
}))
vi.mock('#src/fans/prediction-crowd', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  matchCrowd: vi.fn(() => Promise.resolve(undefined)),
  oldMatchCrowd: vi.fn(() => Promise.resolve({ count: 40 })),
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

const render = async () =>
  withoutIcons(
    renderToStaticMarkup(
      await MatchPage({ params: Promise.resolve({ seizoen: '2026-27', wedstrijd: '2026-10-24-testdorp-fc' }) }),
    ),
  )

const plain = (html: string) =>
  html
    .replaceAll(/<[^>]*>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()

const headings = (html: string) => html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)?.map((heading) => plain(heading)) ?? []

const player = (id: number, name: string, average: number, count: number): RatedPlayer => ({
  appearanceId: id,
  average,
  count,
  name,
  playerId: id,
})

const ratings = (overrides: Partial<MatchRatings> = {}): MatchRatings => {
  const brandsma = player(1, 'Tjerk Brandsma', 7.8, 31)
  const others = [player(2, 'Speler 2', 6.4, 29), player(3, 'Speler 3', 8.9, 3)]

  return { players: [brandsma, ...others], winner: brandsma, ...overrides }
}

beforeEach(() => {
  vi.stubEnv('SITE_ENV', 'production')
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_UITBLINKER', 'on')
  vi.stubEnv('FANS_PROGNOSE', 'on')
  vi.mocked(getMatchNeighbours).mockResolvedValue({ next: undefined, previous: undefined })
  vi.mocked(getMatchData).mockResolvedValue(matchData)
  vi.mocked(getLeagueResults).mockResolvedValue([])
  vi.mocked(getClubPage).mockResolvedValue({ matches: [] } as never)
  vi.mocked(getClubNews).mockResolvedValue([])
  vi.mocked(getSquadPersonIds).mockResolvedValue([])
  vi.mocked(getStadiumPlace).mockResolvedValue('Testdorp')
  vi.mocked(getPreviewMatch).mockResolvedValue(undefined)
  vi.mocked(getPublicReport).mockImplementation((season, slug) => {
    const reported = reportedMatch()

    return Promise.resolve(
      season === '2026/27' && slug === '2026-10-24-testdorp-fc'
        ? { ...reported, match: { ...reported.match, dataSource: 'oude-fansite' as const } }
        : undefined,
    )
  })
  vi.mocked(oldMatchRatings).mockReset()
  vi.mocked(oldMatchRatings).mockResolvedValue(ratings())
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('the card Uitblinker on the page of an old match', () => {
  it('shows the seal with the average, the name and the count, and the source line', async () => {
    const html = await render()
    const text = plain(html)

    expect(headings(html)).toContain('Uitblinker')
    expect(text).toContain('Van supporters')
    expect(text).toContain('Uitblinker van de wedstrijd')
    expect(text).toContain('Gemiddelde van 31 cijfers')
    expect(html).toMatch(/hf-winner-average">7,8</)
    expect(text).toContain('Cijfers van bezoekers van de Fansite, 2001 tot 2007.')
  })

  it('has a real table with a caption, header cells and the columns Speler, Gem and Cijfers', async () => {
    const html = await render()
    const table = html.match(/<table[\s\S]*?<\/table>/g)?.find((found) => found.includes('Gem')) ?? ''

    expect(table).toContain('<caption')
    expect(table).toContain('Cijfers van supporters per speler')
    expect(table).toMatch(/<th[^>]*scope="col"/)
    expect(plain(table)).toContain('Speler')
    expect(plain(table)).toContain('Cijfers')
    expect(table.indexOf('Tjerk')).toBeLessThan(table.indexOf('Speler 2'))
  })

  it('marks the Uitblinker in words in his row, and only his', async () => {
    const html = await render()
    const table = html.match(/<table[\s\S]*?<\/table>/g)?.find((found) => found.includes('Brandsma')) ?? ''

    expect(table.match(/>Uitblinker</g)).toHaveLength(1)
    expect(table.indexOf('>Uitblinker<')).toBeLessThan(table.indexOf('Speler 2'))
  })

  it('says "nog te weinig cijfers" for a player under five ratings, without an average', async () => {
    const table = (await render()).match(/<table[\s\S]*?<\/table>/g)?.find((found) => found.includes('Speler 3')) ?? ''
    const row = table.slice(table.indexOf('Speler 3'))

    expect(plain(row)).toContain('nog te weinig cijfers')
    expect(plain(row)).not.toContain('8,9')
  })

  it('has no seal when nobody has five ratings, only the table', async () => {
    vi.mocked(oldMatchRatings).mockResolvedValue({ players: [player(3, 'Speler 3', 8.9, 3)] })

    const html = await render()

    expect(html).not.toContain('hf-winner')
    expect(headings(html)).toContain('Uitblinker')
    expect(plain(html)).toContain('nog te weinig cijfers')
  })

  it('has no card for a match without ratings', async () => {
    vi.mocked(oldMatchRatings).mockResolvedValue(undefined)

    expect(headings(await render())).not.toContain('Uitblinker')
  })

  it('has no card, and asks for no ratings, when the game is off', async () => {
    vi.stubEnv('FANS_UITBLINKER', 'off')

    expect(headings(await render())).not.toContain('Uitblinker')
    expect(oldMatchRatings).not.toHaveBeenCalled()
  })

  it('leaves the card out and keeps the page when the reading fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(oldMatchRatings).mockRejectedValue(new Error('database down'))

    const html = await render()

    expect(headings(html)).not.toContain('Uitblinker')
    expect(headings(html)).toContain('Opstelling')
  })

  it('stands after the line-ups and before the card Prognose and the credit', async () => {
    const found = headings(await render())

    expect(found.indexOf('Uitblinker')).toBeGreaterThan(found.indexOf('Verloop'))
    expect(found.indexOf('Uitblinker')).toBeLessThan(found.indexOf('Prognose'))
    expect(found.filter((heading) => heading === 'Uitblinker')).toHaveLength(1)
  })

  it('is not on the page of a match of today, which has no old ratings', async () => {
    vi.mocked(getPublicReport).mockResolvedValue(reportedMatch())

    expect(headings(await render())).not.toContain('Uitblinker')
    expect(oldMatchRatings).not.toHaveBeenCalled()
  })
})
