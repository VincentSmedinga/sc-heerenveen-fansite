import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMatchData, getMatchSeasons, getPlacePerRound } from '#src/matches'
import { matchData } from '#src/test-matches'

import MatchesShortcuts from './page'

vi.mock('#src/matches', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMatchData: vi.fn(),
  getMatchSeasons: vi.fn(),
  getPlacePerRound: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(getPlacePerRound).mockReset()
  vi.mocked(getPlacePerRound).mockResolvedValue(undefined)
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

const render = async () => renderToStaticMarkup(await MatchesShortcuts())

describe('the bar of /wedstrijden', () => {
  it('is a navigation named by its label, Op deze pagina:, which is not a link', async () => {
    const html = await render()
    const labelId = html.match(/<nav [^>]*aria-labelledby="([^"]+)"/)?.[1]

    expect(labelId).toBeDefined()
    expect(html).toContain(`<span class="hf-page-shortcuts-label" id="${labelId}">Op deze pagina:</span>`)
  })

  it('has an anchor for each of its cards, in the order of a narrow screen, and none of the cards with figures', async () => {
    const html = await render()

    expect(
      [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label]),
    ).toEqual([
      ['#laatste-wedstrijd', 'Laatste wedstrijd'],
      ['#programma', 'Programma'],
      ['#uitslagen', 'Eredivisie'],
      ['#uitslagen-knvb-beker', 'KNVB Beker'],
      ['#stand', 'Stand'],
    ])
  })

  it('has a link to the head coaches straight after the table when the season has a coach in the table', async () => {
    vi.mocked(getMatchData).mockResolvedValue({
      ...matchData,
      coaches: [
        {
          endDate: null,
          endPrecision: null,
          interim: false,
          name: 'Robin Veldman',
          startDate: '2025-03-21',
          startPrecision: 'day',
          wikipediaPage: 'Robin Veldman',
        },
      ],
    })

    expect(
      [...(await render()).matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [
        href,
        label,
      ]),
    ).toEqual([
      ['#laatste-wedstrijd', 'Laatste wedstrijd'],
      ['#programma', 'Programma'],
      ['#uitslagen', 'Eredivisie'],
      ['#uitslagen-knvb-beker', 'KNVB Beker'],
      ['#stand', 'Stand'],
      ['#hoofdtrainer', 'Hoofdtrainer'],
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

describe('the bar of /wedstrijden for the current season', () => {
  it('asks for the current season only, and not for the seasons to choose from', async () => {
    await render()

    expect(getMatchData).toHaveBeenCalledExactlyOnceWith('2026/27')
    expect(getMatchSeasons).not.toHaveBeenCalled()
  })

  it('has Programma, which the current season has a card for', async () => {
    expect(await render()).toContain('href="#programma"')
  })

  it('has a link to the card with our place per round, after the table, when the season has one', async () => {
    vi.mocked(getPlacePerRound).mockResolvedValue([{ points: 3, position: 1, round: 1 }])

    expect([...(await render()).matchAll(/<a [^>]*href="(#[^"]*)"/g)].map(([, href]) => href)).toEqual([
      '#laatste-wedstrijd',
      '#programma',
      '#uitslagen',
      '#uitslagen-knvb-beker',
      '#stand',
      '#onze-plek-per-speelronde',
    ])
  })

  it('has no link when the season has no line', async () => {
    expect(await render()).not.toContain('#onze-plek-per-speelronde')
  })

  it('leaves the link out when the card can not be read', async () => {
    vi.mocked(getPlacePerRound).mockRejectedValue(new Error('down'))

    expect(await render()).not.toContain('#onze-plek-per-speelronde')
  })
})
