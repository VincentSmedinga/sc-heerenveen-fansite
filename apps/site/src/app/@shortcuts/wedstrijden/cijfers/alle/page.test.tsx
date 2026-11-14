import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAllMatches } from '#src/matches'
import { allSeasonsStatisticsShortcuts } from '#src/statisticsShortcuts'

import AllSeasonsStatisticsShortcuts from './page'

vi.mock('#src/matches', () => ({ getAllMatches: vi.fn() }))

const render = async (searchParams: Record<string, string | string[]> = {}) =>
  renderToStaticMarkup(await AllSeasonsStatisticsShortcuts({ searchParams: Promise.resolve(searchParams) }))

beforeEach(() => {
  vi.mocked(getAllMatches).mockResolvedValue([])
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the bar of /wedstrijden/cijfers/alle', () => {
  it('links to the four groups, in the order of the page, under the label Op deze pagina:', async () => {
    const html = await render()

    expect([...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map(([, href]) => href)).toEqual(
      allSeasonsStatisticsShortcuts.map(({ href }) => href),
    )
    expect(html).toContain('Op deze pagina:')
  })

  it('is left out when the page shows the error page, which has no groups to jump to', async () => {
    vi.mocked(getAllMatches).mockRejectedValue(new Error('no database'))

    expect(await render()).toBe('')
  })

  it('is left out for a choice of competition that the page does not know, which is "niet gevonden"', async () => {
    expect(await render({ competitie: 'onzin' })).toBe('')
  })
})
