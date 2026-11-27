import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readFjouwerCard } from '#src/FjouwerCrowdCard'
import { getMatchNeighbours } from '#src/match-neighbours'
import { getLeagueResults, getMatchData } from '#src/matches'
import { readNewMatchRatings, readOldMatchRatings } from '#src/MatchRatingsCard'
import { getClubNews, getClubPage, getSquadPersonIds, getStadiumPlace } from '#src/opponents'
import { readOldPredictionCrowd, readPredictionCrowd } from '#src/PredictionCrowdCard'
import { getMatchPages, getPreviewMatch, getPublicReport } from '#src/report-data'
import { matchData } from '#src/test-matches'
import { reportedMatch } from '#src/test-reports'
import { withoutIcons } from '#src/without-icons'

import MatchPage from './page'

// Which blocks the section of the narrow column holds, and the order in the source, which is
// the order on a phone and of the keyboard (issue 1702).

vi.mock('#src/FjouwerCrowdCard', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  readFjouwerCard: vi.fn(),
}))
vi.mock('#src/MatchRatingsCard', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  readNewMatchRatings: vi.fn(),
  readOldMatchRatings: vi.fn(),
}))
vi.mock('#src/PredictionCrowdCard', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  readOldPredictionCrowd: vi.fn(),
  readPredictionCrowd: vi.fn(),
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
  getMatchPages: vi.fn(),
  getPreviewMatch: vi.fn(),
  getPublicReport: vi.fn(),
  getUnknownResultMatch: vi.fn(() => Promise.resolve(undefined)),
}))

const render = async (wedstrijd: string) =>
  withoutIcons(renderToStaticMarkup(await MatchPage({ params: Promise.resolve({ seizoen: '2026-27', wedstrijd }) })))

const report = () => render('2026-10-24-testdorp-fc')
const preview = () => render('2026-11-21-testdorp-fc')

/** The `section` with this name, from its start tag to its end tag, or an empty string. */
const sectionOf = (html: string, name: string) => {
  const start = html.search(new RegExp(`<section[^>]*aria-label="${name}"`, 'u'))

  if (start === -1) {
    return ''
  }

  let depth = 0

  for (const tag of html.slice(start).matchAll(/<(\/?)section\b[^>]*>/gu)) {
    depth += tag[1] === '/' ? -1 : 1

    if (depth === 0) {
      return html.slice(start, start + tag.index + tag[0].length)
    }
  }

  return ''
}

/** The headings of level 2, in the order of the source. */
const headings = (html: string) =>
  [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gu)].map((heading) =>
    heading[1]!
      .replaceAll(/<[^>]*>/g, ' ')
      .replaceAll(/\s+/g, ' ')
      .trim(),
  )

/** Whether every part is there, in this order. */
const expectInOrder = (html: string, parts: readonly string[]) => {
  const places = parts.map((part) => html.indexOf(part))

  expect(places).not.toContain(-1)
  expect(places).toEqual(places.toSorted((a, b) => a - b))
}

const fansName = 'Van de fans en de bron'
const sideName = 'Stand, vorm en prognose'

const prediction = { crowd: { count: 48 }, formOpen: false, reveal: true }
const ratings = { players: [], supporters: 31 }
const fjouwer = { count: 12 }

const scheduled = (values = {}) => ({
  clubSlug: 'testdorp-fc',
  match: {
    ...reportedMatch().match,
    goalsAgainst: null,
    goalsFor: null,
    home: false,
    kickoffAt: new Date('2026-11-21T19:00:00Z'),
    matchDate: '2026-11-21',
    status: 'scheduled' as const,
    ...values,
  },
})

