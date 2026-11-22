import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

beforeEach(async () => {
  database = await createTestDatabase()
})

afterEach(async () => {
  // Undefined when the server wasn't there, which beforeEach has already reported.
  await database?.drop()
})

const addQuiz = async (year = 2003, month = 5, source = 'oude-fansite') => {
  const [result] = await database.pool.query<ResultSetHeader>(
    "INSERT INTO quizzes (year, month, source, status, participants, average_score_tenths) VALUES (?, ?, ?, 'published', 38, 41)",
    [year, month, source],
  )

  return result.insertId
}

const addQuestion = (quizId: number, position = 1, answers = '["a","b","c","d"]', correct = 2) =>
  database.pool.query(
    'INSERT INTO quiz_questions (quiz_id, position, text, answers, correct_answer, percentages) VALUES (?, ?, ?, ?, ?, NULL)',
    [quizId, position, 'Testvraag?', answers, correct],
  )

describe('the migration of the quizzes (#1480)', () => {
  it('makes both tables, empty', async () => {
    const [rows] = await database.pool.query<RowDataPacket[]>(
      'SELECT (SELECT COUNT(*) FROM quizzes) AS quizzes, (SELECT COUNT(*) FROM quiz_questions) AS questions',
    )

    expect(rows[0]).toEqual({ questions: 0, quizzes: 0 })
  })

  it('keeps one quiz for each month, whatever its source', async () => {
    await addQuiz(2003, 5)

    await expect(addQuiz(2003, 5, 'redactie')).rejects.toThrow()
    await expect(addQuiz(2003, 6, 'redactie')).resolves.toBeGreaterThan(0)
  })

  it('refuses a month outside 1 to 12, an average over 10 and a source or status it does not know', async () => {
    await expect(addQuiz(2003, 0)).rejects.toThrow()
    await expect(addQuiz(2003, 13)).rejects.toThrow()
    await expect(
      database.pool.query(
        "INSERT INTO quizzes (year, month, source, status, average_score_tenths) VALUES (2003, 1, 'oude-fansite', 'published', 101)",
      ),
    ).rejects.toThrow()
    await expect(addQuiz(2003, 2, 'anders')).rejects.toThrow()
  })

  it('keeps one question for each place of a quiz, and refuses a place outside 1 to 10', async () => {
    const quiz = await addQuiz()

    await addQuestion(quiz, 1)
    await expect(addQuestion(quiz, 1)).rejects.toThrow()
    await expect(addQuestion(quiz, 0)).rejects.toThrow()
    await expect(addQuestion(quiz, 11)).rejects.toThrow()
    await expect(addQuestion(quiz, 10)).resolves.toBeDefined()
  })

  it('refuses a right answer outside 1 to 4 and answers that are not four', async () => {
    const quiz = await addQuiz()

    await expect(addQuestion(quiz, 1, '["a","b","c","d"]', 0)).rejects.toThrow()
    await expect(addQuestion(quiz, 2, '["a","b","c","d"]', 5)).rejects.toThrow()
    await expect(addQuestion(quiz, 3, '["a","b","c"]')).rejects.toThrow()
  })

  it('takes the questions away with the quiz, and refuses a question without a quiz', async () => {
    const quiz = await addQuiz()

    await addQuestion(quiz)
    await database.pool.query('DELETE FROM quizzes WHERE id = ?', [quiz])

    const [rows] = await database.pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM quiz_questions')

    expect(rows[0]?.['total']).toBe(0)
    await expect(addQuestion(999_999)).rejects.toThrow()
  })
})
