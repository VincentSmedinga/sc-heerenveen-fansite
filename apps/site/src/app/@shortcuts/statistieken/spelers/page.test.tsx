import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchData, getMatchSeasons } from '../../../../matches'
import { playersShortcuts } from '../../../../statisticsShortcuts'
import { matchData } from '../../../../test-matches'
import PlayersShortcuts from './page'

vi.mock('../../../../matches', async (importOriginal) => ({
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

const render = async () => renderToStaticMarkup(await PlayersShortcuts())

describe('the bar of /statistieken/spelers', () => {
  it('is a navigation named Op deze pagina:, with one link: to the card Doelpuntenmakers', async () => {
    const html = await render()

    expect(html).toContain('Op deze pagina:')
    expect(
      [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label]),
    ).toEqual([['#doelpuntenmakers', 'Doelpuntenmakers']])
    expect(playersShortcuts).toHaveLength(1)
  })

  it('has none of the other eight cards of Statistieken', async () => {
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

    expect(await PlayersShortcuts()).toBeNull()
  })

  it('asks for the current season only, and not for the seasons to choose from', async () => {
    await render()

    expect(getMatchData).toHaveBeenCalledExactlyOnceWith('2026/27')
    expect(getMatchSeasons).not.toHaveBeenCalled()
  })
})
