import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import YearWinnersPage, { generateMetadata } from './page'

const { ratingFigures } = vi.hoisted(() => ({ ratingFigures: vi.fn() }))

vi.mock('#src/fans/season-ratings', async (importOriginal) => ({ ...(await importOriginal<object>()), ratingFigures }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-22T12:00:00Z'))
  ratingFigures.mockReset()
  ratingFigures.mockResolvedValue({
    figures: [],
    oldRatings: [{ average: 7.1, name: 'Speler A', playerId: null, season: '2000/01' }],
    overSeasons: new Set(['2000/01']),
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('the page Uitblinker van het jaar', () => {
  it('answers "not found" while the Uitblinker is switched off, and does not read the database', async () => {
    vi.stubEnv('FANS_UITBLINKER', 'off')

    await expect(YearWinnersPage()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(() => generateMetadata()).toThrow('NEXT_NOT_FOUND')
    expect(ratingFigures).not.toHaveBeenCalled()
  })

  it('has one h1, a card for the running season and for the winner that the season rating gives, and the card of the best of all years', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    vi.stubEnv('FANS_UITBLINKER', 'on')
    const html = renderToStaticMarkup(await YearWinnersPage())

    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain('Na het seizoen')
    expect(html).toContain('Speler A')
    expect(html.indexOf('Uitblinker 2026/27')).toBeLessThan(html.indexOf('Uitblinker 2000/01'))
    expect(html).not.toContain('<table')
    expect(html).toContain('Uitblinker van de Uitblinkers')
    expect(html).toContain('Tot 2006/07: cijfers van bezoekers van de Fansite.')
    // On a phone the card of the best of all years stands before the cards of the years.
    expect(html.indexOf('Uitblinker van de Uitblinkers')).toBeLessThan(html.indexOf('Uitblinker 2026/27'))
  })

  it('shows nothing but the running season while no season has ratings', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    vi.stubEnv('FANS_UITBLINKER', 'on')
    ratingFigures.mockResolvedValue({ figures: [], oldRatings: [], overSeasons: new Set() })
    const html = renderToStaticMarkup(await YearWinnersPage())

    expect(html).toContain('Na het seizoen')
    expect(html).not.toContain('Uitblinker 2000/01')
    expect(html).not.toContain('Uitblinker van de Uitblinkers')
  })

  it('is not indexed', () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    vi.stubEnv('FANS_UITBLINKER', 'on')

    expect(generateMetadata()).toMatchObject({ robots: { index: false } })
  })
})
