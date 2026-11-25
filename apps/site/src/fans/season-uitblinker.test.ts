import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RatingFigures } from './season-ratings'

import { readSeasonUitblinker } from './season-uitblinker'

const { findRatingWindow, latestResult, ratingFigures } = vi.hoisted(() => ({
  findRatingWindow: vi.fn(),
  latestResult: vi.fn(),
  ratingFigures: vi.fn(),
}))

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('./match-ratings', async (importOriginal) => ({ ...(await importOriginal<object>()), latestResult }))
vi.mock('./rating', async (importOriginal) => ({ ...(await importOriginal<object>()), findRatingWindow }))
vi.mock('./season-ratings', async (importOriginal) => ({ ...(await importOriginal<object>()), ratingFigures }))

// Friday 20 November 2026.
const now = new Date('2026-11-20T11:00:00Z')
const match = { home: true, opponent: 'FC Twente', season: '2026/27' }
const open = { match, state: 'open' }
const closed = { match, state: 'closed' }
const latest = {
  match: { goalsAgainst: 1, goalsFor: 3, home: true, id: 1, opponent: 'Ajax', season: '2026/27' },
  ratings: { players: [], supporters: 31, winner: { average: 7.8, count: 31, name: 'Speler A' } },
}
const figure = (season: string, name: string, average: number, old = false) => ({
  counting: 5,
  name,
  old,
  playerId: name.length + average,
  ratings: 50,
  season,
  total: average * 50,
})
const figures: RatingFigures = {
  figures: [
    figure('2025/26', 'Speler B', 7.5),
    figure('2025/26', 'Speler C', 6),
    figure('2005/06', 'Speler D', 7, true),
  ],
  oldRatings: [],
  overSeasons: new Set(['2005/06', '2025/26']),
}

beforeEach(() => {
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_UITBLINKER', 'on')
  findRatingWindow.mockResolvedValue(closed)
  latestResult.mockResolvedValue(latest)
  ratingFigures.mockResolvedValue(figures)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

describe('the Uitblinker of the running season', () => {
  it('is the one of the last match with a result, with the fans, and no link while the window is closed', async () => {
    expect(await readSeasonUitblinker('2026/27', now)).toEqual({
      kind: 'last-match',
      result: {
        seal: {
          average: '7,8',
          label: 'Uitblinker vorige wedstrijd',
          line: 'Thuis tegen Ajax, 3–1',
          name: 'Speler A',
        },
        supporters: '31 fans gaven cijfers.',
      },
    })
  })

  it('names the match that can be rated while the window is open', async () => {
    findRatingWindow.mockResolvedValue(open)

    expect(await readSeasonUitblinker('2026/27', now)).toMatchObject({
      openMatch: 'sc Heerenveen – FC Twente',
      result: { supporters: '31 fans gaven cijfers.' },
    })
  })

  it('has only the open match while there is no result, or only one of the season before', async () => {
    findRatingWindow.mockResolvedValue(open)

    for (const result of [undefined, { ...latest, match: { ...latest.match, season: '2025/26' } }]) {
      latestResult.mockResolvedValue(result)

      expect(await readSeasonUitblinker('2026/27', now)).toEqual({
        kind: 'last-match',
        openMatch: 'sc Heerenveen – FC Twente',
      })
    }
  })

  it('has no card without a Uitblinker and without an open window', async () => {
    latestResult.mockResolvedValue({ ...latest, ratings: { players: [], supporters: 3 } })

    expect(await readSeasonUitblinker('2026/27', now)).toBeUndefined()
  })
})

describe('the Uitblinker of a season that is over', () => {
  it('is the Uitblinker of the year, without a source line for our own fans', async () => {
    expect(await readSeasonUitblinker('2025/26', now)).toEqual({
      kind: 'year',
      seals: [
        {
          average: '7,5',
          label: 'Uitblinker van het jaar',
          line: 'Gemiddelde van 50 cijfers',
          name: 'Speler B',
        },
      ],
    })
    expect(findRatingWindow).not.toHaveBeenCalled()
  })

  it('has the source line for a rating of the old Fansite', async () => {
    expect(await readSeasonUitblinker('2005/06', now)).toMatchObject({
      source: 'Cijfers van bezoekers van de Fansite, 2001 tot 2007.',
    })
  })

  it('has no card for a season without a Uitblinker', async () => {
    expect(await readSeasonUitblinker('2010/11', now)).toBeUndefined()
  })
})

describe('the card Uitblinker', () => {
  it.each(['FANS_UITBLINKER', 'FANS_ACCOUNTS'])('is not there, and reads nothing, while %s is off', async (name) => {
    vi.stubEnv(name, 'off')

    expect(await readSeasonUitblinker('2025/26', now)).toBeUndefined()
    expect(ratingFigures).not.toHaveBeenCalled()
  })

  it('is left out and logged when the reading fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    ratingFigures.mockRejectedValue(new Error('database down'))

    expect(await readSeasonUitblinker('2025/26', now)).toBeUndefined()
    expect(log).toHaveBeenCalledOnce()
  })
})
