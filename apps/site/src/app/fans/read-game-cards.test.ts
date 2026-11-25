import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PredictionMatch } from '#src/fans/prediction'

import { readFantestCard, readFjouwerCard, readPrognoseCard } from './read-game-cards'

const mocks = vi.hoisted(() => ({
  cachedStanding: vi.fn(),
  countedPredictions: vi.fn(),
  countFours: vi.fn(),
  countParticipants: vi.fn(),
  findEntry: vi.fn(),
  findPrediction: vi.fn(),
  fjouwerRanking: vi.fn(),
  fjouwerSeasons: vi.fn(),
  fjouwerSquad: vi.fn(),
  fjouwerState: vi.fn(),
  loadMonthQuiz: vi.fn(),
  monthScores: vi.fn(),
  predictionRanking: vi.fn(),
  predictionSeasons: vi.fn(),
  readOpenGame: vi.fn(),
  supporterFours: vi.fn(),
}))

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/fans/open-games', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  readOpenGame: mocks.readOpenGame,
}))
vi.mock('#src/fans/game-counts', () => ({
  countFours: mocks.countFours,
  countParticipants: mocks.countParticipants,
}))
vi.mock('#src/fans/prediction-crowd', () => ({ countedPredictions: mocks.countedPredictions }))
vi.mock('#src/fans/prediction', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findPrediction: mocks.findPrediction,
}))
vi.mock('#src/fans/prediction-ranking', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  rankedSeasons: mocks.predictionSeasons,
  seasonRanking: mocks.predictionRanking,
}))
vi.mock('#src/fans/fjouwer-ranking', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  rankedSeasons: mocks.fjouwerSeasons,
  seasonRanking: mocks.fjouwerRanking,
}))
vi.mock('#src/fans/fjouwer', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fjouwerSquad: mocks.fjouwerSquad,
  fjouwerState: mocks.fjouwerState,
}))
vi.mock('#src/fans/fjouwer-points', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  cachedStanding: mocks.cachedStanding,
  supporterFours: mocks.supporterFours,
}))
vi.mock('#src/fans/fantest-entry', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findEntry: mocks.findEntry,
  loadMonthQuiz: mocks.loadMonthQuiz,
}))
vi.mock('#src/fans/fantest-ranking', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  monthScores: mocks.monthScores,
}))

// Friday 20 November 2026, noon in the Netherlands.
const now = new Date('2026-11-20T11:00:00Z')
const supporter = { createdAt: new Date('2026-09-01T00:00:00Z'), disabledAt: null, id: 5 }
const blocked = { ...supporter, disabledAt: new Date('2026-11-01T00:00:00Z') }
const match: PredictionMatch = {
  clubSlug: 'fc-twente',
  competition: 'Eredivisie',
  dateText: null,
  home: true,
  id: 9,
  kickoffAt: new Date('2026-11-21T15:45:00Z'),
  matchDate: '2026-11-21',
  opponent: 'FC Twente',
  round: 'Speelronde 14',
  season: '2026/27',
  status: 'scheduled',
}

// Four fans: the third and fourth share the third place.
const ranked = [
  [1, 'Tjalle99', 212, 1],
  [5, 'Pompebled', 198, 2],
  [7, 'Blauwwit', 190, 3],
  [8, 'Sjoerd', 190, 3],
] as const
const predictionRows = ranked.map(([supporterId, screenName, total, place]) => ({
  average: 1,
  count: 1,
  place,
  screenName,
  supporterId,
  total,
}))
const fourRows = ranked.map(([supporterId, screenName, total, place]) => ({
  matches: 1,
  place,
  screenName,
  supporterId,
  total,
}))

