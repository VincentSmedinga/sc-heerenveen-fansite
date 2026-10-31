import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchData, getMatchSeasons } from '../../../matches'
import { statisticsShortcuts } from '../../../statisticsShortcuts'
import { matchData } from '../../../test-matches'
import StatisticsShortcuts from './page'

vi.mock('../../../matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMatchData: vi.fn(),
  getMatchSeasons: vi.fn(),
}))

beforeEach(() => {
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

const render = async () => renderToStaticMarkup(await StatisticsShortcuts())

describe('the bar of /statistieken', () => {
  it('is a navigation named by its label, Op deze pagina:, which is not a link', async () => {
    const html = await render()
    const labelId = html.match(/<nav [^>]*aria-labelledby="([^"]+)"/)?.[1]

    expect(labelId).toBeDefined()
    expect(html).toContain(`<span class="hf-page-shortcuts-label" id="${labelId}">Op deze pagina:</span>`)
  })

  it('has the nine anchors, in the order of a narrow screen, each named for its card', async () => {
    const html = await render()

    expect(
      [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label]),
    ).toEqual([
      ['#onze-plek-in-de-competitie', 'Plek in de competitie'],
      ['#verloop-van-het-seizoen', 'Verloop van het seizoen'],
      ['#reeksen', 'Reeksen'],
      ['#thuis-en-uit', 'Thuis en uit'],
      ['#doelpuntenmakers', 'Doelpuntenmakers'],
      ['#de-nul-gehouden', 'De nul gehouden'],
      ['#doelpunten-per-kwartier', 'Doelpunten per kwartier'],
      ['#hoe-de-wedstrijden-verlopen', 'Hoe wedstrijden verlopen'],
      ['#uitersten', 'Uitersten'],
    ])
    expect(statisticsShortcuts).toHaveLength(9)
  })

  it('has no link to a card of Wedstrijden', async () => {
    const html = await render()

    for (const id of ['programma', 'uitslagen', 'stand', 'eindstand', 'hoofdtrainer']) {
      expect(html).not.toContain(`href="#${id}"`)
    }
  })

  it('marks no link as the current page', async () => {
    expect(await render()).not.toContain('aria-current')
  })

  it('is left out when the page shows the error page, which has no cards to jump to', async () => {
    vi.mocked(getMatchData).mockRejectedValue(new Error('no database'))

    expect(await StatisticsShortcuts()).toBeNull()
  })

  it('asks for the current season only, and not for the seasons to choose from', async () => {
    await render()

    expect(getMatchData).toHaveBeenCalledExactlyOnceWith('2026/27')
    expect(getMatchSeasons).not.toHaveBeenCalled()
  })
})
