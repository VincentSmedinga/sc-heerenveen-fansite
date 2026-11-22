import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QuizView } from '#src/fans/fantest'

import { checkQuizAction } from './actions'

const { loadQuiz } = vi.hoisted(() => ({ loadQuiz: vi.fn() }))

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/fans/fantest', async (importOriginal) => ({ ...(await importOriginal<object>()), loadQuiz }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

const quiz: QuizView = {
  averageTenths: 41,
  month: 5,
  participants: 38,
  questions: [1, 2, 3].map((position) => ({
    answers: ['a', 'b', 'c', 'd'],
    correct: 2,
    percentages: undefined,
    position,
    text: `Vraag ${position}?`,
  })),
  year: 2003,
}
const empty = { answers: {}, checked: false, errors: {} }

const form = (entries: Record<string, string>) => {
  const data = new FormData()

  for (const [name, value] of Object.entries(entries)) {
    data.set(name, value)
  }

  return data
}

beforeEach(() => {
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_FANTEST', 'on')
  loadQuiz.mockResolvedValue(quiz)
})

afterEach(() => {
  vi.unstubAllEnvs()
  loadQuiz.mockReset()
})

describe('checkQuizAction', () => {
  it('checks the answers of the month in the hidden field', async () => {
    const state = await checkQuizAction(
      empty,
      form({ maand: '2003-05', 'vraag-1': '1', 'vraag-2': '2', 'vraag-3': '3' }),
    )

    expect(loadQuiz).toHaveBeenCalledWith({}, 2003, 5)
    expect(state).toEqual({ answers: { 1: 1, 2: 2, 3: 3 }, checked: true, errors: {} })
  })

  it('gives a question without an answer its own error and does not check the quiz', async () => {
    const state = await checkQuizAction(empty, form({ maand: '2003-05', 'vraag-1': '1', 'vraag-3': '3' }))

    expect(state.checked).toBe(false)
    expect(state.errors).toEqual({ 2: 'Kies een antwoord bij vraag 2.' })
    expect(state.answers).toEqual({ 1: 1, 3: 3 })
  })

  it('is "not found" without a month, for a month that is no month, for a month without a quiz and with the part off', async () => {
    await expect(checkQuizAction(empty, form({}))).rejects.toThrow('NEXT_NOT_FOUND')
    await expect(checkQuizAction(empty, form({ maand: 'later' }))).rejects.toThrow('NEXT_NOT_FOUND')
    loadQuiz.mockResolvedValue(undefined)
    await expect(checkQuizAction(empty, form({ maand: '2003-07' }))).rejects.toThrow('NEXT_NOT_FOUND')
    loadQuiz.mockResolvedValue(quiz)
    vi.stubEnv('FANS_FANTEST', 'off')
    await expect(checkQuizAction(empty, form({ maand: '2003-05' }))).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('does not read a session, so it needs no account', async () => {
    const state = await checkQuizAction(
      empty,
      form({ maand: '2003-05', 'vraag-1': '1', 'vraag-2': '2', 'vraag-3': '3' }),
    )

    expect(state.checked).toBe(true)
  })
})
