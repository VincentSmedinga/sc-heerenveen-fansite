import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MonthQuiz } from '#src/fans/fantest-entry'

import { submitQuizAction } from './actions'

const { findEntry, loadMonthQuiz, requireSupporter, submitEntry } = vi.hoisted(() => ({
  findEntry: vi.fn(),
  loadMonthQuiz: vi.fn(),
  requireSupporter: vi.fn(),
  submitEntry: vi.fn(),
}))

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/fans/require-supporter', () => ({ requireSupporter }))
vi.mock('#src/fans/fantest-entry', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findEntry,
  loadMonthQuiz,
  submitEntry,
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`)
  },
}))

const quiz: MonthQuiz = {
  id: 4,
  intro: '',
  month: 11,
  questions: [1, 2, 3].map((position) => ({ answers: ['a', 'b', 'c', 'd'], position, text: `Vraag ${position}?` })),
  version: 'abc',
  year: 2026,
}
const empty = { answers: {}, checked: false, errors: {} }
const complete = { maand: '2026-11', versie: 'abc', 'vraag-1': '1', 'vraag-2': '2', 'vraag-3': '3' }

const form = (entries: Record<string, string>) => {
  const data = new FormData()

  for (const [name, value] of Object.entries(entries)) {
    data.set(name, value)
  }

  return data
}

const send = (entries: Record<string, string> = complete) => submitQuizAction(empty, form(entries))

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-11-25T12:00:00Z') })
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_FANTEST', 'on')
  requireSupporter.mockResolvedValue({ supporterId: 7 })
  loadMonthQuiz.mockResolvedValue(quiz)
  findEntry.mockResolvedValue(undefined)
  submitEntry.mockResolvedValue('saved')
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.resetAllMocks()
})

describe('submitQuizAction', () => {
  it('stores the answers in the order of the questions and goes to the page', async () => {
    await expect(send()).rejects.toThrow('redirect /fans/fantest?verstuurd=1')
    expect(submitEntry).toHaveBeenCalledWith({}, { answers: [1, 2, 3], quizId: 4, supporterId: 7, version: 'abc' })
  })

  it('gives a question without an answer its own error, keeps the others and stores nothing', async () => {
    const gap = Object.fromEntries(Object.entries(complete).filter(([name]) => name !== 'vraag-2'))

    expect(await send(gap)).toEqual({
      answers: { 1: 1, 3: 3 },
      checked: false,
      errors: { 2: 'Kies een antwoord bij vraag 2.' },
    })
    expect(submitEntry).not.toHaveBeenCalled()
  })

  it('says that the supporter took part before, also with a form that has a gap', async () => {
    findEntry.mockResolvedValue({ score: 6 })

    await expect(send({ maand: '2026-11' })).rejects.toThrow('redirect /fans/fantest?al=1')
    expect(submitEntry).not.toHaveBeenCalled()
  })

  it('says that the quiz is closed for a form of last month that stayed open', async () => {
    vi.setSystemTime(new Date('2026-11-30T23:00:00Z'))

    await expect(send()).rejects.toThrow('redirect /fans/fantest?gesloten=1')
    expect(submitEntry).not.toHaveBeenCalled()
  })

  it('says that the questions changed for a form that showed other ones', async () => {
    await expect(send({ ...complete, versie: 'old' })).rejects.toThrow('redirect /fans/fantest?gewijzigd=1')
    expect(submitEntry).not.toHaveBeenCalled()
  })

  it.each([
    ['already', 'redirect /fans/fantest?al=1'],
    ['blocked', 'redirect /fans/geblokkeerd'],
    ['changed', 'redirect /fans/fantest?gewijzigd=1'],
    ['closed', 'redirect /fans/fantest?gesloten=1'],
    ['missing', 'NEXT_NOT_FOUND'],
  ])('follows the answer "%s" of the store', async (result, expected) => {
    submitEntry.mockResolvedValue(result)

    await expect(send()).rejects.toThrow(expected)
  })

  it('is "not found" without a quiz this month, and with the Fantest off before it asks anything', async () => {
    loadMonthQuiz.mockResolvedValue(undefined)
    await expect(send()).rejects.toThrow('NEXT_NOT_FOUND')

    requireSupporter.mockClear()
    vi.stubEnv('FANS_FANTEST', 'off')
    await expect(send()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(requireSupporter).not.toHaveBeenCalled()
  })
})