/** An earlier away match against Testdorp FC with a goal of ours: Onderling and schutters. */
const earlier = {
  ...reportedMatch().match,
  competition: 'Eredivisie',
  goals: [{ minute: 5, ours: true, ownGoal: false, penalty: false, personId: null, player: 'Piet Proefman' }],
  goalsAgainst: 0,
  goalsFor: 1,
  home: false,
  matchDate: '2025-02-01',
  opponent: 'Testdorp FC',
  season: '2024/25',
  status: 'played' as const,
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-20T13:40:00Z'))
  vi.stubEnv('SITE_ENV', 'production')
  vi.mocked(getMatchNeighbours).mockResolvedValue({
    next: { club: 'Voorbeeld United', home: false, state: 'zo 1 nov', stateDateTime: '2026-11-01' },
    previous: undefined,
  })
  vi.mocked(getMatchData).mockResolvedValue(matchData)
  vi.mocked(getLeagueResults).mockResolvedValue([
    {
      awayClub: 'Testdorp FC',
      awayGoals: 0,
      homeClub: 'Voorbeeld United',
      homeGoals: 2,
      playedOn: '2026-10-04',
      round: 1,
    },
  ])
  vi.mocked(getClubPage).mockResolvedValue({ matches: [earlier] } as never)
  vi.mocked(getClubNews).mockResolvedValue([
    {
      paywalled: false,
      publishedAt: new Date('2026-11-19T08:00:00Z'),
      sourceName: 'Proefkrant',
      title: 'Kop over Testdorp',
      url: 'https://proefkrant.test/1',
    },
  ])
  vi.mocked(getSquadPersonIds).mockResolvedValue([])
  vi.mocked(getStadiumPlace).mockResolvedValue('Testdorp')
  vi.mocked(getMatchPages).mockResolvedValue(new Map())
  vi.mocked(getPreviewMatch).mockResolvedValue(scheduled())
  vi.mocked(getPublicReport).mockImplementation((_season, slug) =>
    Promise.resolve(slug === '2026-10-24-testdorp-fc' ? reportedMatch() : undefined),
  )
  vi.mocked(readNewMatchRatings).mockResolvedValue({ ratings, state: 'closed' })
  vi.mocked(readOldMatchRatings).mockResolvedValue(ratings)
  vi.mocked(readPredictionCrowd).mockResolvedValue(prediction)
  vi.mocked(readOldPredictionCrowd).mockResolvedValue({ count: 48 })
  vi.mocked(readFjouwerCard).mockResolvedValue(fjouwer)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('the narrow column of the page of a match', () => {
  it('is one section with Uitblinker, Prognose, Fjouwer and the credit, after the previous and next match', async () => {
    const html = await report()
    const section = sectionOf(html, fansName)

    expect(headings(section)).toEqual([
      expect.stringContaining('Uitblinker'),
      expect.stringContaining('Prognose'),
      expect.stringContaining('Fjouwer'),
    ])
    expectInOrder(section, ['Fjouwer', 'Bron: het wedstrijdformulier.', 'hf-wikipedia-credit'])
    expectInOrder(html, [
      '<h1',
      'id="verloop"',
      'aria-label="Vorige en volgende wedstrijd"',
      `aria-label="${fansName}"`,
    ])
    expect(html.endsWith(`${section}</main>`)).toBe(true)
  })

  it('holds the cards of a match of the old Fansite too', async () => {
    const old = reportedMatch()

    vi.mocked(getPublicReport).mockResolvedValue({ ...old, match: { ...old.match, dataSource: 'oude-fansite' } })

    const section = sectionOf(await report(), fansName)

    expect(headings(section)).toEqual([expect.stringContaining('Uitblinker'), expect.stringContaining('Prognose')])
    expect(section).toContain('hf-wikipedia-credit')
  })

  it('holds the credit alone without cards, and one card without the others', async () => {
    vi.mocked(readNewMatchRatings).mockResolvedValue(undefined)
    vi.mocked(readPredictionCrowd).mockResolvedValue(undefined)
    vi.mocked(readFjouwerCard).mockResolvedValue(undefined)

    const bare = sectionOf(await report(), fansName)

    expect(headings(bare)).toEqual([])
    expect(bare).toContain('hf-wikipedia-credit')

    vi.mocked(readFjouwerCard).mockResolvedValue(fjouwer)

    expect(headings(sectionOf(await report(), fansName))).toEqual([expect.stringContaining('Fjouwer')])
  })
})

describe('the narrow column of the Voorbeschouwing', () => {
  it('is one section with Stand, Vorm, Onze schutters and Prognose, before Onderling, Nieuws and the credit', async () => {
    const html = await preview()
    const section = sectionOf(html, sideName)

    expect(headings(section)).toEqual([
      'Stand',
      'Vorm',
      expect.stringContaining('Onze schutters'),
      expect.stringContaining('Prognose'),
    ])
    expect(section).not.toContain('hf-wikipedia-credit')
    expectInOrder(html, [
      '<h1',
      `aria-label="${sideName}"`,
      'id="onderling"',
      'Nieuws over Testdorp FC',
      'aria-label="De bron"',
    ])
    expect(sectionOf(html, 'De bron')).toContain('hf-wikipedia-credit')
  })

  it('holds what there is when cards are missing', async () => {
    vi.mocked(getPreviewMatch).mockResolvedValue(scheduled({ competition: 'KNVB Beker' }))
    vi.mocked(getClubPage).mockResolvedValue({ matches: [] } as never)

    expect(headings(sectionOf(await preview(), sideName))).toEqual(['Vorm', expect.stringContaining('Prognose')])
  })

  it('has no section and no area for it without cards for the narrow column', async () => {
    vi.mocked(getPreviewMatch).mockResolvedValue(scheduled({ competition: 'KNVB Beker' }))
    vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [] })
    vi.mocked(getLeagueResults).mockResolvedValue([])
    vi.mocked(getClubPage).mockResolvedValue({ matches: [] } as never)
    vi.mocked(readPredictionCrowd).mockResolvedValue(undefined)

    const html = await preview()

    expect(html).not.toContain(sideName)
    expect(html).not.toContain('grid-area:side')
    expect(html).not.toContain('&quot;side&quot;')
    expect(html).toContain('Nieuws over Testdorp FC')
  })

  it('has no cell for Onderling and Nieuws without them', async () => {
    vi.mocked(getClubPage).mockResolvedValue(undefined)

    const html = await preview()

    expect(html).not.toContain('headToHead')
    expect(html).not.toContain('news')
    expectInOrder(html, [`aria-label="${sideName}"`, 'aria-label="De bron"'])
  })
})
