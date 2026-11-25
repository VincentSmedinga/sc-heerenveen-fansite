import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RatingMatch, RatingPlayer, RatingWindow } from '#src/fans/rating'

import { readUitblinkerCard, uitblinkerCardState } from './uitblinker-card'

const { findOwnRatings, findRatingWindow, latestResult, loadRunningRatings } = vi.hoisted(() => ({
  findOwnRatings: vi.fn(),
  findRatingWindow: vi.fn(),
  latestResult: vi.fn(),
  loadRunningRatings: vi.fn(),
}))

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/fans/match-ratings', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  latestResult,
  loadRunningRatings,
}))
vi.mock('#src/fans/rating', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findOwnRatings,
  findRatingWindow,
}))

const now = new Date('2026-11-22T12:00:00Z')
const match = {
  competition: 'Eredivisie',
  dateText: null,
  extraTime: false,
  goalsAgainst: 1,
  goalsFor: 3,
  home: true,
  id: 1,
  kickoffAt: new Date('2026-11-21T15:45:00Z'),
  matchDate: '2026-11-21',
  opponent: 'Sparta Rotterdam',
  round: 'Speelronde 14',
  status: 'played',
} as RatingMatch
const players = Array.from({ length: 14 }, (_, index) => ({ appearanceId: index + 1 }) as RatingPlayer)
const open = {
  closesAt: new Date('2026-11-26T19:00:00Z'),
  coach: null,
  match,
  players,
  startsAt: new Date('2026-11-21T15:45:00Z'),
  state: 'open',
} as const satisfies RatingWindow
const before = new Date('2026-10-01T00:00:00Z')
const supporter = { createdAt: before, disabledAt: null, id: 5 }

describe('the state of the card of the Uitblinker on Fans', () => {
  it('is green with the moment it closes for a visitor, with a link and without a button', () => {
    expect(uitblinkerCardState(open, undefined, now)).toEqual({
      action: { href: '/fans/uitblinker', label: 'Naar de Uitblinker', type: 'link' },
      lines: ['Geef de spelers van de laatste wedstrijd een cijfer.'],
      tag: { text: 'Open tot do 20.00', tone: 'open' },
    })
  })

  it('is amber with the button for a supporter who has not graded yet', () => {
    const state = uitblinkerCardState(open, { createdAt: before, grades: 0 })

    expect(state.tag).toEqual({ text: 'Nog te doen', tone: 'todo' })
    expect(state.lines).toEqual(['Geef 14 spelers een cijfer. Kan tot donderdag 26 november, 20.00 uur.'])
    expect(state.action).toEqual({ href: '/fans/uitblinker', label: 'Cijfers geven', type: 'button' })
  })

  it('counts the head coach as one more to rate, and is green only when he has a grade too', () => {
    const withCoach = { ...open, coach: { name: 'Robin Veldman', staffId: 1 } }

    expect(uitblinkerCardState(withCoach, { createdAt: before, grades: 0 }).lines[0]).toBe(
      'Geef 14 spelers en de trainer een cijfer. Kan tot donderdag 26 november, 20.00 uur.',
    )
    expect(uitblinkerCardState(withCoach, { createdAt: before, grades: 14 }).tag.tone).toBe('todo')
    expect(uitblinkerCardState(withCoach, { createdAt: before, grades: 15 }).tag.tone).toBe('open')
  })

  it('is green, with the button still there, for a supporter who graded every player', () => {
    const state = uitblinkerCardState(open, { createdAt: before, grades: 14 })

    expect(state.tag.tone).toBe('open')
    expect(state.action.type).toBe('button')
  })

  it('has no button and no "Nog te doen" for an account that is made after the match began', () => {
    const state = uitblinkerCardState(open, { createdAt: new Date('2026-11-22T00:00:00Z'), grades: 0 })

    expect(state.action.type).toBe('link')
    expect(state.tag.tone).toBe('open')
  })

  it('is grey when the window is closed or no match was played, and says when it waits for the report', () => {
    expect(uitblinkerCardState({ ...open, state: 'closed' }).tag).toEqual({ text: 'Gesloten', tone: 'closed' })
    expect(uitblinkerCardState({ state: 'none' }).tag.tone).toBe('closed')
    expect(
      uitblinkerCardState(
        { closesAt: open.closesAt, match, startsAt: open.startsAt, state: 'waiting' },
        { createdAt: before, grades: 0 },
      ),
    ).toMatchObject({ action: { type: 'link' }, tag: { text: 'Nog niet open' } })
  })
})

describe('reading the card of the Uitblinker for Fans', () => {
  const latest = {
    match: { goalsAgainst: 1, goalsFor: 3, home: true, id: 1, opponent: 'Sparta Rotterdam' },
    ratings: {
      players: [],
      supporters: 31,
      winner: { appearanceId: null, average: 7.8, count: 31, name: 'Dylan Vente', playerId: 1 },
    },
  }

  beforeEach(() => {
    findRatingWindow.mockResolvedValue(open)
    findOwnRatings.mockResolvedValue(new Map())
    latestResult.mockResolvedValue(latest)
    loadRunningRatings.mockResolvedValue([{ count: 12 }, { count: 9 }])
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetAllMocks()
  })

  it('shows the match and how many fans gave grades while the window is open', async () => {
    const card = await readUitblinkerCard(undefined, now)

    expect(card?.match).toMatchObject({ goalsFor: 3, opponent: 'Sparta Rotterdam', status: 'played' })
    expect(card?.lines).toContain('12 fans gaven al cijfers.')
  })

  it('has no match and no count while the window is closed', async () => {
    findRatingWindow.mockResolvedValue({ ...open, state: 'closed' })

    const card = await readUitblinkerCard(undefined, now)

    expect(card?.match).toBeUndefined()
    expect(card?.lines).toHaveLength(1)
    expect(loadRunningRatings).not.toHaveBeenCalled()
  })

  it('has no line of the count for nobody', async () => {
    loadRunningRatings.mockResolvedValue([])

    expect((await readUitblinkerCard(undefined, now))?.lines).toHaveLength(1)
  })

  it('adds the Uitblinker of the last match with a result, the same for a visitor and a supporter', async () => {
    const expected = {
      count: '31 fans gaven cijfers.',
      star: { average: '7,8', line: 'Thuis tegen Sparta Rotterdam, 3–1', name: 'Dylan Vente' },
    }

    expect((await readUitblinkerCard(undefined, now))?.winner).toEqual(expected)
    expect((await readUitblinkerCard(supporter, now))?.winner).toEqual(expected)
  })

  it('asks nothing of its own for a blocked account, which gets no button', async () => {
    const card = await readUitblinkerCard({ ...supporter, disabledAt: new Date() }, now)

    expect(card?.action.type).toBe('link')
    expect(findOwnRatings).not.toHaveBeenCalled()
  })

  it('has no result, and so no star, while no window has closed', async () => {
    latestResult.mockResolvedValue(undefined)

    expect((await readUitblinkerCard(undefined, now))?.winner).toBeUndefined()
  })

  it('has the number but no star when nobody had five grades', async () => {
    latestResult.mockResolvedValue({ ...latest, ratings: { players: [], supporters: 3 } })

    expect((await readUitblinkerCard(undefined, now))?.winner).toEqual({ count: '3 fans gaven cijfers.' })
  })

  it('leaves the card out and logs when the reading fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    latestResult.mockRejectedValue(new Error('database down'))

    expect(await readUitblinkerCard(undefined, now)).toBeUndefined()
    expect(log).toHaveBeenCalledOnce()
  })
})
