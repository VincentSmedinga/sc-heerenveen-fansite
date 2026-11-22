import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RatingMatch, RatingPlayer, RatingWindow } from '#src/fans/rating'

import { readUitblinkerCard, UitblinkerCard, uitblinkerCardData } from './UitblinkerCard'

const { findOwnRatings, findRatingWindow, latestResult } = vi.hoisted(() => ({
  findOwnRatings: vi.fn(),
  findRatingWindow: vi.fn(),
  latestResult: vi.fn(),
}))

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/fans/match-ratings', async (importOriginal) => ({ ...(await importOriginal<object>()), latestResult }))
vi.mock('#src/fans/rating', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findOwnRatings,
  findRatingWindow,
}))

const now = new Date('2026-11-22T12:00:00Z')
const match = { id: 1 } as RatingMatch
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

describe('the card of the Uitblinker on Fans', () => {
  it('is green with the moment it closes for a visitor, without a button', () => {
    const data = uitblinkerCardData(open, undefined, now)

    expect(data.tag).toEqual({ text: 'Open tot do 20.00', tone: 'open' })
    expect(data.button).toBe(false)
  })

  it('is amber with the button for a supporter who has not graded yet', () => {
    const data = uitblinkerCardData(open, { createdAt: before, grades: 0 }, now)

    expect(data.tag).toEqual({ text: 'Nog te doen', tone: 'todo' })
    expect(data.text).toBe('Geef 14 spelers een cijfer. Kan tot donderdag 26 november, 20.00 uur.')
    expect(data.button).toBe(true)
  })

  it('counts the head coach as one more to rate, and is green only when he has a grade too', () => {
    const withCoach = { ...open, coach: { name: 'Robin Veldman', staffId: 1 } }

    expect(uitblinkerCardData(withCoach, { createdAt: before, grades: 0 }, now).text).toBe(
      'Geef 14 spelers en de trainer een cijfer. Kan tot donderdag 26 november, 20.00 uur.',
    )
    expect(uitblinkerCardData(withCoach, { createdAt: before, grades: 14 }, now).tag.tone).toBe('todo')
    expect(uitblinkerCardData(withCoach, { createdAt: before, grades: 15 }, now).tag.tone).toBe('open')
    expect(uitblinkerCardData(withCoach, undefined, now).text).toBe(
      'Geef de spelers en de trainer van de laatste wedstrijd een cijfer.',
    )
  })

  it('is green again for a supporter who graded every player', () => {
    expect(uitblinkerCardData(open, { createdAt: before, grades: 14 }, now).tag.tone).toBe('open')
  })

  it('has no button and no "Nog te doen" for an account that is made after the match began', () => {
    const data = uitblinkerCardData(open, { createdAt: new Date('2026-11-22T00:00:00Z'), grades: 0 }, now)

    expect(data.button).toBe(false)
    expect(data.tag.tone).toBe('open')
  })

  it('is grey when the window is closed or no match was played, and says when it waits for the report', () => {
    expect(uitblinkerCardData({ ...open, state: 'closed' }, undefined, now).tag).toEqual({
      text: 'Gesloten',
      tone: 'closed',
    })
    expect(uitblinkerCardData({ state: 'none' }, undefined, now).tag.tone).toBe('closed')
    expect(
      uitblinkerCardData(
        { closesAt: open.closesAt, match, startsAt: open.startsAt, state: 'waiting' },
        { createdAt: before, grades: 0 },
        now,
      ),
    ).toMatchObject({ button: false, tag: { text: 'Nog niet open' } })
  })

  it('is a card of the game with its watermark and a heading of level 2', () => {
    const html = renderToStaticMarkup(
      <UitblinkerCard {...uitblinkerCardData(open, { createdAt: before, grades: 0 }, now)} />,
    )

    expect(html).toContain('hf-card-game-uitblinker')
    expect(html).toMatch(/<h2[^>]*>Uitblinker<\/h2>/)
    expect(html).toContain('hf-tag-todo')
    expect(html).toMatch(/<form[^>]*action="\/fans\/uitblinker"[^>]*>.*Cijfers geven/)
  })

  it('links to the page of the game when there is no button', () => {
    const html = renderToStaticMarkup(<UitblinkerCard {...uitblinkerCardData(open, undefined, now)} />)

    expect(html).toContain('<a href="/fans/uitblinker">Naar de <span class="hf-icon-tail">Uitblinker<svg')
    expect(html).not.toContain('<button')
  })

  it('shows the seal of the last Uitblinker and the number of supporters, for everyone', () => {
    const html = renderToStaticMarkup(
      <UitblinkerCard
        {...uitblinkerCardData(open, undefined, now)}
        result={{
          supporters: 31,
          winner: { average: '7,8', line: 'Thuis tegen Sparta Rotterdam, 3–1', name: 'Dylan Vente' },
        }}
      />,
    )

    expect(html).toContain('Uitblinker vorige wedstrijd')
    expect(html).toContain('Dylan Vente')
    expect(html).toContain('Thuis tegen Sparta Rotterdam, 3–1')
    expect(html).toContain('31 fans gaven cijfers.')
  })

  it('has the number but no seal when nobody had five grades, and nothing when there is no result', () => {
    const none = renderToStaticMarkup(<UitblinkerCard {...uitblinkerCardData(open, undefined, now)} />)
    const thin = renderToStaticMarkup(
      <UitblinkerCard {...uitblinkerCardData(open, undefined, now)} result={{ supporters: 3 }} />,
    )

    expect(none).not.toContain('hf-winner')
    expect(none).not.toContain('fans gaven')
    expect(thin).not.toContain('hf-winner')
    expect(thin).toContain('3 fans gaven cijfers.')
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
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    vi.stubEnv('FANS_UITBLINKER', 'on')
    findRatingWindow.mockResolvedValue(open)
    findOwnRatings.mockResolvedValue(new Map())
    latestResult.mockResolvedValue(latest)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetAllMocks()
  })

  it('adds the Uitblinker of the last match with a result, the same for a visitor and a supporter', async () => {
    const expected = {
      supporters: 31,
      winner: { average: '7,8', line: 'Thuis tegen Sparta Rotterdam, 3–1', name: 'Dylan Vente' },
    }

    expect((await readUitblinkerCard(undefined, now))?.result).toEqual(expected)
    expect((await readUitblinkerCard({ createdAt: before, id: 5 }, now))?.result).toEqual(expected)
  })

  it('has no result, and so no seal, while no window has closed', async () => {
    latestResult.mockResolvedValue(undefined)

    expect((await readUitblinkerCard(undefined, now))?.result).toBeUndefined()
  })

  it('has no seal but the number when nobody had five grades', async () => {
    latestResult.mockResolvedValue({ ...latest, ratings: { players: [], supporters: 3 } })

    expect((await readUitblinkerCard(undefined, now))?.result).toEqual({ supporters: 3 })
  })

  it('has no card while the game is off, and reads nothing', async () => {
    vi.stubEnv('FANS_UITBLINKER', 'off')

    expect(await readUitblinkerCard(undefined, now)).toBeUndefined()
    expect(latestResult).not.toHaveBeenCalled()
  })

  it('leaves the card out and logs when the reading fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    latestResult.mockRejectedValue(new Error('database down'))

    expect(await readUitblinkerCard(undefined, now)).toBeUndefined()
  })
})
