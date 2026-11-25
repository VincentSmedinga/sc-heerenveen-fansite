import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import StandPage from './page'

const { matchRanking, rankedMatches } = vi.hoisted(() => ({ matchRanking: vi.fn(), rankedMatches: vi.fn() }))

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`)
  },
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('#src/fans/require-supporter', () => ({ currentSupporter: async () => undefined }))
vi.mock('#src/fans/prediction-ranking', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  matchRanking,
  rankedMatches,
  rankedSeasons: async () => [],
  seasonRanking: vi.fn(),
}))

const match = { away: 'Testdorp FC', awayGoals: 0, home: 'sc Heerenveen', homeGoals: 1, id: 7, matchDate: '2026-11-18' }
const render = async (query: Record<string, string> = {}) =>
  renderToStaticMarkup(await StandPage({ searchParams: Promise.resolve(query) }))

beforeEach(() => {
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_PROGNOSE', 'on')
  rankedMatches.mockResolvedValue([match])
  matchRanking.mockResolvedValue({ counted: 0, matchCount: 1, rows: [] })
})

describe('the switch of Stand Prognose', () => {
  it('is two links in one switch with a name, the chosen one marked', async () => {
    const season = await render()

    expect(season).toContain('aria-label="Weergave van de stand"')
    expect(season).toMatch(/<a[^>]*aria-current="[^"]+"[^>]*>(?:<[^>]+>)*Seizoen/)
    expect(season).toContain('href="/fans/prognose/stand?wedstrijd=7"')

    expect(await render({ wedstrijd: '7' })).toMatch(/<a[^>]*aria-current="[^"]+"[^>]*>(?:<[^>]+>)*Per wedstrijd/)
  })

  it('says that nothing was predicted without a played match with predictions', async () => {
    rankedMatches.mockResolvedValue([])

    expect(await render({ wedstrijd: '7' })).toContain('Voor deze wedstrijd is nog niets voorspeld.')
  })
})
