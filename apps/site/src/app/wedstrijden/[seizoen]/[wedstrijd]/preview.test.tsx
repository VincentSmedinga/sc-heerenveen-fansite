import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchNeighbours } from '#src/match-neighbours'
import { getLeagueResults, getMatchData } from '#src/matches'
import { type ClubHeadline, type ClubPage, getClubNews, getClubPage } from '#src/opponents'
import { getPreviewMatch, getPublicReport } from '#src/report-data'
import { matchData } from '#src/test-matches'
import { reportedMatch } from '#src/test-reports'
import { withoutIcons } from '#src/without-icons'

import MatchPage, { generateMetadata } from './page'

vi.mock('#src/matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getEditorSources: vi.fn(() => Promise.resolve([])),
  getLeagueResults: vi.fn(),
  getMatchData: vi.fn(),
}))
vi.mock('#src/match-neighbours', () => ({ getMatchNeighbours: vi.fn() }))
vi.mock('#src/opponents', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getClubNews: vi.fn(),
  getClubPage: vi.fn(),
}))
vi.mock('#src/report-data', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPreviewMatch: vi.fn(),
  getPublicReport: vi.fn(),
}))

// The afternoon of Friday 20 November 2026 in the Netherlands.
const now = new Date('2026-11-20T13:40:00Z')

const params = (seizoen = '2026-27', wedstrijd = '2026-11-21-testdorp-fc') => Promise.resolve({ seizoen, wedstrijd })

const render = async (seizoen?: string, wedstrijd?: string) =>
  withoutIcons(renderToStaticMarkup(await MatchPage({ params: params(seizoen, wedstrijd) })))

const plain = (html: string) =>
  html
    .replaceAll(/<[^>]*>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()

/** An away match of the next day at 20.00 Dutch time, without a report. */
const scheduled = (values: Partial<ReturnType<typeof reportedMatch>['match']> = {}) => ({
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
    status: 'scheduled' as const,
    ...values,
  },
})

const headline = (title: string, day: string): ClubHeadline => ({
  paywalled: false,
  publishedAt: new Date(`${day}T08:00:00Z`),
  sourceName: 'Algemeen Dagblad, ook bij De Gelderlander',
  title,
  url: `https://ad.test/${title.length}`,
})

