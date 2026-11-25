import type { TestDatabase } from '@fansite/db/test-database'

import { closeAccount } from '@fansite/db/close-account'
import { quizEntries, quizQuestions, quizzes, supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { loadMonthScores, type MonthScore, rankingOf } from './fantest-ranking'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

// 15 March 2027, in the Netherlands.
const now = new Date('2027-03-15T12:00:00Z')

/** The place of the right answer of each question in the made-up quizzes. */
const key = [1, 2, 3, 4, 1, 2, 3, 4, 1, 2]
/** Answers with this many right, the rest wrong. */
const right = (count: number) => key.map((place, index) => (index < count ? place : (place % 4) + 1))

beforeEach(async () => {
  await database.pool.query('DELETE FROM quiz_entries')
  await database.pool.query('DELETE FROM quizzes')
  await database.pool.query('DELETE FROM supporters')
  await database.pool.query('DELETE FROM supporter_blocked_addresses')
})

async function addQuiz(
  year: number,
  month: number,
  { source = 'redactie' as 'oude-fansite' | 'redactie', status = 'published' as 'draft' | 'published' } = {},
) {
  const [{ insertId }] = await database.db.insert(quizzes).values({ month, source, status, year })

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

async function addSupporter(name: string, more: Partial<typeof supporters.$inferInsert> = {}) {
  const [{ insertId }] = await database.db.insert(supporters).values({
    email: `${name}@example.test`,
    screenName: name,
    screenNameKey: name.toLowerCase(),
    ...more,
  })

  return insertId
}

/** The stored score is left wrong on purpose: the ranking counts from the answers. */
const addEntry = (quizId: number, supporterId: number, correct: number) =>
  database.db.insert(quizEntries).values({ answers: right(correct), quizId, score: 0, submittedAt: now, supporterId })

const names = (scores: readonly MonthScore[]) => rankingOf(scores).map((row) => row.screenName)

describe('the scores of the closed months', () => {
  it('counts the answers of each closed month', async () => {
    const january = await addQuiz(2027, 1)
    const supporter = await addSupporter('Aukje')

    await addEntry(january, supporter, 7)

    expect(await loadMonthScores(database.db, now)).toEqual([
      { month: 1, score: 7, screenName: 'Aukje', supporterId: supporter, year: 2027 },
    ])
  })

  it('leaves out the running month, a later month, a draft and the old fansite', async () => {
    const supporter = await addSupporter('Aukje')

    for (const quiz of [
      await addQuiz(2027, 3),
      await addQuiz(2027, 4),
      await addQuiz(2027, 2, { status: 'draft' }),
      await addQuiz(2003, 1, { source: 'oude-fansite' }),
    ]) {
      await addEntry(quiz, supporter, 5)
    }

    expect(await loadMonthScores(database.db, now)).toEqual([])
    // A month is closed once the next one begins in the Netherlands.
    expect(await loadMonthScores(database.db, new Date('2027-03-31T21:59:00Z'))).toEqual([])
    expect(await loadMonthScores(database.db, new Date('2027-03-31T22:00:00Z'))).toHaveLength(1)
  })

  it('counts every answer of a question the editors annulled after it was sent', async () => {
    const january = await addQuiz(2027, 1)

    await addEntry(january, await addSupporter('Aukje'), 7)
    await database.db
      .update(quizQuestions)
      .set({ allCorrect: true })
      .where(and(eq(quizQuestions.quizId, january), eq(quizQuestions.position, 10)))

    expect((await loadMonthScores(database.db, now))[0]?.score).toBe(8)
  })

  it('has no blocked account, and has it back when the block is lifted', async () => {
    const january = await addQuiz(2027, 1)
    const blocked = await addSupporter('Bouke', { disabledAt: now })

    await addEntry(january, blocked, 10)
    await addEntry(january, await addSupporter('Aukje'), 5)

    const without = await loadMonthScores(database.db, now)

    expect(names(without)).toEqual(['Aukje'])
    expect(rankingOf(without)[0]?.place).toBe(1)

    await database.db.update(supporters).set({ disabledAt: null }).where(eq(supporters.id, blocked))

    expect(names(await loadMonthScores(database.db, now))).toEqual(['Bouke', 'Aukje'])
  })

  it('has no row for a supporter who left their name out', async () => {
    const january = await addQuiz(2027, 1)

    await addEntry(january, await addSupporter('Schuw', { inRankings: false }), 10)

    expect(await loadMonthScores(database.db, now)).toEqual([])
  })

  it('has no trace of an account that was closed, while its answers stay', async () => {
    const january = await addQuiz(2027, 1)
    const supporter = await addSupporter('Aukje')

    await addEntry(january, supporter, 6)
    await closeAccount(database.db, supporter)

    expect(await loadMonthScores(database.db, now)).toEqual([])
    expect(await database.db.select().from(quizEntries)).toHaveLength(1)
  })
})

describe('a ranking', () => {
  const score = (supporterId: number, screenName: string, points: number, month = 1): MonthScore => ({
    month,
    score: points,
    screenName,
    supporterId,
    year: 2027,
  })

  it('adds up the months, with the number of quizzes and the average', () => {
    expect(rankingOf([score(1, 'Aukje', 7), score(1, 'Aukje', 8, 2)])).toEqual([
      { average: 7.5, place: 1, quizzes: 2, screenName: 'Aukje', supporterId: 1, total: 15 },
    ])
  })

  it('shares a place at equal totals, skips the next and orders the names within it', () => {
    const rows = rankingOf([
      score(1, 'Ype', 5),
      score(1, 'Ype', 5, 2),
      score(2, 'anne', 10),
      score(3, 'Douwe', 12),
      score(4, 'Zus', 3),
    ])

    expect(rows.map((row) => [row.place, row.screenName, row.quizzes])).toEqual([
      [1, 'Douwe', 1],
      [2, 'anne', 1],
      [2, 'Ype', 2],
      [4, 'Zus', 1],
    ])
  })
})
