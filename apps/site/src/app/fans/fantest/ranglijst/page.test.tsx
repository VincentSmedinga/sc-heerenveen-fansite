import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import RankingPage, { generateMetadata } from './page'

const { currentSupporter, monthScores } = vi.hoisted(() => ({ currentSupporter: vi.fn(), monthScores: vi.fn() }))

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/fans/require-supporter', () => ({ currentSupporter }))
vi.mock('#src/fans/fantest-ranking', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  monthScores,
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`)
  },
}))

const score = (supporterId: number, month: number, points: number, year = 2027) => ({
  month,
  score: points,
  screenName: `fan${String(supporterId).padStart(2, '0')}`,
  supporterId,
  year,
})

const render = async (parameters: Record<string, string> = {}) =>
  renderToStaticMarkup(await RankingPage({ searchParams: Promise.resolve(parameters) }))

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2027-03-15T12:00:00Z') })
  currentSupporter.mockResolvedValue(undefined)
  monthScores.mockResolvedValue([score(1, 1, 7), score(2, 1, 9), score(1, 2, 8), score(3, 5, 4, 2026)])
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_FANTEST', 'on')
  vi.stubEnv('SITE_ENV', 'local')
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('the ranking of the Fantest', () => {
  it('shows a visitor the running year as a table with a caption, the place first', async () => {
    const html = await render()

    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain('Stand van 2027 na 2 quizzen')
    expect(html).toMatch(/<caption[^>]*>/)
    expect(html).toMatch(/<th[^>]*scope="col"/)
    expect(html).toContain('title="Punten"')
    expect(html).toContain('7,5')
    expect(html.indexOf('>fan01<')).toBeLessThan(html.indexOf('>fan02<'))
    expect(html).not.toContain('fan03')
    expect(html).not.toContain('Jij')
  })

  it('has an area for the link back, so the link stands above the heading', async () => {
    const html = await render()

    expect(html).toMatch(/back back/)
  })

  it('shows the latest closed month, and another on request', async () => {
    expect(await render()).toContain('Scores van februari 2027')
    expect(await render({ jaar: '2027', maand: '2027-01' })).toContain('Scores van januari 2027')
  })

  it('names the month in sight, also when the year has only one closed month', async () => {
    monthScores.mockResolvedValue([score(1, 1, 7)])
    const html = await render()

    expect(html).toMatch(/<h2[^>]*>Scores van januari 2027<\/h2>/)
    expect(html).toMatch(/<h2[^>]*>Stand 2027<\/h2>/)
    expect(html).not.toContain('<form action="/fans/fantest/ranglijst" method="get"><input')
    expect(html).not.toContain('niet verplicht')
  })

  it('shows an earlier year on request, and the running year for a made-up one', async () => {
    const html = await render({ jaar: '2026' })

    expect(html).toContain('Stand van 2026 na 1 quiz')
    expect(html).toContain('Scores van mei 2026')
    expect(await render({ jaar: '1990', maand: 'onzin' })).toContain('Stand van 2027')
  })

  it('says so in a year without a closed month, and keeps the earlier years to choose', async () => {
    monthScores.mockResolvedValue([score(3, 5, 4, 2026)])
    const html = await render()

    expect(html).toContain('Van 2027 is er nog niets te tonen.')
    expect(html).toContain('value="2026"')
    expect(html).not.toContain('<table')
  })

  it('marks the own row in words', async () => {
    currentSupporter.mockResolvedValue({ disabledAt: null, id: 2 })
    const html = await render()

    expect(html.match(/Jij/g)).toHaveLength(1)
  })

  it('shows the own row under the first fifty', async () => {
    monthScores.mockResolvedValue(Array.from({ length: 60 }, (_, index) => score(index + 1, 1, 60 - index)))
    currentSupporter.mockResolvedValue({ disabledAt: null, id: 57 })
    const html = await render()

    expect(html).toContain('fan50')
    expect(html).not.toContain('fan51<')
    expect(html).toContain('fan57')
    expect(html).toContain('andere fans')
  })

  it('sends a blocked account to the page that says so', async () => {
    currentSupporter.mockResolvedValue({ disabledAt: new Date(), id: 2 })

    await expect(render()).rejects.toThrow('NEXT_REDIRECT /fans/geblokkeerd')
  })

  it('is "not found" with the Fantest off', async () => {
    vi.stubEnv('FANS_FANTEST', 'off')

    await expect(render()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(() => generateMetadata()).toThrow('NEXT_NOT_FOUND')
  })
})
