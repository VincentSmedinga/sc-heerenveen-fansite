import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PredictionMatch } from './fans/prediction'

import { predictionMatches } from './fans/prediction'
import { deadlineOfSentence, FansCard, loadOpenGames, prognoseRow } from './FansCard'

vi.mock('./database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('./fans/prediction', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  predictionMatches: vi.fn(),
}))

// Friday 20 November 2026, noon in the Netherlands.
const now = new Date('2026-11-20T11:00:00Z')

const match = (overrides: Partial<PredictionMatch> = {}): PredictionMatch => ({
  clubSlug: 'fc-twente',
  competition: 'Eredivisie',
  dateText: null,
  home: true,
  id: 1,
  kickoffAt: new Date('2026-11-21T15:45:00Z'),
  matchDate: '2026-11-21',
  opponent: 'FC Twente',
  round: '14',
  season: '2026/27',
  status: 'scheduled',
  ...overrides,
})

beforeEach(() => {
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_PROGNOSE', 'on')
  vi.mocked(predictionMatches).mockReset()
  vi.mocked(predictionMatches).mockResolvedValue({ next: match() })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('the words of the deadline', () => {
  it('names the weekday and the time within six days, in Dutch time', () => {
    expect(deadlineOfSentence(new Date('2026-11-21T15:45:00Z'), now)).toBe('zaterdag 16.45 uur')
  })

  it('adds the date when the kick-off is six days away or more', () => {
    expect(deadlineOfSentence(new Date('2026-11-28T15:45:00Z'), now)).toBe('zaterdag 28 november, 16.45 uur')
    expect(deadlineOfSentence(new Date('2026-12-05T15:45:00Z'), now)).toBe('zaterdag 5 december, 16.45 uur')
  })
})

describe('the row of the Prognose', () => {
  it('says the clubs in the order of the match and the deadline, with a link named by the match', () => {
    expect(prognoseRow(match(), now)).toEqual({
      href: '/fans/prognose',
      link: 'Voorspel',
      linkName: 'Voorspel sc Heerenveen – FC Twente',
      name: 'Prognose',
      sentence: 'Voorspel sc Heerenveen – FC Twente. Kan tot zaterdag 16.45 uur.',
    })
    expect(prognoseRow(match({ home: false }), now)?.sentence).toBe(
      'Voorspel FC Twente – sc Heerenveen. Kan tot zaterdag 16.45 uur.',
    )
  })

  it('has no row without a known kick-off', () => {
    expect(prognoseRow(match({ kickoffAt: null }), now)).toBeUndefined()
  })
})

describe('the games that are open', () => {
  it('lists the Prognose while its form is open', async () => {
    expect(await loadOpenGames(now)).toHaveLength(1)
  })

  it('lists nothing when the Prognose is off', async () => {
    vi.stubEnv('FANS_PROGNOSE', 'off')

    expect(await loadOpenGames(now)).toEqual([])
  })

  it('lists nothing when accounts are off', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'off')

    expect(await loadOpenGames(now)).toEqual([])
    expect(predictionMatches).not.toHaveBeenCalled()
  })

  it('lists nothing when there is no match, or its kick-off is not known or has been', async () => {
    vi.mocked(predictionMatches).mockResolvedValue({})
    expect(await loadOpenGames(now)).toEqual([])

    vi.mocked(predictionMatches).mockResolvedValue({ next: match({ kickoffAt: null }) })
    expect(await loadOpenGames(now)).toEqual([])

    vi.mocked(predictionMatches).mockResolvedValue({ next: match({ kickoffAt: new Date('2026-11-20T10:00:00Z') }) })
    expect(await loadOpenGames(now)).toEqual([])
  })

  it('drops the row after the kick-off and shows the next match once the form opens for it', async () => {
    const first = match({ id: 1, kickoffAt: new Date('2026-11-21T15:45:00Z') })
    const second = match({ id: 2, kickoffAt: new Date('2026-11-28T15:45:00Z'), opponent: 'Ajax' })
    const afterFirst = new Date('2026-11-21T16:00:00Z')

    vi.mocked(predictionMatches).mockResolvedValueOnce({ next: first })
    expect((await loadOpenGames(now))[0]?.sentence).toContain('FC Twente')

    // The rule of the form: after the kick-off of the first, the next match is the one open.
    vi.mocked(predictionMatches).mockResolvedValueOnce({ next: second, started: first })
    expect((await loadOpenGames(afterFirst))[0]?.sentence).toBe(
      'Voorspel sc Heerenveen – Ajax. Kan tot zaterdag 28 november, 16.45 uur.',
    )

    vi.mocked(predictionMatches).mockResolvedValueOnce({ started: first })
    expect(await loadOpenGames(afterFirst)).toEqual([])
  })

  it('lists nothing and logs when the match can not be read', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(predictionMatches).mockRejectedValue(new Error('Failed query'))

    expect(await loadOpenGames(now)).toEqual([])
    expect(log).toHaveBeenCalledOnce()
  })
})

describe('the card Fans', () => {
  it('has an h2 and a row with the link to the game, on the soft surface and without a watermark', async () => {
    const html = renderToStaticMarkup(<FansCard items={await loadOpenGames(now)} />)

    expect(html).toContain('<h2 class="hf-heading-2" id="fans-heading">Fans</h2>')
    expect(html).toContain('hf-card-soft')
    expect(html).not.toContain('hf-card-game')
    expect(html).toContain('aria-label="Voorspel sc Heerenveen – FC Twente"')
    expect(html).toContain('href="/fans/prognose"')
  })

  it('is no card and no empty place without a row', () => {
    expect(renderToStaticMarkup(<FansCard items={[]} />)).toBe('')
  })

  it('has nothing of the visitor in it: the same card for every visitor', async () => {
    const items = await loadOpenGames(now)

    expect(renderToStaticMarkup(<FansCard items={items} />)).toBe(renderToStaticMarkup(<FansCard items={items} />))
    expect(JSON.stringify(items)).not.toMatch(/supporter|cookie|sessie/i)
  })
})
