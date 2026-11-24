import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchNeighbours } from '#src/match-neighbours'
import { getMatchData } from '#src/matches'
import { getPreviewMatch, getPublicReport, getUnknownResultMatch } from '#src/report-data'
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
vi.mock('#src/report-data', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPreviewMatch: vi.fn(),
  getPublicReport: vi.fn(),
  getUnknownResultMatch: vi.fn(),
}))

const params = (wedstrijd = '1992-03-08-testdorp-fc') => Promise.resolve({ seizoen: '1991-92', wedstrijd })

/** A match of 1992 that was played, with no known result. */
const unknown = {
  clubSlug: 'testdorp-fc',
  match: {
    ...reportedMatch().match,
    attendance: null,
    goalsAgainst: null,
    goalsFor: null,
    home: true,
    kickoffAt: null,
    matchDate: '1992-03-08',
    opponent: 'Testdorp FC',
    referee: null,
    round: 'Speelronde 27',
    season: '1991/92',
    status: 'result_unknown' as const,
  },
}

const plain = (html: string) =>
  html
    .replaceAll(/<[^>]*>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()

beforeEach(() => {
  vi.stubEnv('SITE_ENV', 'production')
  vi.mocked(getMatchData).mockReset()
  vi.mocked(getMatchData).mockResolvedValue(matchData)
  vi.mocked(getPublicReport).mockReset()
  vi.mocked(getPublicReport).mockResolvedValue(undefined)
  vi.mocked(getPreviewMatch).mockReset()
  vi.mocked(getPreviewMatch).mockResolvedValue(undefined)
  vi.mocked(getMatchNeighbours).mockReset()
  vi.mocked(getMatchNeighbours).mockResolvedValue({ next: undefined, previous: undefined })
  vi.mocked(getUnknownResultMatch).mockReset()
  vi.mocked(getUnknownResultMatch).mockImplementation((season, slug) =>
    Promise.resolve(season === '1991/92' && slug === '1992-03-08-testdorp-fc' ? unknown : undefined),
  )
})

describe('the page of a match without a result (#1622)', () => {
  it('says "Uitslag onbekend" with the clubs and the day, and no score, goals or line-up', async () => {
    const html = withoutIcons(renderToStaticMarkup(await MatchPage({ params: params() })))
    const text = plain(html)

    expect(text).toContain('Uitslag onbekend')
    expect(text).toContain('sc Heerenveen')
    expect(text).toContain('Testdorp FC')
    expect(text).toContain('8 maart 1992')
    expect(text).toContain('Speelronde 27')
    expect(text).not.toMatch(/\d–\d|Eindstand|Ruststand|Opstelling/u)
  })

  it('is not indexed, and says the result is unknown in its title', async () => {
    const metadata = await generateMetadata({ params: params() })

    expect(metadata.robots).toEqual({ index: false })
    expect(String(metadata.title)).toContain('uitslag onbekend')
  })

  it('is "niet gevonden" for another day', async () => {
    await expect(MatchPage({ params: params('1992-03-09-testdorp-fc') })).rejects.toThrow()
  })
})
