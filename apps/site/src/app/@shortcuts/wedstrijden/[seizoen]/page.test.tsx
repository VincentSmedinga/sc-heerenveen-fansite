import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchData, getMatchSeasons } from '../../../../matches'
import { matchShortcuts } from '../../../../matchShortcuts'
import { matchData } from '../../../../test-matches'
import SeasonMatchesShortcuts from './page'

vi.mock('../../../../matches', async (importOriginal) => ({
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
  it('has the anchors of the cards the page has: those of the current season without Programma', async () => {
    const html = await render('2025-26')

    expect(hrefs(html)).toEqual(matchShortcuts.map(({ href }) => href).filter((href) => href !== '#programma'))
    expect(hrefs(html)).toHaveLength(11)
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
