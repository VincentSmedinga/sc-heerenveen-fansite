import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchData } from '../../../matches'
import { matchData } from '../../../test-matches'
import MatchesShortcuts from './page'

vi.mock('../../../matches', async (importOriginal) => ({ ...(await importOriginal<object>()), getMatchData: vi.fn() }))

beforeEach(() => {
  vi.mocked(getMatchData).mockReset()
  vi.mocked(getMatchData).mockResolvedValue(matchData)
})

afterEach(() => {
  vi.restoreAllMocks()
})

const render = async () => renderToStaticMarkup(await MatchesShortcuts())

describe('the bar of /wedstrijden', () => {
  it('is a navigation named by its label, Op deze pagina:, which is not a link', async () => {
    const html = await render()
    const labelId = html.match(/<nav [^>]*aria-labelledby="([^"]+)"/)?.[1]

    expect(labelId).toBeDefined()
    expect(html).toContain(`<span class="hf-page-shortcuts-label" id="${labelId}">Op deze pagina:</span>`)
  })

  it('has the eight anchors, in the order of a narrow screen, each named for its card', async () => {
    const html = await render()

    expect(
      [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label]),
    ).toEqual([
      ['#programma', 'Programma'],
      ['#uitslagen', 'Uitslagen'],
      ['#stand', 'Stand'],
      ['#verloop-van-het-seizoen', 'Verloop van het seizoen'],
      ['#reeksen', 'Reeksen'],
      ['#doelpuntenmakers', 'Doelpuntenmakers'],
      ['#de-nul-gehouden', 'De nul gehouden'],
      ['#doelpunten-per-kwartier', 'Doelpunten per kwartier'],
      ['#uitersten', 'Uitersten'],
    ])
  })

  it('marks no link as the current page', async () => {
    expect(await render()).not.toContain('aria-current')
  })

  it('is left out when the page shows the error page, which has no cards to jump to', async () => {
    vi.mocked(getMatchData).mockRejectedValue(new Error('no database'))

    expect(await MatchesShortcuts()).toBeNull()
  })
})
