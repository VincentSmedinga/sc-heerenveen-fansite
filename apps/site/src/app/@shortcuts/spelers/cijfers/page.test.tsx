import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchData, getMatchSeasons } from '#src/matches'
import { seasonHasReports } from '#src/season-report-figures'
import { playerFiguresShortcuts, playerFiguresShortcutsFor } from '#src/statisticsShortcuts'
import { matchData } from '#src/test-matches'

import PlayerFiguresShortcuts from './page'

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
  vi.mocked(getMatchData).mockReset()
  vi.mocked(getMatchData).mockResolvedValue(matchData)
  vi.mocked(getMatchSeasons).mockReset()
  vi.mocked(getMatchSeasons).mockResolvedValue(['2026/27', '2025/26'])
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-23T13:40:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const render = async () => renderToStaticMarkup(await PlayerFiguresShortcuts({ searchParams: Promise.resolve({}) }))

describe('the bar of /spelers/cijfers', () => {
  it('is a navigation named Op deze pagina:, with two links: to the cards Doelpuntenmakers and Bijzondere doelpunten', async () => {
    const html = await render()

    expect(html).toContain('Op deze pagina:')
    expect(
      [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label]),
    ).toEqual([
      ['#doelpuntenmakers', 'Doelpuntenmakers'],
      ['#bijzondere-doelpunten', 'Bijzondere doelpunten'],
    ])
    expect(playerFiguresShortcuts).toHaveLength(2)
  })

  it('has none of the cards of the matches', async () => {
    const html = await render()

    for (const id of ['reeksen', 'uitersten', 'de-nul-gehouden']) {
      expect(html).not.toContain(`href="#${id}"`)
    }
  })

  it('marks no link as the current page', async () => {
    expect(await render()).not.toContain('aria-current')
  })

  it('is left out when the page shows the error page, which has no card to jump to', async () => {
    vi.mocked(getMatchData).mockRejectedValue(new Error('no database'))

    expect(await PlayerFiguresShortcuts({ searchParams: Promise.resolve({}) })).toBeNull()
  })

  it('asks for the current season only, and not for the seasons to choose from', async () => {
    await render()

    expect(getMatchData).toHaveBeenCalledExactlyOnceWith('2026/27')
    expect(getMatchSeasons).not.toHaveBeenCalled()
  })
})

describe('the bar of /spelers/cijfers and the choice of the matches', () => {
  it('is there for the Eredivisie, which is a page, and left out for a value that the page does not know', async () => {
    expect(
      renderToStaticMarkup(
        await PlayerFiguresShortcuts({ searchParams: Promise.resolve({ competitie: 'eredivisie' }) }),
      ),
    ).toContain('Op deze pagina:')

    for (const competitie of ['alle', '', ['eredivisie', 'eredivisie']]) {
      expect(await PlayerFiguresShortcuts({ searchParams: Promise.resolve({ competitie }) })).toBeNull()
    }
  })
})

describe('the links to the cards with the figures of the match reports, in the current season', () => {
  it('has the links to Alle spelers, Assists and Minuten, in the order of the cards, when the season has reports', async () => {
    vi.mocked(seasonHasReports).mockResolvedValue(true)

    const html = await render()
    const found = [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [
      href,
      label,
    ])

    expect(found).toEqual([
      ['#doelpuntenmakers', 'Doelpuntenmakers'],
      ['#alle-spelers', 'Alle spelers'],
      ['#assists', 'Assists'],
      ['#minuten', 'Minuten'],
      ['#bijzondere-doelpunten', 'Bijzondere doelpunten'],
    ])
    expect(seasonHasReports).toHaveBeenCalledWith('2026/27')
    expect(playerFiguresShortcutsFor(true)).toHaveLength(5)
  })

  it('has no link to them when the season has no report that is klaar', async () => {
    const html = await render()

    expect(html).not.toContain('href="#alle-spelers"')
    expect(html).not.toContain('href="#assists"')
    expect(html).not.toContain('href="#minuten"')
  })
})