const leagueResult = { awayClub: '', awayGoals: 0, homeClub: '', homeGoals: 0, playedOn: '2026-10-04', round: 1 }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.stubEnv('SITE_ENV', 'production')
  vi.mocked(getMatchData).mockReset()
  vi.mocked(getMatchData).mockResolvedValue(matchData)
  vi.mocked(getLeagueResults).mockReset()
  vi.mocked(getLeagueResults).mockResolvedValue([
    { ...leagueResult, awayClub: 'Testdorp FC', awayGoals: 0, homeClub: 'Voorbeeld United', homeGoals: 2 },
    { ...leagueResult, awayClub: 'Voorbeeld United', awayGoals: 1, homeClub: 'Testdorp FC', homeGoals: 1, round: 2 },
  ])
  vi.mocked(getPublicReport).mockReset()
  vi.mocked(getPublicReport).mockResolvedValue(undefined)
  vi.mocked(getPreviewMatch).mockReset()
  vi.mocked(getPreviewMatch).mockImplementation((season, slug) =>
    Promise.resolve(season === '2026/27' && slug === '2026-11-21-testdorp-fc' ? scheduled() : undefined),
  )
  vi.mocked(getClubPage).mockReset()
  vi.mocked(getClubPage).mockResolvedValue({} as ClubPage)
  vi.mocked(getClubNews).mockReset()
  vi.mocked(getClubNews).mockResolvedValue([
    headline('Nieuwste kop over Testdorp', '2026-11-19'),
    headline('Oudere kop', '2026-11-10'),
    headline('Derde kop', '2026-11-05'),
    headline('Vierde kop', '2026-10-30'),
  ])
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the Voorbeschouwing of a match that has not begun', () => {
  it('has one h1 with the clubs and an h2 for each card, in the order of a phone', async () => {
    const html = await render()

    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)?.map((heading) => plain(heading))).toEqual([
      'Testdorp FC – sc Heerenveen',
      'Stand',
      'Vorm',
      'Nieuws over Testdorp FC',
    ])
    expect(html.match(/<h1/g)).toHaveLength(1)
  })

  it('shows the pill, the dashes, the day with the kick-off, the stadium and the way back', async () => {
    const text = plain(await render())

    expect(text).toContain('Wedstrijden')
    expect(text).toContain('Voorbeschouwing')
    expect(text).toContain('Nog niet gespeeld: Testdorp FC tegen sc Heerenveen')
    expect(text).toContain('Competitie Eredivisie Ronde Speelronde 13')
    expect(text).toContain('Datum Zaterdag 21 november, 20.00 uur')
    expect(text).toContain('Stadion Stadion Proeflaan')
    expect(text).not.toMatch(/Eindstand|Tussenstand/u)
  })

  it('says "aftrap volgt" for a match without a kick-off, and leaves out an unknown stadium', async () => {
    vi.mocked(getPreviewMatch).mockResolvedValue(scheduled({ kickoffAt: null, stadium: null }))

    const text = plain(await render())

    expect(text).toContain('Datum Zaterdag 21 november, aftrap volgt')
    expect(text).not.toContain('Stadion')
  })

  it('shows at most three headlines with the source and a link to more news about the club', async () => {
    const html = await render()
    const text = plain(html)

    expect(text).toContain('Nieuwste kop over Testdorp')
    expect(text).toContain('Derde kop')
    expect(text).not.toContain('Vierde kop')
    expect(text).toContain('Algemeen Dagblad, ook bij De Gelderlander')
    expect(html).toContain('href="/nieuws/zoeken?q=Testdorp%20FC"')
    expect(text).toContain('Meer nieuws over Testdorp FC')
    // The headline is the link, to the source.
    expect(html).toContain('href="https://ad.test/')
  })

  it('shows the card Stand with both clubs marked and the sentence about the gap', async () => {
    const html = await render()
    const text = plain(html)

    expect(text).toContain('Na speelronde 2')
    expect(text).toContain('Stand, na speelronde 2')
    expect(html.match(/class="hf-data-table-highlight"/g)).toHaveLength(2)
    expect(text).toContain('sc Heerenveen , onze club')
    expect(text).toContain('Testdorp FC , de tegenstander')
    expect(text).toContain('We staan één plek en vijf punten boven Testdorp FC.')
    expect(html).toContain('href="/wedstrijden#stand"')
  })

  it('shows the card Vorm with one line for each club, ours first', async () => {
    const html = await render()
    const text = plain(html)

    expect(text).toContain('De laatste vijf in de competitie, de oudste eerst')
    expect(text).toContain('sc Heerenveen: winst, winst, gelijk 7 punten · doelpunten 7–3')
    expect(text).toContain('Testdorp FC: verlies, gelijk, verlies 1 punt · doelpunten 1–5')
    expect(text.indexOf('sc Heerenveen: winst')).toBeLessThan(text.indexOf('Testdorp FC: verlies'))
  })

  it('leaves out the card Stand for a cup match, and the lines of a club without a league result', async () => {
    vi.mocked(getPreviewMatch).mockResolvedValue(scheduled({ competition: 'KNVB Beker', opponent: 'SV Proefdorp' }))
    vi.mocked(getLeagueResults).mockResolvedValue([])

    const text = plain(await render())

    expect(text).not.toContain('Stand')
    expect(text).not.toContain('Na speelronde')
  })

  it('leaves out the card Vorm when neither club has a league result, but keeps the card Stand', async () => {
    vi.mocked(getLeagueResults).mockResolvedValue([])
    vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [] })

    const text = plain(await render())

    expect(text).toContain('Stand')
    expect(text).not.toContain('Vorm')
  })

  it('leaves out the card Stand without a table for the season', async () => {
    vi.mocked(getMatchData).mockResolvedValue({ ...matchData, standings: [] })

    expect(plain(await render())).not.toContain('Na speelronde')
  })

  it('leaves out the card Nieuws without a headline, with no sentence about it', async () => {
    vi.mocked(getClubNews).mockResolvedValue([])

    const text = plain(await render())

    expect(text).not.toContain('Nieuws over')
    expect(text).not.toContain('Meer nieuws')
  })

  it('has the credit at the end', async () => {
    const text = plain(await render())

    expect(text.indexOf('Wikipedia')).toBeGreaterThan(text.indexOf('Meer nieuws over Testdorp FC'))
  })

  it('names the clubs and the day in the title and no result in the description, and is not indexed', async () => {
    const metadata = await generateMetadata({ params: params() })

    expect(metadata.title).toBe('Voorbeschouwing Testdorp FC – sc Heerenveen, 21 november 2026')
    expect(metadata.description).toBe(
      'De voorbeschouwing van Testdorp FC – sc Heerenveen op 21 november 2026, Eredivisie.',
    )
    expect(metadata.description).not.toMatch(/\d–\d|uitslag/u)
    expect(metadata.robots).toEqual({ index: false })
  })

  it('is "niet gevonden" for a match that has no Voorbeschouwing', async () => {
    await expect(render('2026-27', '2026-11-22-testdorp-fc')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    await expect(render('onzin', '2026-11-21-testdorp-fc')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    expect(await generateMetadata({ params: params('2026-27', '2026-11-22-testdorp-fc') })).toEqual({})
  })

  it('goes to the report when the match has one, whatever its phase', async () => {
    vi.mocked(getPublicReport).mockResolvedValue(reportedMatch())
    vi.mocked(getMatchNeighbours).mockResolvedValue({ next: undefined, previous: undefined })

    expect(plain(await render())).toContain('Eindstand')
    expect(getPreviewMatch).not.toHaveBeenCalled()
  })

  it('shows the page for a server error, and says so in the log, when the database fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(getClubNews).mockRejectedValue(new Error('boem'))

    expect(plain(await render())).toContain('Er ging iets mis')
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Could not read the match preview'))
    expect((await generateMetadata({ params: params() })).robots).toEqual({ index: false })
  })

  it('loads nothing from another domain except the links of the headlines', async () => {
    const html = await render()

    expect(html).not.toMatch(/<(img|script|iframe|link)[^>]*(src|href)="https?:\/\/(?!nl\.wikipedia\.org)/u)
  })
})
