import type { PredictionMatch } from '@fansite/db/prediction-matches'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadMonthQuiz } from './fantest-entry'
import { fjouwerMatch } from './fjouwer'
import { loadOpenGames } from './open-games'
import { predictionMatches } from './prediction'
import { findRatingWindow, type RatingWindow } from './rating'

vi.mock('../database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('./fantest-entry', async (importOriginal) => ({ ...(await importOriginal<object>()), loadMonthQuiz: vi.fn() }))
vi.mock('./fjouwer', async (importOriginal) => ({ ...(await importOriginal<object>()), fjouwerMatch: vi.fn() }))
vi.mock('./prediction', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  predictionMatches: vi.fn(),
}))
vi.mock('./rating', async (importOriginal) => ({ ...(await importOriginal<object>()), findRatingWindow: vi.fn() }))

// Friday 20 November 2026, noon in the Netherlands.
const now = new Date('2026-11-20T11:00:00Z')
const kickoff = new Date('2026-11-21T15:45:00Z')

const match: PredictionMatch = {
  clubSlug: 'fc-twente',
  competition: 'Eredivisie',
  dateText: null,
  home: true,
  id: 1,
  kickoffAt: kickoff,
  matchDate: '2026-11-21',
  opponent: 'FC Twente',
  round: '14',
  season: '2026/27',
  status: 'scheduled',
}

const ratingMatch = { ...match, extraTime: false, goalsAgainst: 0, goalsFor: 1, status: 'played' as const }

const openWindow: RatingWindow = {
  closesAt: new Date('2026-11-21T15:45:00Z'),
  coach: null,
  match: ratingMatch,
  players: [],
  startsAt: new Date('2026-11-15T12:00:00Z'),
  state: 'open',
}

const names = async () => (await loadOpenGames(now)).map(({ game }) => game)

beforeEach(() => {
  for (const name of ['FANS_ACCOUNTS', 'FANS_PROGNOSE', 'FANS_UITBLINKER', 'FANS_VIER', 'FANS_FANTEST']) {
    vi.stubEnv(name, 'on')
  }

  vi.mocked(predictionMatches).mockReset()
  vi.mocked(predictionMatches).mockResolvedValue({ next: match })
  vi.mocked(findRatingWindow).mockReset()
  vi.mocked(findRatingWindow).mockResolvedValue(openWindow)
  vi.mocked(fjouwerMatch).mockReset()
  vi.mocked(fjouwerMatch).mockResolvedValue(match)
  vi.mocked(loadMonthQuiz).mockReset()
  vi.mocked(loadMonthQuiz).mockResolvedValue({
    id: 1,
    intro: '',
    month: 11,
    questions: [],
    version: 'a',
    year: 2026,
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('the games that are open', () => {
  it('lists the four games in order, each with the moment it closes', async () => {
    expect(await loadOpenGames(now)).toEqual([
      { closesAt: kickoff, game: 'prognose', match },
      { closesAt: openWindow.closesAt, game: 'uitblinker', match: ratingMatch },
      { closesAt: kickoff, game: 'fjouwer', match },
      // The end of November, 00.00 on 1 December in the Netherlands.
      { closesAt: new Date('2026-11-30T23:00:00Z'), game: 'fantest', month: 11 },
    ])
  })

  it('closes the Fantest of December as the new year begins', async () => {
    const [fantest] = await loadOpenGames(new Date('2026-12-15T11:00:00Z'), ['fantest'])

    expect(fantest?.closesAt).toEqual(new Date('2026-12-31T23:00:00Z'))
  })

  it('asks only for the games it is asked for', async () => {
    expect((await loadOpenGames(now, ['fjouwer', 'prognose'])).map(({ game }) => game)).toEqual(['prognose', 'fjouwer'])
    expect(findRatingWindow).not.toHaveBeenCalled()
    expect(loadMonthQuiz).not.toHaveBeenCalled()
  })

  it.each([
    ['FANS_PROGNOSE', 'prognose'],
    ['FANS_UITBLINKER', 'uitblinker'],
    ['FANS_VIER', 'fjouwer'],
    ['FANS_FANTEST', 'fantest'],
  ])('leaves out the game of %s while it is off', async (setting, game) => {
    vi.stubEnv(setting, 'off')

    const open = await names()

    expect(open).toHaveLength(3)
    expect(open).not.toContain(game)
  })

  it('lists nothing, and reads nothing, while accounts are off', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'off')

    expect(await names()).toEqual([])
    expect(predictionMatches).not.toHaveBeenCalled()
    expect(findRatingWindow).not.toHaveBeenCalled()
    expect(fjouwerMatch).not.toHaveBeenCalled()
    expect(loadMonthQuiz).not.toHaveBeenCalled()
  })

  it('has no Prognose without a match, or with a kick-off that is not known or has been', async () => {
    for (const next of [
      undefined,
      { ...match, kickoffAt: null },
      { ...match, kickoffAt: new Date('2026-11-20T10:00:00Z') },
    ]) {
      vi.mocked(predictionMatches).mockResolvedValue(next === undefined ? {} : { next })
      expect(await names()).not.toContain('prognose')
    }
  })

  it('has the Fjouwer of a match without a time, which closes at 00.00 on its day', async () => {
    vi.mocked(fjouwerMatch).mockResolvedValue({ ...match, kickoffAt: null })

    const [fjouwer] = await loadOpenGames(now, ['fjouwer'])

    expect(fjouwer?.closesAt).toEqual(new Date('2026-11-20T23:00:00Z'))
  })

  it('has no Fjouwer without a match to choose for', async () => {
    vi.mocked(fjouwerMatch).mockResolvedValue(undefined)

    expect(await names()).not.toContain('fjouwer')
  })

  it.each(['closed', 'waiting', 'none'] as const)('has no Uitblinker while the window is %s', async (state) => {
    vi.mocked(findRatingWindow).mockResolvedValue(state === 'none' ? { state } : { ...openWindow, state })

    expect(await names()).not.toContain('uitblinker')
  })

  it('has no Fantest without a quiz of this month', async () => {
    vi.mocked(loadMonthQuiz).mockResolvedValue(undefined)

    expect(await names()).not.toContain('fantest')
  })

  it('logs a game that can not be read and leaves only that one out', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(fjouwerMatch).mockRejectedValue(new Error('Failed query'))

    expect(await names()).toEqual(['prognose', 'uitblinker', 'fantest'])
    expect(log).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('fjouwer'))
  })
})
