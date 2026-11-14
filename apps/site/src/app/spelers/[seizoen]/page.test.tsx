import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAllTimeMatches, getMatchData, getMatchSeasons } from '#src/matches'
import { getSeasonReportFigures } from '#src/season-report-figures'
import { getSeasonSquad } from '#src/season-squad'
import { matchData } from '#src/test-matches'
import { noReports } from '#src/test-report-figures'
import { squadData } from '#src/test-squad'
import { withoutIcons } from '#src/without-icons'

import SeasonPlayersPage, { generateMetadata } from './page'

// Only the queries are replaced: the page of a season is the real one.
vi.mock('#src/matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getAllTimeMatches: vi.fn(),
  getMatchData: vi.fn(),
  getMatchSeasons: vi.fn(),
}))

// The figures of the match reports are made up too, and by default there are none.
vi.mock('#src/season-report-figures', () => ({ getSeasonReportFigures: vi.fn(), seasonHasReports: vi.fn() }))

// The squad is made up too: the page reads it from the database.
vi.mock('#src/season-squad', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSeasonSquad: vi.fn(),
}))

// A name of nobody: the page of a player (#1079) has tests of its own, in player-page.test.tsx.
vi.mock('#src/player-page', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  loadPlayerPage: vi.fn(async () => ({ kind: 'unknown' })),
}))

// The afternoon of Friday 23 October 2026 in the Netherlands, in the season 2026/27.
const now = new Date('2026-10-23T13:40:00Z')

// An earlier season, with one scorer.
const goal = matchData.matches.flatMap((match) => match.goals).find((item) => item.ours)!
const earlierMatch = { ...matchData.matches[0]!, goals: [goal], matchDate: '2025-09-20', opponent: 'Vorig Seizoen FC' }
const earlier = { ...matchData, matches: [earlierMatch], season: '2025/26' }

const params = (seizoen: string) => ({ params: Promise.resolve({ seizoen }), searchParams: Promise.resolve({}) })

const render = async (seizoen = '2025-26') =>
  withoutIcons(renderToStaticMarkup(await SeasonPlayersPage(params(seizoen))))

/** The digest of the error that `notFound()` and `redirect()` throw, which Next.js answers. */
const digestOf = async (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    (error: unknown) => (error as { digest?: string }).digest,
  )

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.stubEnv('SITE_ENV', 'production')
  vi.mocked(getAllTimeMatches).mockReset()
  vi.mocked(getAllTimeMatches).mockResolvedValue([])
  vi.mocked(getMatchData).mockReset()
  vi.mocked(getMatchSeasons).mockReset()
  vi.mocked(getSeasonReportFigures).mockReset()
  vi.mocked(getSeasonReportFigures).mockResolvedValue(noReports)
  vi.mocked(getSeasonSquad).mockReset()
  vi.mocked(getSeasonSquad).mockResolvedValue(squadData)
  vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27', '2025/26', '2024/25'])
  vi.mocked(getMatchData).mockImplementation((season) =>
    Promise.resolve(season === '2025/26' ? earlier : { ...matchData, season: season ?? '2026/27' }),
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the page of an earlier season, /spelers/2025-26', () => {
  it('asks for the data of that season and of no other, after finding it among the seasons with matches', async () => {
    await render()

    expect(getMatchData).toHaveBeenCalledExactlyOnceWith('2025/26')
  })

  it('has the heading Spelers, without the season, the card Selectie, and the link to the figures of that season', async () => {
    const html = await render()

    expect(html).toContain('<h1 class="hf-heading-1">Spelers</h1>')
    expect(html).not.toContain('Spelers 2025/26</h1>')
    expect(html).toContain('id="selectie"')
    expect(html).toContain('href="/spelers/cijfers/2025-26"')
    expect(html).not.toContain('<table')
  })

  describe('the picker', () => {
    it('is in the toolbar after the heading, with the route of Spelers, and has the season of the page chosen', async () => {
      const html = await render()
      const options = [...html.matchAll(/<option value="([^"]+)"( selected="")?>([^<]+)<\/option>/g)].map(
        ([, value, selected, label]) => [value, label, selected !== undefined],
      )

      expect(html).toMatch(
        /<h1 class="hf-heading-1">Spelers<\/h1><\/div><div class="hf-page-toolbar"[^>]*><form [^>]*aria-label="Seizoen kiezen"/,
      )
      expect(html).toContain('action="/spelers/kies"')
      expect(options).toEqual([
        ['2026-27', '2026/27', false],
        ['2025-26', '2025/26', true],
        ['2024-25', '2024/25', false],
      ])
    })
  })

  describe('an address that is no page', () => {
    it.each(['2025-27', '2025-2026', '2025/26', 'seizoen', '25-26', '2025-26x', 'kies2'])(
      'is "niet gevonden" for %s, without asking for data of a season or a player of that name',
      async (seizoen) => {
        expect(await digestOf(render(seizoen))).toContain('404')
        expect(getMatchData).not.toHaveBeenCalled()
      },
    )

    it('is "niet gevonden" for a season that has no matches in the database, without asking for its data', async () => {
      expect(await digestOf(render('2010-11'))).toContain('404')
      expect(getMatchData).not.toHaveBeenCalled()
    })

    it('is "niet gevonden" for a season that has not begun, which getMatchSeasons leaves out', async () => {
      expect(await digestOf(render('2027-28'))).toContain('404')
      expect(getMatchData).not.toHaveBeenCalled()
    })

    it('sends the current season to /spelers, for a season to have one address', async () => {
      const digest = await digestOf(render('2026-27'))

      expect(digest).toContain('NEXT_REDIRECT')
      expect(digest).toContain('/spelers;')
      expect(digest).not.toContain('308')
      expect(getMatchData).not.toHaveBeenCalled()
    })
  })

  it('shows the error page, in the HTML, when the database cannot be read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(getMatchSeasons).mockRejectedValue(new Error('connect ECONNREFUSED'))

    const html = await render()

    expect(html).toContain('Er ging iets mis')
    expect(html).toContain('href="/spelers/2025-26"')
    expect(error).toHaveBeenCalledOnce()
  })
})

describe('the title, description and canonical address of a season of Spelers', () => {
  const metadataOf = (seizoen: string) => generateMetadata({ params: Promise.resolve({ seizoen }) })

  it('names the season in the title, which the heading does not, and has the address of the season as the canonical address', async () => {
    const metadata = await metadataOf('2025-26')

    expect(metadata.title).toBe('Spelers 2025/26')
    expect(metadata.alternates?.canonical).toBe('https://sc.heerenveen.org/spelers/2025-26')
    expect(metadata.openGraph?.url).toBe('https://sc.heerenveen.org/spelers/2025-26')
    expect(metadata.description).toContain('2025/26')
    expect(metadata.description).not.toContain('dit seizoen')
  })

  it('is noindex on the error page, as /spelers is', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(getMatchSeasons).mockRejectedValue(new Error('down'))

    expect(await metadataOf('2025-26')).toEqual({ robots: { index: false }, title: 'Er ging iets mis' })
  })
})
