// While the month runs, no response of the quiz holds a right answer (issue 1482). A right
// answer is only a place from 1 to 4, so searching for it says nothing. Instead every response
// is made twice from a real database, with another right answer for every question but with the
// same score: if one character differed, it would tell something about the key.
import type { TestDatabase } from '@fansite/db/test-database'

import { quizQuestions, quizzes, supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { fantestData } from '#src/fans/fantest-data'

import { submitQuizAction } from './actions'
import FantestPage, { generateMetadata } from './page'

const { context, currentSupporter } = vi.hoisted(() => ({
  context: { db: undefined as unknown },
  currentSupporter: vi.fn(),
}))

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: context.db }) }))
vi.mock('#src/fans/require-supporter', () => ({
  currentSupporter,
  requireSupporter: async () => ({ supporterId: (await currentSupporter()).id }),
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`)
  },
}))

// What the page hands to the form travels to the browser, so the test reads those properties.
const { formProps } = vi.hoisted(() => ({ formProps: [] as unknown[] }))

vi.mock('./MonthQuizForm', () => ({
  MonthQuizForm: (props: unknown) => {
    formProps.push(props)

    return null
  },
}))

let database: TestDatabase
let quizId: number
let supporterId: number

beforeAll(async () => {
  database = await createTestDatabase()
  context.db = database.db
  const [quiz] = await database.db.insert(quizzes).values({
    closingText: 'Geheime slottekst.',
    month: 11,
    source: 'redactie',
    status: 'published',
    year: 2026,
  })
  quizId = quiz.insertId
  await database.db.insert(quizQuestions).values(
    Array.from({ length: 10 }, (_, index) => ({
      answers: ['a', 'b', 'c', 'd'] as [string, string, string, string],
      correctAnswer: 1,
      position: index + 1,
      quizId,
      text: `Testvraag ${index + 1}?`,
    })),
  )
  const [supporter] = await database.db
    .insert(supporters)
    .values({ email: 'proef@example.test', screenName: 'Proef', screenNameKey: 'proef' })
  supporterId = supporter.insertId
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-11-25T12:00:00Z'), toFake: ['Date'] })
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_FANTEST', 'on')
  vi.stubEnv('SITE_ENV', 'local')
  currentSupporter.mockResolvedValue({ disabledAt: null, id: supporterId })
})

/** Every response of the quiz, for the key as it is now. */
async function responses() {
  await database.pool.query('DELETE FROM quiz_entries')
  formProps.length = 0
  const page = async () =>
    renderToStaticMarkup(await FantestPage({ searchParams: Promise.resolve({ verstuurd: '1' }) }))

  currentSupporter.mockResolvedValue(undefined)
  const visitor = await page()
  currentSupporter.mockResolvedValue({ disabledAt: null, id: supporterId })
  const open = await page()
  const metadata = await generateMetadata()
  const quiz = formProps.at(-1) as { month: string; version: string }
  const form = new FormData()

  form.set('maand', quiz.month)
  form.set('versie', quiz.version)
  form.set('vraag-1', '1')
  const gap = await submitQuizAction({ answers: {}, checked: false, errors: {} }, form)

  for (let number = 1; number <= 10; number += 1) {
    // Every answer is "a": with the first key all right, with the second the first one only.
    form.set(`vraag-${number}`, '1')
  }

  const sent = await submitQuizAction(gap, form).then(String, (error: Error) => error.message)
  const after = await page()
  const data = await fantestData(database.db, supporterId)

  return { after, data, formProps: [...formProps], gap, metadata, open, sent, visitor }
}

describe('the responses of the quiz while the month runs', () => {
  it('are the same for another key with the same score, and never hold the closing text', async () => {
    // Right for question 1 only: two keys that differ in nine places and give one point.
    const keyOf = (rest: number) =>
      database.db
        .transaction(async (tx) => {
          await tx.update(quizQuestions).set({ correctAnswer: rest }).where(eq(quizQuestions.quizId, quizId))
          await tx.update(quizQuestions).set({ correctAnswer: 1 }).where(eq(quizQuestions.position, 1))
        })
        .then(responses)

    const first = await keyOf(2)
    const second = await keyOf(3)

    expect(first.after).toContain('>1 van 10<')
    expect(first.sent).toBe('redirect /fans/fantest?verstuurd=1')
    expect(second).toEqual(first)
    expect(JSON.stringify(first)).not.toMatch(/slottekst|correct|goed antwoord/i)
  })
})
