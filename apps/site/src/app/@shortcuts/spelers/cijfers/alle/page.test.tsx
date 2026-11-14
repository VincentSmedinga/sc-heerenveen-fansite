import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { allSeasonsShortcuts } from '#src/statisticsShortcuts'

import AllSeasonsPlayerFiguresShortcuts from './page'

const cards = vi.hoisted(() => ({ allSeasonsCards: vi.fn() }))

vi.mock('#src/app/spelers/cijfers/all-seasons-page', () => cards)

const render = async (searchParams: Record<string, string | string[]> = {}) =>
  renderToStaticMarkup(await AllSeasonsPlayerFiguresShortcuts({ searchParams: Promise.resolve(searchParams) }))

const hrefs = (html: string) => [...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map(([, href]) => href)

beforeEach(() => {
  cards.allSeasonsCards.mockReset()
  cards.allSeasonsCards.mockResolvedValue({ hattricks: true, penalties: true, scorers: true })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the bar of /spelers/cijfers/alle', () => {
  it('links to the three cards in the order of the page', async () => {
    const html = await render()

    expect(hrefs(html)).toEqual(allSeasonsShortcuts.map(({ href }) => href))
    expect(html).toContain('Op deze pagina:')
  })

  it('leaves out the link to a card that is not on the page', async () => {
    cards.allSeasonsCards.mockResolvedValue({ hattricks: false, penalties: true, scorers: true })

    expect(hrefs(await render())).toEqual(['#topscorers-sinds-1990-91', '#strafschoppen'])
  })

  it('passes the choice of competition on', async () => {
    await render({ competitie: 'beker' })

    expect(cards.allSeasonsCards).toHaveBeenCalledWith('beker')
  })

  it('is left out when the page has no cards to jump to: an unknown choice or an error', async () => {
    cards.allSeasonsCards.mockResolvedValue(undefined)

    expect(await render({ competitie: 'onzin' })).toBe('')
  })
})
