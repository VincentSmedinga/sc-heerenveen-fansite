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
    oldRatings: [],
    oldWinners: [{ name: 'Speler A', playerId: null, season: '2005/06' }],
    overSeasons: new Set(),
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

  it('has one h1 and a table with the running season and the winners that were typed over', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    vi.stubEnv('FANS_UITBLINKER', 'on')
    const html = renderToStaticMarkup(await YearWinnersPage())

    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain('Na het seizoen')
    expect(html).toContain('Speler A')
    expect(html.indexOf('2026/27')).toBeLessThan(html.indexOf('2005/06'))
  })

  it('shows nothing but the running season when the list of names is empty', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    vi.stubEnv('FANS_UITBLINKER', 'on')
    ratingFigures.mockResolvedValue({ figures: [], oldRatings: [], oldWinners: [], overSeasons: new Set() })
    const html = renderToStaticMarkup(await YearWinnersPage())

    expect(html).toContain('Na het seizoen')
    expect(html).not.toContain('2005/06')
  })

  it('is not indexed', () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    vi.stubEnv('FANS_UITBLINKER', 'on')

    expect(generateMetadata()).toMatchObject({ robots: { index: false } })
  })
})
