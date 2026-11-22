import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fansMatchRatings,
  loadRunningRatings,
  type MatchRatings,
  oldMatchRatings,
  type RatedPlayer,
} from '#src/fans/match-ratings'
import { findRatingWindow, type RatingMatch, type RatingWindow } from '#src/fans/rating'
import { getMatchNeighbours } from '#src/match-neighbours'
import { getLeagueResults, getMatchData } from '#src/matches'
import { getClubNews, getClubPage, getSquadPersonIds, getStadiumPlace } from '#src/opponents'
import { getPreviewMatch, getPublicReport } from '#src/report-data'
import { matchData } from '#src/test-matches'
import { reportedMatch } from '#src/test-reports'
import { withoutIcons } from '#src/without-icons'

import MatchPage from './page'

// The card Uitblinker on the page of an old match (issue 1467) and of a new one (issue 1472).

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/fans/match-ratings', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fansMatchRatings: vi.fn(),
  loadRunningRatings: vi.fn(),
  oldMatchRatings: vi.fn(),
}))
vi.mock('#src/fans/rating', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findRatingWindow: vi.fn(),
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

let clock = 0

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

  return { players: [brandsma, ...others], supporters: 31, winner: brandsma, ...overrides }
}

beforeEach(() => {
  // The page reads the window and the count of a match at most once a minute: each test has a
  // minute of its own.
  vi.useFakeTimers({ now: Date.now() + (clock += 120_000), toFake: ['Date'] })
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
  vi.mocked(fansMatchRatings).mockReset()
  vi.mocked(fansMatchRatings).mockResolvedValue(undefined)
  vi.mocked(loadRunningRatings).mockReset()
  vi.mocked(loadRunningRatings).mockResolvedValue([])
  vi.mocked(findRatingWindow).mockReset()
  vi.mocked(findRatingWindow).mockResolvedValue({ state: 'none' })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
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
    vi.mocked(oldMatchRatings).mockResolvedValue({ players: [player(3, 'Speler 3', 8.9, 3)], supporters: 3 })

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

const newMatchOf = (id: number): RatingMatch => ({
  clubSlug: 'testdorp-fc',
  competition: 'Eredivisie',
  dateText: null,
  extraTime: false,
  goalsAgainst: 1,
  goalsFor: 2,
  home: true,
  id,
  kickoffAt: new Date('2026-10-24T18:45:00Z'),
  matchDate: '2026-10-24',
  opponent: 'Testdorp FC',
  round: 'Speelronde 1',
  season: '2026/27',
  status: 'played',
})

const openWindow = (matchId: number): RatingWindow => ({
  closesAt: new Date('2026-11-26T19:00:00Z'),
  match: newMatchOf(matchId),
  players: [],
  startsAt: new Date('2026-10-24T18:45:00Z'),
  state: 'open',
})

describe('the card Uitblinker on the page of a new match', () => {
  beforeEach(() => {
    vi.mocked(getPublicReport).mockResolvedValue(reportedMatch())
  })

  const matchId = reportedMatch().match.id

  it('shows, once the window closed, the seal, the table and the number of supporters, without a source line', async () => {
    vi.mocked(fansMatchRatings).mockResolvedValue(ratings())

    const html = await render()
    const text = plain(html)

    expect(headings(html)).toContain('Uitblinker')
    expect(text).toContain('Van supporters')
    expect(text).toContain('Uitblinker van de wedstrijd')
    expect(html).toMatch(/hf-winner-average">7,8</)
    expect(html).toContain('Cijfers van supporters per speler')
    expect(text).toContain('31 supporters gaven cijfers.')
    expect(text).not.toContain('Cijfers van bezoekers van de Fansite')
    expect(oldMatchRatings).not.toHaveBeenCalled()
  })

  it('says "nog te weinig cijfers" for a player with fewer than five ratings', async () => {
    vi.mocked(fansMatchRatings).mockResolvedValue(ratings())

    const table = (await render()).match(/<table[\s\S]*?<\/table>/g)?.find((found) => found.includes('Speler 3')) ?? ''

    expect(plain(table.slice(table.indexOf('Speler 3')))).toContain('nog te weinig cijfers')
  })

  it('has only the number when fewer than five supporters rated', async () => {
    vi.mocked(fansMatchRatings).mockResolvedValue({ players: [player(3, 'Speler 3', 8.9, 3)], supporters: 3 })

    const html = await render()

    expect(plain(html)).toContain('3 supporters gaven cijfers.')
    expect(html).not.toContain('hf-winner')
    expect(html).not.toContain('Cijfers van supporters per speler')
  })

  it('shows the count, the moment of the result and the way in while the window is open, and no averages', async () => {
    vi.mocked(findRatingWindow).mockResolvedValue(openWindow(matchId))
    vi.mocked(loadRunningRatings).mockResolvedValue([player(1, 'Zeldzame Naam', 8, 31)])

    const html = await render()

    expect(plain(html)).toContain(
      '31 supporters gaven al cijfers. De uitslag staat hier vanaf donderdag 26 november, 20.00 uur.',
    )
    expect(html).toMatch(/<a[^>]*href="\/fans\/uitblinker"[^>]*>Geef je cijfers<\/a>/)
    expect(html).not.toContain('hf-winner')
    expect(html).not.toContain('Zeldzame Naam')
    expect(html).not.toContain('<table')
  })

  it('has no card while the window is open and nobody rated yet', async () => {
    vi.mocked(findRatingWindow).mockResolvedValue(openWindow(matchId))

    expect(headings(await render())).not.toContain('Uitblinker')
  })

  it('has no card while the window is open for another match, or the report is not finished', async () => {
    vi.mocked(findRatingWindow).mockResolvedValue(openWindow(matchId + 1))
    vi.mocked(loadRunningRatings).mockResolvedValue([player(1, 'Tjerk Brandsma', 8, 31)])

    expect(headings(await render())).not.toContain('Uitblinker')
  })

  it('has no card for a match without ratings', async () => {
    expect(headings(await render())).not.toContain('Uitblinker')
  })

  it('has no card, and reads nothing, when the game is off', async () => {
    vi.stubEnv('FANS_UITBLINKER', 'off')
    vi.mocked(fansMatchRatings).mockResolvedValue(ratings())

    expect(headings(await render())).not.toContain('Uitblinker')
    expect(fansMatchRatings).not.toHaveBeenCalled()
    expect(findRatingWindow).not.toHaveBeenCalled()
  })

  it('leaves the card out and keeps the page when the reading fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(fansMatchRatings).mockRejectedValue(new Error('database down'))

    const html = await render()

    expect(headings(html)).not.toContain('Uitblinker')
    expect(headings(html)).toContain('Opstelling')
  })

  it('stands after the line-ups, in the narrow column', async () => {
    vi.mocked(fansMatchRatings).mockResolvedValue(ratings())

    const found = headings(await render())

    expect(found.indexOf('Uitblinker')).toBeGreaterThan(found.indexOf('Verloop'))
    expect(found.filter((heading) => heading === 'Uitblinker')).toHaveLength(1)
  })

  it('has no grade of a person: the card is built from averages and counts only', async () => {
    vi.mocked(fansMatchRatings).mockResolvedValue(ratings())

    // The match page asks for the averages of a match and nothing that names a supporter.
    await render()

    expect(fansMatchRatings).toHaveBeenCalledWith(matchId)
    expect(loadRunningRatings).not.toHaveBeenCalled()
  })
})
