import type { TestDatabase } from '@fansite/db/test-database'

import { closeAccount } from '@fansite/db/close-account'
import { quizEntries, quizQuestions, quizzes, supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { fantestData } from './fantest-data'
import { currentMonth, findEntry, loadMonthQuiz, submitEntry } from './fantest-entry'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

// 25 November 2026, in the Netherlands.
const now = new Date('2026-11-25T12:00:00Z')

/** The place of the right answer of each question in the made-up quiz. */
const key = [1, 2, 3, 4, 1, 2, 3, 4, 1, 2]
/** Six right answers, then four wrong ones. */
const sixRight = key.map((place, index) => (index < 6 ? place : (place % 4) + 1))

beforeEach(async () => {
  await database.pool.query('DELETE FROM quiz_entries')
  await database.pool.query('DELETE FROM quizzes')
  await database.pool.query('DELETE FROM supporters')
  await database.pool.query('DELETE FROM supporter_blocked_addresses')
})

async function addQuiz({ month = 11, source = 'redactie' as const, status = 'published' as const } = {}) {
  const [{ insertId }] = await database.db
    .insert(quizzes)
    .values({ closingText: 'De slottekst.', intro: 'De inleiding.', month, source, status, year: 2026 })

  await database.db.insert(quizQuestions).values(
    key.map((correctAnswer, index) => ({
      answers: ['a', 'b', 'c', 'd'] as [string, string, string, string],
      correctAnswer,
      position: index + 1,
      quizId: insertId,
      text: `Testvraag ${index + 1}?`,
    })),
  )

  return insertId
}

async function addSupporter(name = 'Proef', disabledAt: Date | null = null) {
  const [{ insertId }] = await database.db.insert(supporters).values({
    disabledAt,
    email: `${name}@example.test`,
    screenName: name,
    screenNameKey: name.toLowerCase(),
  })

  return insertId
}

const monthQuiz = async (moment = now) => (await loadMonthQuiz(database.db, moment))!
const entries = () => database.db.select().from(quizEntries)
const participants = async (id: number) =>
  (await database.db.select({ n: quizzes.participants }).from(quizzes).where(eq(quizzes.id, id)))[0]?.n

async function send(supporterId: number, answers = sixRight, moment = now) {
  const quiz = await monthQuiz()

  return submitEntry(database.db, { answers, quizId: quiz.id, supporterId, version: quiz.version }, moment)
}

describe('currentMonth', () => {
  it('turns at midnight in the Netherlands', () => {
    expect(currentMonth(new Date('2026-11-30T22:59:59Z'))).toEqual({ month: 11, year: 2026 })
    expect(currentMonth(new Date('2026-11-30T23:00:00Z'))).toEqual({ month: 12, year: 2026 })
  })
})

describe('loadMonthQuiz', () => {
  it('gives the published quiz of the editors of the running month, without a right answer', async () => {
    await addQuiz()
    const quiz = await monthQuiz()

    expect(quiz).toMatchObject({ intro: 'De inleiding.', month: 11, year: 2026 })
    expect(quiz.questions).toHaveLength(10)
    expect(Object.keys(quiz).toSorted()).toEqual(['id', 'intro', 'month', 'questions', 'version', 'year'])

    for (const question of quiz.questions) {
      expect(Object.keys(question).toSorted()).toEqual(['answers', 'position', 'text'])
    }
  })

  it('reads the same whichever answer is right, and the closing text is not in it', async () => {
    const id = await addQuiz()
    const before = await monthQuiz()

    await database.db.update(quizQuestions).set({ correctAnswer: 4 }).where(eq(quizQuestions.quizId, id))

    expect(await monthQuiz()).toEqual(before)
    expect(JSON.stringify(before)).not.toContain('slottekst')
  })

  it.each([
    ['a draft', { status: 'draft' as const }],
    ['a quiz of the archive', { source: 'oude-fansite' as const }],
    ['a quiz of another month', { month: 12 }],
  ])('gives nothing for %s', async (_name, settings) => {
    await addQuiz(settings as Parameters<typeof addQuiz>[0])

    expect(await loadMonthQuiz(database.db, now)).toBeUndefined()
  })
})

describe('submitEntry', () => {
  it('stores the answers with the score and the moment, and counts the participant', async () => {
    const id = await addQuiz()
    const supporterId = await addSupporter()

    expect(await send(supporterId)).toBe('saved')
    expect(await entries()).toMatchObject([
      { answers: sixRight, blocked: false, quizId: id, score: 6, submittedAt: now, supporterId },
    ])
    expect(await findEntry(database.db, supporterId, id)).toEqual({ score: 6 })
    expect(await participants(id)).toBe(1)
  })

  it('counts every answer to a question with "alles goed"', async () => {
    const id = await addQuiz()

    await database.db.update(quizQuestions).set({ allCorrect: true }).where(eq(quizQuestions.quizId, id))
    await send(await addSupporter())

    expect(await entries()).toMatchObject([{ score: 10 }])
  })

  it('stores nothing the second time, also with other answers', async () => {
    const id = await addQuiz()
    const supporterId = await addSupporter()

    await send(supporterId)

    expect(await send(supporterId, key)).toBe('already')
    expect(await entries()).toMatchObject([{ score: 6 }])
    expect(await participants(id)).toBe(1)
  })

  it('stores one of two forms that arrive together', async () => {
    const id = await addQuiz()
    const supporterId = await addSupporter()
    const results = await Promise.all([send(supporterId), send(supporterId, key)])

    expect(results.toSorted()).toEqual(['already', 'saved'])
    expect(await entries()).toHaveLength(1)
    expect(await participants(id)).toBe(1)
  })

  it('has a unique key on supporter and quiz', async () => {
    const quizId = await addQuiz()
    const supporterId = await addSupporter()
    const row = { answers: key, quizId, score: 10, submittedAt: now, supporterId }

    await database.db.insert(quizEntries).values(row)

    await expect(database.db.insert(quizEntries).values(row)).rejects.toThrow()
  })

  it('takes a form until midnight at the end of the month, and none after', async () => {
    await addQuiz()
    const first = await addSupporter('Eerste')
    const second = await addSupporter('Tweede')

    expect(await send(first, key, new Date('2026-11-30T22:59:59Z'))).toBe('saved')
    expect(await send(second, key, new Date('2026-11-30T23:00:00Z'))).toBe('closed')
    expect(await entries()).toHaveLength(1)
  })

  it('refuses a blocked account and an account that is gone', async () => {
    await addQuiz()

    expect(await send(await addSupporter('Weg', now))).toBe('blocked')
    expect(await send(999_999)).toBe('blocked')
    expect(await entries()).toEqual([])
  })

  it('takes an account that was made today', async () => {
    await addQuiz()

    expect(await send(await addSupporter())).toBe('saved')
  })

  it('refuses a form that showed other questions', async () => {
    const id = await addQuiz()
    const supporterId = await addSupporter()
    const old = await monthQuiz()

    await database.db.update(quizQuestions).set({ text: 'Anders?' }).where(eq(quizQuestions.quizId, id))

    expect(await submitEntry(database.db, { answers: key, quizId: id, supporterId, version: old.version }, now)).toBe(
      'changed',
    )
    expect(await entries()).toEqual([])
  })

  it('knows no draft and no quiz of the archive', async () => {
    const supporterId = await addSupporter()
    const draft = await addQuiz({ status: 'draft' as never })
    const old = await addQuiz({ month: 10, source: 'oude-fansite' as never })

    for (const quizId of [draft, old]) {
      expect(await submitEntry(database.db, { answers: key, quizId, supporterId, version: '' }, now)).toBe('missing')
    }
  })
})

describe('closing the account', () => {
  it.each([
    ['an account', null, false],
    ['a blocked account', now, true],
  ])('keeps the answers of %s without a supporter, so they still count', async (_name, disabledAt, blocked) => {
    const id = await addQuiz()
    const supporterId = await addSupporter()

    await send(supporterId)
    await database.db.update(supporters).set({ disabledAt }).where(eq(supporters.id, supporterId))
    await closeAccount(database.db, supporterId, now)

    expect(await entries()).toMatchObject([{ answers: sixRight, blocked, score: 6, supporterId: null }])
    expect(await participants(id)).toBe(1)
  })
})

describe('fantestData', () => {
  it('gives the score and the chosen answers, and never the right one', async () => {
    const id = await addQuiz()
    const supporterId = await addSupporter()

    expect(await fantestData(database.db, supporterId)).toBeUndefined()
    await send(supporterId)

    const data = await fantestData(database.db, supporterId)

    expect(data?.summary).toBe('1 Fantest, 6 van 10')
    expect(data?.rows).toHaveLength(12)
    // 12:00 UTC is 13:00 in the Netherlands.
    expect(data?.rows[0]).toEqual({ cells: ['25 november 2026 om 13:00'], header: 'November 2026: verstuurd' })
    expect(data?.rows[1]).toEqual({ cells: ['6 van 10'], header: 'November 2026: score' })
    expect(data?.rows[8]).toEqual({ cells: ['d'], header: 'November 2026, 7. Testvraag 7?' })

    // The same for every key: what was chosen, not what was right.
    await database.db.update(quizQuestions).set({ correctAnswer: 1 }).where(eq(quizQuestions.quizId, id))
    expect(await fantestData(database.db, supporterId)).toEqual(data)
  })
})
