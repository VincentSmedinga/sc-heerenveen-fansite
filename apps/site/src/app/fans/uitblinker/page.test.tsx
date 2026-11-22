import type * as React from 'react'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RatingMatch, RatingPlayer, RatingWindow } from '#src/fans/rating'

import RatingPage from './page'

const { currentSupporter, findOwnRatings, findRatingWindow, useActionState } = vi.hoisted(() => ({
  currentSupporter: vi.fn(),
  findOwnRatings: vi.fn(),
  findRatingWindow: vi.fn(),
  useActionState: vi.fn(),
}))

vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<typeof React>()), useActionState }))
vi.mock('./actions', () => ({ saveRatingsAction: vi.fn() }))
vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/fans/require-supporter', () => ({ currentSupporter }))
vi.mock('#src/fans/rating', async (importOriginal) => ({
  ...(await importOriginal<object>()),
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
const open: RatingWindow = { ...base, players, state: 'open' }
const supporter = { createdAt: new Date('2026-10-01T00:00:00Z'), disabledAt: null, id: 5 }

async function render(search: Record<string, string> = {}) {
  return renderToStaticMarkup(await RatingPage({ searchParams: Promise.resolve(search) }))
}

beforeEach(() => {
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_UITBLINKER', 'on')
  currentSupporter.mockResolvedValue(undefined)
  findOwnRatings.mockResolvedValue(new Map())
  findRatingWindow.mockResolvedValue(open)
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
    findRatingWindow.mockResolvedValue({ ...base, players, state: 'closed' })

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
