import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchData, getMatchSeasons } from '#src/matches'
import { seasonHasReports } from '#src/season-report-figures'
import { playersShortcuts, playersShortcutsFor } from '#src/statisticsShortcuts'
import { matchData } from '#src/test-matches'

import SeasonPlayersShortcuts from './page'

vi.mock('#src/matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMatchData: vi.fn(),
  getMatchSeasons: vi.fn(),
}))

// Whether the season has reports is made up too: it is read from the database.
vi.mock('#src/season-report-figures', () => ({ seasonHasReports: vi.fn() }))

beforeEach(() => {
  vi.mocked(seasonHasReports).mockReset()
  vi.mocked(seasonHasReports).mockResolvedValue(false)
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-23T13:40:00Z'))
  vi.mocked(getMatchData).mockReset()
  vi.mocked(getMatchData).mockResolvedValue({ ...matchData, season: '2025/26' })
  vi.mocked(getMatchSeasons).mockReset()
  vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27', '2025/26'])
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const render = async (seizoen: string) =>
  renderToStaticMarkup(
    await SeasonPlayersShortcuts({ params: Promise.resolve({ seizoen }), searchParams: Promise.resolve({}) }),
  )

const hrefs = (html: string) => [...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map(([, href]) => href)

describe('the bar of the page Spelers of an earlier season', () => {
  it('has the same links as the current season: the cards are the same', async () => {
    const html = await render('2025-26')

    expect(hrefs(html)).toEqual(playersShortcuts.map(({ href }) => href))
    expect(html).toContain('Op deze pagina:')
  })

  it('asks for the data of that season', async () => {
    await render('2025-26')

    expect(getMatchData).toHaveBeenCalledExactlyOnceWith('2025/26')
  })

  it('is left out for an address that is no season, without asking for data', async () => {
    expect(await render('onzin')).toBe('')
    expect(getMatchData).not.toHaveBeenCalled()
  })

  it('is left out for a season that has no matches, which is the page "niet gevonden"', async () => {
    expect(await render('2010-11')).toBe('')
    expect(getMatchData).not.toHaveBeenCalled()
  })

  it('is left out when the page shows the error page', async () => {
    vi.mocked(getMatchData).mockRejectedValue(new Error('no database'))

    expect(await render('2025-26')).toBe('')
  })
})

describe('the links to the cards with the figures of the match reports, in an earlier season', () => {
  it('has the links to Alle spelers, Assists and Minuten, in the order of the cards, when the season has reports', async () => {
    vi.mocked(seasonHasReports).mockResolvedValue(true)

    const html = await render('2025-26')
    const found = [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [
      href,
      label,
    ])

    expect(found).toEqual([
      ['#selectie', 'Selectie'],
      ['#alle-spelers', 'Alle spelers'],
      ['#doelpuntenmakers', 'Doelpuntenmakers'],
      ['#alle-tijden', 'Alle tijden'],
      ['#bijzondere-doelpunten', 'Bijzondere doelpunten'],
      ['#assists', 'Assists'],
      ['#minuten', 'Minuten'],
    ])
    expect(seasonHasReports).toHaveBeenCalledWith('2025/26')
    expect(playersShortcutsFor(true)).toHaveLength(7)
  })

  it('has no link to them when the season has no report that is klaar', async () => {
    const html = await render('2025-26')

    expect(html).not.toContain('href="#alle-spelers"')
    expect(html).not.toContain('href="#assists"')
    expect(html).not.toContain('href="#minuten"')
  })
})