beforeEach(() => {
  mocks.readOpenGame.mockImplementation((game: string) => Promise.resolve({ closesAt: match.kickoffAt, game, match }))
  mocks.countedPredictions.mockResolvedValue(Array.from({ length: 48 }))
  mocks.countFours.mockResolvedValue(87)
  mocks.countParticipants.mockResolvedValue(12)
  mocks.predictionSeasons.mockResolvedValue(['2026/27'])
  mocks.predictionRanking.mockResolvedValue({ counted: 4, matchCount: 1, rows: predictionRows })
  mocks.fjouwerSeasons.mockResolvedValue(['2026/27'])
  mocks.fjouwerRanking.mockResolvedValue({ hidden: new Map(), matchCount: 1, rows: fourRows })
  mocks.fjouwerSquad.mockResolvedValue(
    ['Jansen', 'Veerman', 'Dijkstra', 'Hansen'].map((surname, index) => ({ id: index + 1, surname })),
  )
  mocks.fjouwerState.mockResolvedValue({ four: [], inherited: false, notCounting: [], saved: false })
  mocks.supporterFours.mockResolvedValue([])
  mocks.loadMonthQuiz.mockResolvedValue({ id: 3, month: 11, questions: Array.from({ length: 10 }), year: 2026 })
  mocks.monthScores.mockResolvedValue(
    ranked.map(([supporterId, screenName, score]) => ({ month: 10, score, screenName, supporterId, year: 2026 })),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

const headers = (card: Awaited<ReturnType<typeof readPrognoseCard>>) => card?.ranking?.rows.map((row) => row.header)
const marked = (card: Awaited<ReturnType<typeof readPrognoseCard>>) =>
  card?.ranking?.rows.filter((row) => row.highlight === true).map((row) => row.header)

describe('the card of the Prognose', () => {
  it('shows a visitor the open match, the count and the top three, and nothing of anybody', async () => {
    const card = await readPrognoseCard(undefined, now)

    expect(card).toMatchObject({
      action: { href: '/fans/prognose', label: 'Naar de Prognose', type: 'link' },
      lines: ['48 fans voorspelden al.'],
      match: { opponent: 'FC Twente' },
      ranking: { caption: 'Stand 2026/27' },
      tag: { text: 'Open tot za 16.45', tone: 'open' },
    })
    expect(headers(card)).toEqual(['Tjalle99', 'Pompebled', 'Blauwwit'])
    expect(marked(card)).toEqual([])
    expect(card?.mine).toBeUndefined()
    expect(mocks.findPrediction).not.toHaveBeenCalled()
  })

  it('has a button and "Nog te doen" for a supporter who has not predicted, and marks their row', async () => {
    const card = await readPrognoseCard(supporter, now)

    expect(card?.tag).toEqual({ text: 'Nog te doen', tone: 'todo' })
    expect(card?.action).toEqual({ href: '/fans/prognose', label: 'Voorspellen', type: 'button' })
    expect(marked(card)).toEqual(['Pompebled'])
  })

  it('shows the prediction and the link to change it once there is one', async () => {
    mocks.findPrediction.mockResolvedValue({
      fullTimeAway: '1',
      fullTimeHome: '2',
      halftimeAway: '0',
      halftimeHome: '1',
    })

    const card = await readPrognoseCard(supporter, now)

    expect(card?.mine?.lines).toEqual(['Jouw voorspelling: rust 1–0, eind 2–1'])
    expect(card?.action).toMatchObject({ label: 'Wijzig je voorspelling', type: 'link' })
    expect(card?.tag.tone).toBe('open')
  })

  it('adds nobody below the top three for a supporter who stands lower', async () => {
    const card = await readPrognoseCard({ ...supporter, id: 8 }, now)

    expect(headers(card)).toHaveLength(3)
    expect(marked(card)).toEqual([])
  })

  it('gives a blocked account nothing of its own', async () => {
    const card = await readPrognoseCard(blocked, now)

    expect(card?.action.type).toBe('link')
    expect(card?.tag.tone).toBe('open')
    expect(mocks.findPrediction).not.toHaveBeenCalled()
    expect(marked(card)).toEqual([])
  })

  it('is closed without an open match, without a count or a table without them', async () => {
    mocks.readOpenGame.mockResolvedValue(undefined)
    mocks.predictionSeasons.mockResolvedValue([])

    const card = await readPrognoseCard(supporter, now)

    expect(card).toMatchObject({
      action: { label: 'Naar de Prognose', type: 'link' },
      lines: ['Er is nu geen wedstrijd die je kunt voorspellen.'],
      tag: { text: 'Gesloten', tone: 'closed' },
    })
    expect(card?.match).toBeUndefined()
    expect(card?.ranking).toBeUndefined()
    expect(mocks.predictionRanking).not.toHaveBeenCalled()
  })

  it('has no line of the count for nobody, and speaks of one fan', async () => {
    mocks.countedPredictions.mockResolvedValue([])
    expect((await readPrognoseCard(undefined, now))?.lines).toEqual([])

    mocks.countedPredictions.mockResolvedValue([{}])
    expect((await readPrognoseCard(undefined, now))?.lines).toEqual(['1 fan voorspelde al.'])
  })
})

describe('the card of Fjouwer', () => {
  it('shows a visitor the match, the count and the top three', async () => {
    const card = await readFjouwerCard(undefined, now)

    expect(card).toMatchObject({
      action: { label: 'Naar Fjouwer', type: 'link' },
      lines: ['87 fans kozen hun vier.'],
      ranking: { caption: 'Stand 2026/27' },
      tag: { text: 'Open tot za 16.45' },
    })
    expect(headers(card)).toHaveLength(3)
    expect(mocks.supporterFours).not.toHaveBeenCalled()
  })

  it('has a button for a supporter without a four', async () => {
    const card = await readFjouwerCard(supporter, now)

    expect(card?.action).toEqual({ href: '/fans/fjouwer', label: 'Kies je vier', type: 'button' })
    expect(card?.tag.tone).toBe('todo')
    expect(card?.mine).toBeUndefined()
  })

  it('names the four, with the points and the place of the last match with points', async () => {
    mocks.fjouwerState.mockResolvedValue({ four: [1, 2, 3, 4], inherited: false, notCounting: [], saved: true })
    mocks.supporterFours.mockResolvedValue([
      { match: { id: 8 }, ready: false },
      { match: { id: 7 }, ready: true, total: 14 },
    ])
    mocks.cachedStanding.mockResolvedValue({ counted: 87, places: new Map([[5, { place: 2 }]]) })

    const card = await readFjouwerCard(supporter, now)

    expect(card?.mine?.lines).toEqual(['Jouw vier: Jansen, Veerman, Dijkstra, Hansen.'])
    expect(card?.mine?.figures).toEqual([
      { figure: '14', label: 'punten', note: 'in je laatste wedstrijd' },
      { figure: '2e', label: 'plek', note: 'van 87 bij deze wedstrijd' },
    ])
    expect(card?.action).toMatchObject({ label: 'Wijzig je vier', type: 'link' })
    expect(card?.tag.tone).toBe('open')
    expect(mocks.cachedStanding).toHaveBeenCalledWith(7)
  })

  it('asks for a new choice when a player of an inherited four does not count', async () => {
    mocks.fjouwerState.mockResolvedValue({ four: [1, 2, 3, 4], inherited: true, notCounting: [2], saved: false })

    const card = await readFjouwerCard(supporter, now)

    expect(card?.mine?.lines).toContain('Veerman telt niet mee.')
    expect(card?.action.type).toBe('button')
  })

  it('is closed without a match to choose for, and keeps the points', async () => {
    mocks.readOpenGame.mockResolvedValue(undefined)
    mocks.supporterFours.mockResolvedValue([{ match: { id: 7 }, ready: true, total: 1 }])
    mocks.cachedStanding.mockResolvedValue({ counted: 1, places: new Map() })

    const card = await readFjouwerCard(supporter, now)

    expect(card).toMatchObject({ action: { label: 'Naar Fjouwer' }, tag: { text: 'Gesloten' } })
    expect(card?.mine?.figures).toEqual([{ figure: '1', label: 'punt', note: 'in je laatste wedstrijd' }])
    expect(mocks.fjouwerState).not.toHaveBeenCalled()
  })

  it('gives a blocked account nothing of its own', async () => {
    const card = await readFjouwerCard(blocked, now)

    expect(card?.action.type).toBe('link')
    expect(mocks.fjouwerState).not.toHaveBeenCalled()
    expect(mocks.supporterFours).not.toHaveBeenCalled()
  })
})

describe('the card of the Fantest', () => {
  it('shows the quiz of the month, the count and the top three of the year', async () => {
    const card = await readFantestCard(undefined, now)

    expect(card).toMatchObject({
      action: { href: '/fans/fantest', label: 'Naar de Fantest', type: 'link' },
      lines: ['De Fantest van november.', '12 fans deden mee.'],
      ranking: { caption: 'Stand 2026' },
      tag: { text: 'Open tot ma 30 nov 23.59' },
    })
    expect(headers(card)).toEqual(['Tjalle99', 'Pompebled', 'Blauwwit'])
    expect(mocks.findEntry).not.toHaveBeenCalled()
  })

  it('leaves the other years out of the ranking, and has no table without scores', async () => {
    mocks.monthScores.mockResolvedValue([{ month: 10, score: 9, screenName: 'Oud', supporterId: 1, year: 2025 }])

    expect((await readFantestCard(undefined, now))?.ranking).toBeUndefined()
  })

  it('has a button for a supporter who has not taken part', async () => {
    const card = await readFantestCard(supporter, now)

    expect(card?.action).toEqual({ href: '/fans/fantest', label: 'Doe de Fantest', type: 'button' })
    expect(marked(card)).toEqual(['Pompebled'])
  })

  it('shows the score of a supporter who took part', async () => {
    mocks.findEntry.mockResolvedValue({ score: 7 })

    const card = await readFantestCard(supporter, now)

    expect(card?.mine?.lines).toEqual(['Je score deze maand: 7 van 10.'])
    expect(card?.action).toMatchObject({ label: 'Naar de Fantest', type: 'link' })
    expect(card?.tag.tone).toBe('open')
  })

  it('says that the quizzes of old can be played when none is open', async () => {
    mocks.loadMonthQuiz.mockResolvedValue(undefined)

    const card = await readFantestCard(supporter, now)

    expect(card).toMatchObject({
      action: { href: '/fans/fantest', label: 'Naar de Fantest' },
      lines: ['Er is nu geen Fantest. De quizzen van toen kun je naspelen.'],
      tag: { text: 'Gesloten' },
    })
  })

  it('gives a blocked account nothing of its own', async () => {
    const card = await readFantestCard(blocked, now)

    expect(card?.action.type).toBe('link')
    expect(mocks.findEntry).not.toHaveBeenCalled()
  })
})

describe('a game that can not be read', () => {
  it.each([
    ['Prognose', readPrognoseCard],
    ['Fjouwer', readFjouwerCard],
  ])('leaves out the card of %s and logs', async (game, read) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    mocks.readOpenGame.mockRejectedValue(new Error('Failed query'))

    expect(await read(undefined, now)).toBeUndefined()
    expect(log).toHaveBeenCalledExactlyOnceWith(expect.stringContaining(game))
  })

  it('leaves out the card of the Fantest and logs', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    mocks.loadMonthQuiz.mockRejectedValue(new Error('Failed query'))

    expect(await readFantestCard(undefined, now)).toBeUndefined()
    expect(log).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('Fantest'))
  })
})
