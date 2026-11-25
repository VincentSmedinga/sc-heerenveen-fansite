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

describe('the migration of the quizzes of the editors (#1481)', () => {
  it('takes a draft question without a right answer, counted as not "alles goed"', async () => {
    const [quiz] = await database.pool.query<ResultSetHeader>(
      "INSERT INTO quizzes (year, month, source, status, intro, closing_text) VALUES (2099, 1, 'redactie', 'draft', 'Begin', 'Slot')",
    )

    await database.pool.query(
      'INSERT INTO quiz_questions (quiz_id, position, text, answers, correct_answer) VALUES (?, 1, \'\', \'["","","",""]\', NULL)',
      [quiz.insertId],
    )

    const [rows] = await database.pool.query<RowDataPacket[]>('SELECT correct_answer, all_correct FROM quiz_questions')

    expect(rows[0]).toEqual({ all_correct: 0, correct_answer: null })
    await expect(database.pool.query('UPDATE quiz_questions SET correct_answer = 5')).rejects.toThrow()
  })
})
