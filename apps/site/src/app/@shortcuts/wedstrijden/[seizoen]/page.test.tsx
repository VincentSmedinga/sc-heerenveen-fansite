import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchData, getMatchSeasons } from '#src/matches'
import { matchShortcutsOf } from '#src/matchShortcuts'
import { matchData } from '#src/test-matches'

import SeasonMatchesShortcuts from './page'

vi.mock('#src/matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMatchData: vi.fn(),
  getMatchSeasons: vi.fn(),
}))

beforeEach(() => {
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
  renderToStaticMarkup(await SeasonMatchesShortcuts({ params: Promise.resolve({ seizoen }) }))

const hrefs = (html: string) => [...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map(([, href]) => href)

describe('the bar of the page of an earlier season', () => {
  it('has the anchors of the cards the page has: a card with results for each competition, without Programma', async () => {
    const html = await render('2025-26')

    // The made-up matches have the league and the cup.
    expect(hrefs(html)).toEqual(matchShortcutsOf(false, 0, ['Eredivisie', 'KNVB Beker']).map(({ href }) => href))
    expect(hrefs(html)).toEqual(['#uitslagen', '#uitslagen-knvb-beker', '#eindstand', '#hoe-vaak-welke-uitslag'])
    expect(hrefs(html)).not.toContain('#programma')
    expect(html).toContain('Op deze pagina:')
    expect(html).toContain('>Eredivisie</a>')
    expect(html).toContain('>KNVB Beker</a>')
  })

  it('has a link for the play-offs too, after the one for the cup', async () => {
    const [first] = matchData.matches
    const playOffs = {
      ...first!,
      competition: 'Play-offs Conference League',
      matchDate: '2026-05-20',
      round: 'Halve finale',
    } as const

    vi.mocked(getMatchData).mockResolvedValue({
      ...matchData,
      matches: [...matchData.matches, playOffs],
      season: '2025/26',
    })
    const html = await render('2025-26')

    expect(hrefs(html)).toEqual([
      '#uitslagen',
      '#uitslagen-knvb-beker',
      '#uitslagen-play-offs',
      '#eindstand',
      '#hoe-vaak-welke-uitslag',
    ])
    expect(html).toContain('>Play-offs Conference League</a>')
  })

  it('has the one link Uitslagen for a season without matches', async () => {
    vi.mocked(getMatchData).mockResolvedValue({ ...matchData, matches: [], season: '2025/26' })
    const html = await render('2025-26')

    expect(hrefs(html)).toEqual(['#uitslagen', '#eindstand', '#hoe-vaak-welke-uitslag'])
    expect(html).toContain('>Uitslagen</a>')
  })

  it('has Eindstand for Stand, with the anchor of the card', async () => {
    const html = await render('2025-26')

    expect(hrefs(html)).toContain('#eindstand')
    expect(hrefs(html)).not.toContain('#stand')
    expect(html).toContain('>Eindstand</a>')
    expect(html).not.toContain('>Stand</a>')
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
