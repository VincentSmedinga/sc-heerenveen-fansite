import type * as React from 'react'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RatingMatch, RatingPlayer, RatingWindow } from '#src/fans/rating'

import RatingPage from './page'

const {
  currentSupporter,
  fansMatchRatings,
  findOwnCoachRating,
  findOwnRatings,
  findRatingWindow,
  loadRunningCoachRating,
  loadRunningRatings,
  seasonWinners,
  useActionState,
} = vi.hoisted(() => ({
  currentSupporter: vi.fn(),
  fansMatchRatings: vi.fn(),
  findOwnCoachRating: vi.fn(),
  findOwnRatings: vi.fn(),
  findRatingWindow: vi.fn(),
  loadRunningCoachRating: vi.fn(),
  loadRunningRatings: vi.fn(),
  seasonWinners: vi.fn(),
  useActionState: vi.fn(),
}))

vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<typeof React>()), useActionState }))
vi.mock('./actions', () => ({ saveRatingsAction: vi.fn() }))
vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/fans/match-ratings', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fansMatchRatings,
  loadRunningCoachRating,
  loadRunningRatings,
  seasonWinners,
}))
vi.mock('#src/fans/require-supporter', () => ({ currentSupporter }))
vi.mock('#src/fans/rating', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findOwnCoachRating,
  findOwnRatings,
  findRatingWindow,
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`)
  },
}))

const match: RatingMatch = {
  clubSlug: 'sparta-rotterdam',
  competition: 'Eredivisie',
  dateText: null,
  extraTime: false,
  goalsAgainst: 1,
  goalsFor: 3,
  home: true,
  id: 1,
  kickoffAt: new Date('2026-11-21T19:45:00Z'),
  matchDate: '2026-11-21',
  opponent: 'Sparta Rotterdam',
  round: 'Speelronde 14',
  season: '2026/27',
  status: 'played',
}
const next: RatingMatch = {
  ...match,
  goalsAgainst: null,
  goalsFor: null,
  id: 2,
  kickoffAt: new Date('2026-11-28T19:45:00Z'),
  matchDate: '2026-11-28',
  opponent: 'FC Twente',
  status: 'scheduled',
}
const players: RatingPlayer[] = [
  { appearanceId: 11, assist: false, goal: false, minutes: 90, name: 'Luca Oyen', position: 'doelman' },
  { appearanceId: 12, assist: false, goal: true, minutes: 75, name: 'Pim Spits', position: 'aanvaller' },
]
const base = {
  closesAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  match,
  next,
  startsAt: match.kickoffAt as Date,
}
const open: RatingWindow = { ...base, coach: null, players, state: 'open' }
const coach = { name: 'Robin Veldman', staffId: 3 }
const supporter = { createdAt: new Date('2026-10-01T00:00:00Z'), disabledAt: null, id: 5 }

async function render(search: Record<string, string> = {}) {
  return renderToStaticMarkup(await RatingPage({ searchParams: Promise.resolve(search) }))
}

beforeEach(() => {
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_UITBLINKER', 'on')
  currentSupporter.mockResolvedValue(undefined)
  fansMatchRatings.mockResolvedValue(undefined)
  findOwnRatings.mockResolvedValue(new Map())
  findOwnCoachRating.mockResolvedValue(undefined)
  findRatingWindow.mockResolvedValue(open)
  loadRunningRatings.mockResolvedValue([])
  loadRunningCoachRating.mockResolvedValue(undefined)
  seasonWinners.mockResolvedValue([])
  useActionState.mockImplementation((_action: unknown, state: unknown) => [state, vi.fn()])
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetAllMocks()
})

describe('the page of the Uitblinker', () => {
  it('answers "not found" while the game is off, and while accounts are off', async () => {
    vi.stubEnv('FANS_UITBLINKER', 'off')
    await expect(render()).rejects.toThrow('NEXT_NOT_FOUND')

    vi.stubEnv('FANS_UITBLINKER', 'on')
    vi.stubEnv('FANS_ACCOUNTS', 'off')
    await expect(render()).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('sends a blocked account to the page that says so', async () => {
    currentSupporter.mockResolvedValue({ ...supporter, disabledAt: new Date() })

    await expect(render()).rejects.toThrow('redirect to /fans/geblokkeerd')
  })

  it('has one h1, the card with the form in the wide column and "Zo werkt het" in the narrow one', async () => {
    currentSupporter.mockResolvedValue(supporter)

    const html = await render()

    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toMatch(/<h2[^>]*>Geef je cijfers<\/h2>/)
    expect(html.indexOf('Geef je cijfers')).toBeLessThan(html.indexOf('Zo werkt het'))
    expect(html).toContain('<form')
    expect(html.match(/type="radio"/g)).toHaveLength(20)
  })

  it('shows a visitor the card Doe mee and no form', async () => {
    const html = await render()

    expect(html).toMatch(/<h2[^>]*>Doe mee<\/h2>/)
    expect(html).not.toContain('type="radio"')
    expect(html).not.toContain('Cijfers opslaan')
  })

  it('tells an account that was made after the match began that it takes part from the next one', async () => {
    currentSupporter.mockResolvedValue({ ...supporter, createdAt: new Date('2026-11-22T00:00:00Z') })

    const html = await render()

    expect(html).toContain('Je doet mee vanaf de volgende wedstrijd.')
    expect(html).not.toContain('type="radio"')
  })

  it('shows what was saved, with the button Wijzigen, once every player has a grade', async () => {
    currentSupporter.mockResolvedValue(supporter)
    findOwnRatings.mockResolvedValue(
      new Map([
        [11, 6],
        [12, 8],
      ]),
    )

    const html = await render({ opgeslagen: '1' })

    expect(html).toContain('Wijzigen</button>')
    expect(html).toMatch(/<h2[^>]*>Je cijfers staan<\/h2>/)
    expect(html).toContain('Jouw cijfers')
    expect(html).not.toContain('type="radio"')
  })

  it('shows the form again with the saved grades when the supporter wants to change them', async () => {
    currentSupporter.mockResolvedValue(supporter)
    findOwnRatings.mockResolvedValue(
      new Map([
        [11, 6],
        [12, 8],
      ]),
    )
    useActionState.mockImplementation((_action: unknown, state: unknown) => [state, vi.fn()])

    const html = await render({ wijzigen: '1' })

    expect(html.match(/type="radio"/g)).toHaveLength(20)
    expect(html).toMatch(/<h2[^>]*>Geef je cijfers<\/h2>/)
    expect(html.match(/checked/g)).toHaveLength(2)
    expect(html).toContain('Cijfers opslaan')
  })

  it('shows the form, and not the saved view, while one player still has no grade', async () => {
    currentSupporter.mockResolvedValue(supporter)
    findOwnRatings.mockResolvedValue(new Map([[11, 6]]))

    const html = await render()

    expect(html).toContain('Cijfers opslaan')
    expect(html).not.toContain('Jouw cijfers')
  })

  it('adds the coach to the form, and shows the saved view only once he has a grade too', async () => {
    currentSupporter.mockResolvedValue(supporter)
    findRatingWindow.mockResolvedValue({ ...open, coach })
    findOwnRatings.mockResolvedValue(
      new Map([
        [11, 6],
        [12, 8],
      ]),
    )

    const form = await render()

    expect(form.match(/type="radio"/g)).toHaveLength(30)
    expect(form).toContain('Robin Veldman')
    expect(form).toContain('Cijfers opslaan')
    expect(form).toContain('en de trainer')

    findOwnCoachRating.mockResolvedValue(9)

    const saved = await render()

    expect(saved).toContain('Robin Veldman (trainer)')
    expect(saved).toContain('Je cijfers staan')
    expect(saved).not.toContain('type="radio"')
  })

  it('has no group for a coach when the match has none', async () => {
    currentSupporter.mockResolvedValue(supporter)

    const html = await render()

    expect(html).not.toContain('Trainer')
    expect(findOwnCoachRating).not.toHaveBeenCalled()
  })

  it('has no form and the tag "Nog niet open" while the report is not finished', async () => {
    currentSupporter.mockResolvedValue(supporter)
    findRatingWindow.mockResolvedValue({ ...base, state: 'waiting' })

    const html = await render()

    expect(html).toContain('Nog niet open')
    expect(html).toContain('Het verslag van deze wedstrijd is nog niet af.')
    expect(html).not.toContain('<form')
  })

  it('has no form and the card "Volgende wedstrijd" when the window is closed', async () => {
    currentSupporter.mockResolvedValue(supporter)
    findRatingWindow.mockResolvedValue({ ...base, coach: null, players, state: 'closed' })

    const html = await render()

    expect(html).toMatch(/<h2[^>]*>Volgende wedstrijd<\/h2>/)
    expect(html).toContain('Na sc Heerenveen – FC Twente (zaterdag 28 november)')
    expect(html).not.toContain('<form')
  })

  it('says it without a date when the next match is not known', async () => {
    findRatingWindow.mockResolvedValue({ state: 'none' })

    const html = await render()

    expect(html).toContain('De volgende wedstrijd is nog niet bekend.')
  })
})

const running = (appearanceId: number, name: string, average: number, count: number) => ({
  appearanceId,
  average,
  count,
  name,
  playerId: appearanceId,
})

describe('the standing so far', () => {
  const grades = new Map([
    [11, 6],
    [12, 8],
  ])

  beforeEach(() => {
    loadRunningRatings.mockResolvedValue([running(11, 'Luca Oyen', 7.3, 12), running(12, 'Pim Spits', 8.5, 3)])
  })

  it('shows a supporter who gave every grade the column Gem, with the Uitblinker marked', async () => {
    currentSupporter.mockResolvedValue(supporter)
    findOwnRatings.mockResolvedValue(grades)

    const html = await render()

    expect(html).toContain('Jouw cijfers en de tussenstand')
    expect(html).toContain('7,3')
    expect(html).toContain('nog te weinig cijfers')
    expect((html.match(/<table[\s\S]*?<\/table>/)?.[0] ?? '').match(/>Uitblinker</g)).toHaveLength(1)
    expect(loadRunningRatings).toHaveBeenCalledOnce()
  })

  it('shows nothing of it to a supporter who has not given every grade, or to a visitor', async () => {
    currentSupporter.mockResolvedValue(supporter)
    findOwnRatings.mockResolvedValue(new Map([[11, 6]]))

    const partly = await render()

    currentSupporter.mockResolvedValue(undefined)

    const visitor = await render()

    for (const html of [partly, visitor]) {
      expect(html).not.toContain('7,3')
      expect(html).not.toContain('nog te weinig cijfers')
    }

    expect(loadRunningRatings).not.toHaveBeenCalled()
  })

  it('shows nothing of it while the supporter changes the grades', async () => {
    currentSupporter.mockResolvedValue(supporter)
    findOwnRatings.mockResolvedValue(grades)

    expect(await render({ wijzigen: '1' })).not.toContain('7,3')
  })
})

describe('the result of a closed window', () => {
  const closed: RatingWindow = { ...base, coach: null, players, state: 'closed' }
  const result = {
    players: [running(11, 'Luca Oyen', 7.3, 12), running(12, 'Pim Spits', 8.5, 3)],
    supporters: 12,
    winner: running(11, 'Luca Oyen', 7.3, 12),
  }

  it('shows everyone the seal and the table under the card for the next match', async () => {
    findRatingWindow.mockResolvedValue(closed)
    fansMatchRatings.mockResolvedValue(result)

    const html = await render()

    expect(html.indexOf('Volgende wedstrijd')).toBeLessThan(html.indexOf('Uitslag van de laatste wedstrijd'))
    expect(html).toContain('Uitblinker van de wedstrijd')
    expect(html).toContain('12 fans gaven cijfers.')
    expect(currentSupporter).toHaveBeenCalled()
  })

  it('has no result card when nobody rated, or while the window is open', async () => {
    findRatingWindow.mockResolvedValue(closed)

    expect(await render()).not.toContain('Uitslag van de laatste wedstrijd')

    findRatingWindow.mockResolvedValue(open)
    fansMatchRatings.mockResolvedValue(result)

    expect(await render()).not.toContain('Uitslag van de laatste wedstrijd')
  })
})

describe('the card Uitblinkers of the season', () => {
  const winners = [
    {
      average: 7.8,
      goalsAgainst: 1,
      goalsFor: 3,
      home: true,
      matchId: 1,
      name: 'Dylan Vente',
      opponent: 'Sparta Rotterdam',
    },
  ]

  it('stands in the narrow column before "Zo werkt het", for everyone', async () => {
    seasonWinners.mockResolvedValue(winners)

    const html = await render()

    expect(html).toMatch(/<h2[^>]*>Uitblinkers 2026\/27<\/h2>/)
    expect(html.indexOf('Uitblinkers 2026/27')).toBeLessThan(html.indexOf('Zo werkt het'))
    expect(seasonWinners).toHaveBeenCalledWith('2026/27')
  })

  it('is not there for a season without an Uitblinker, or before any match was played', async () => {
    expect(await render()).not.toContain('Uitblinkers 2026/27')

    findRatingWindow.mockResolvedValue({ state: 'none' })

    expect(await render()).not.toContain('Uitblinkers')
    expect(seasonWinners).not.toHaveBeenCalledWith(undefined)
  })

  it('is the same for a supporter and a visitor', async () => {
    seasonWinners.mockResolvedValue(winners)
    currentSupporter.mockResolvedValue(supporter)

    const own = await render()

    currentSupporter.mockResolvedValue(undefined)

    expect(await render()).toContain('Dylan Vente')
    expect(own).toContain('Dylan Vente')
  })
})
