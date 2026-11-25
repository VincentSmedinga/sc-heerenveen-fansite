import type { TestDatabase } from '@fansite/db/test-database'

import { quizEntries, quizQuestions, quizzes, supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { averageOf, findAnswers, loadArchive, loadClosedFigures, loadQuiz, withFigures } from './fantest-months'

// 1 November 2026, half an hour after midnight in Dutch time: October is over, November runs.
const now = new Date('2026-10-31T23:30:00Z')

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM quizzes')
  await database.pool.query('DELETE FROM supporters')
})

type Month = Partial<typeof quizzes.$inferInsert>

/** A quiz of ten questions with the right answer 1. */
async function addQuiz(values: Month = {}) {
  const [{ insertId }] = await database.db.insert(quizzes).values({
    closingText: 'Een verzonnen slottekst.',
    month: 10,
    source: 'redactie',
    status: 'published',
    year: 2026,
    ...values,
  })
  await database.db.insert(quizQuestions).values(
    Array.from({ length: 10 }, (_, index) => ({
      answers: ['a', 'b', 'c', 'd'] as [string, string, string, string],
      correctAnswer: 1,
      position: index + 1,
      quizId: insertId,
      text: `Testvraag ${index + 1}?`,
    })),
  )

  return insertId
}

let made = 0

/** An entry of a new supporter with the first `right` answers right and the rest "b". */
async function addEntry(
  quizId: number,
  right: number,
  options: { blocked?: boolean; closed?: 'blocked' | 'closed' | 'disabled' } = {},
) {
  made += 1
  const [{ insertId }] = await database.db.insert(supporters).values({
    disabledAt: options.closed === 'disabled' ? now : null,
    email: `proef-${made}@example.test`,
    screenName: `Proef ${made}`,
    screenNameKey: `proef ${made}`,
  })
  const anonymous = options.closed === 'closed' || options.closed === 'blocked'
  await database.db.insert(quizEntries).values({
    answers: Array.from({ length: 10 }, (_, index) => (index < right ? 1 : 2)),
    blocked: options.closed === 'blocked',
    quizId,
    // The stored score says nothing: the figures count from the answers.
    score: 0,
    submittedAt: now,
    supporterId: anonymous ? null : insertId,
  })

  return insertId
}

describe('the months that can be read', () => {
  it('are the old ones and the quizzes of the editors of a month that is over, newest first', async () => {
    await addQuiz({ month: 10 })
    await addQuiz({ month: 9, status: 'draft' })
    await addQuiz({ month: 11 })
    await addQuiz({ month: 1, year: 2027 })
    await addQuiz({ month: 5, source: 'oude-fansite', year: 2003 })

    expect((await loadArchive(database.db, now)).map(({ month, year }) => `${year}-${month}`)).toEqual([
      '2026-10',
      '2003-5',
    ])
    expect(await loadQuiz(database.db, 2026, 10, now)).toBeDefined()
    expect(await loadQuiz(database.db, 2026, 9, now)).toBeUndefined()
    expect(await loadQuiz(database.db, 2026, 11, now)).toBeUndefined()
    expect(await loadQuiz(database.db, 2027, 1, now)).toBeUndefined()
  })

  it('keep the quiz of the editors closed until the month is over in Dutch time', async () => {
    await addQuiz()

    expect(await loadQuiz(database.db, 2026, 10, new Date('2026-10-31T22:59:00Z'))).toBeUndefined()
    expect(await loadArchive(database.db, new Date('2026-10-31T22:59:00Z'))).toEqual([])
    expect((await loadQuiz(database.db, 2026, 10, new Date('2026-10-31T23:00:00Z')))?.recent?.closingText).toBe(
      'Een verzonnen slottekst.',
    )
  })
})

describe('the figures of the months that are over', () => {
  it('count the entries from their answers, also of closed accounts, and never of blocked ones', async () => {
    const quizId = await addQuiz()
    await addEntry(quizId, 10)
    await addEntry(quizId, 6, { closed: 'closed' })
    await addEntry(quizId, 10, { closed: 'blocked' })
    await addEntry(quizId, 10, { closed: 'disabled' })

    const figures = (await loadClosedFigures(database.db, now)).get(quizId)

    expect(figures).toMatchObject({ allRight: 1, participants: 2, total: 16 })
    expect(figures?.chosen[1]).toEqual([2, 0, 0, 0])
    expect(figures?.chosen[10]).toEqual([1, 1, 0, 0])
  })

  it('count a cancelled question as right for everybody', async () => {
    const quizId = await addQuiz()
    await addEntry(quizId, 9)
    await database.db.update(quizQuestions).set({ allCorrect: true }).where(eq(quizQuestions.position, 10))

    expect((await loadClosedFigures(database.db, now)).get(quizId)).toMatchObject({ allRight: 1, total: 10 })
    expect((await loadQuiz(database.db, 2026, 10, now))?.questions[9]?.allCorrect).toBe(true)
  })

  it('leave out the running month', async () => {
    await addEntry(await addQuiz({ month: 11 }), 5)

    expect(await loadClosedFigures(database.db, now)).toEqual(new Map())
  })

  it('give a quiz its average and percentages only from five participants', async () => {
    const quizId = await addQuiz()

    for (const right of [10, 10, 5, 0]) {
      await addEntry(quizId, right)
    }

    const quiz = (await loadQuiz(database.db, 2026, 10, now))!
    const few = (await loadClosedFigures(database.db, now)).get(quizId)

    expect(averageOf(few)).toBeUndefined()
    expect(withFigures(quiz, few)).toMatchObject({
      averageTenths: undefined,
      participants: undefined,
      recent: { allRight: undefined, count: 4 },
    })
    expect(withFigures(quiz, few).questions[0]?.percentages).toBeUndefined()

    await addEntry(quizId, 7)
    const enough = (await loadClosedFigures(database.db, now)).get(quizId)

    expect(withFigures(quiz, enough)).toMatchObject({
      averageTenths: 64,
      participants: 5,
      recent: { allRight: 2, count: 5 },
    })
    expect(withFigures(quiz, enough).questions[0]?.percentages).toEqual([80, 20, 0, 0])
  })

  it('hand a supporter their own answers by question, and nothing to somebody without an entry', async () => {
    const quizId = await addQuiz()
    const supporterId = await addEntry(quizId, 1)

    expect(await findAnswers(database.db, supporterId, quizId)).toMatchObject({ 1: 1, 2: 2, 10: 2 })
    expect(await findAnswers(database.db, supporterId + 100, quizId)).toBeUndefined()
  })
})
