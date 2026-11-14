import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchData, getMatchSeasons } from '#src/matches'
import { playersShortcuts } from '#src/statisticsShortcuts'
import { matchData } from '#src/test-matches'

import PlayersShortcuts from './page'

vi.mock('#src/matches', async (importOriginal) => ({
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

describe('the bar of /spelers', () => {
  it('is a navigation named Op deze pagina:, with one link: to the card Selectie', async () => {
    const html = renderToStaticMarkup(await PlayersShortcuts())

    expect(html).toContain('Op deze pagina:')
    expect(
      [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label]),
    ).toEqual([['#selectie', 'Selectie']])
    expect(playersShortcuts).toHaveLength(1)
  })

  it('marks no link as the current page', async () => {
    expect(renderToStaticMarkup(await PlayersShortcuts())).not.toContain('aria-current')
  })

  it('is left out when the page shows the error page, which has no card to jump to', async () => {
    vi.mocked(getMatchData).mockRejectedValue(new Error('no database'))

    expect(await PlayersShortcuts()).toBeNull()
  })

  it('asks for the current season only, and not for the seasons to choose from', async () => {
    await PlayersShortcuts()

    expect(getMatchData).toHaveBeenCalledExactlyOnceWith('2026/27')
    expect(getMatchSeasons).not.toHaveBeenCalled()
  })
})
