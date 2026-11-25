import type { Database } from '@fansite/db/client'

import { quizEntries, quizQuestions, quizzes, supporters } from '@fansite/db/schema'
import { scoreQuiz } from '@fansite/shared/quiz-score'
import { and, asc, eq, sql } from 'drizzle-orm'
import { createHash } from 'node:crypto'

import { dayOf } from '#src/news'

import { monthSlug } from './fantest'
import { type MonthQuestion } from './fantest-entry-fields'
import { isDuplicate } from './sign-up'
import { mayTakePart } from './take-part'

// The quiz of the running month, which a supporter does once (issue 1482). While the month
// runs, the right answers never leave the server: the questions for a page are read without
// them, and only `submitEntry` reads them, to count the score. The clock is the `now` argument.

export { versionField } from './fantest-entry-fields'
export type { MonthQuestion } from './fantest-entry-fields'

const source = 'redactie'

/** The quiz of a month as a supporter sees it: no right answer and no closing text. */
export type MonthQuiz = {
  id: number
  intro: string
  month: number
  questions: MonthQuestion[]
  /** A mark of the questions and answers, so an old form is not scored against new ones. */
  version: string
  year: number
}

export type SubmitResult = 'already' | 'blocked' | 'changed' | 'closed' | 'missing' | 'saved'

/**
 * The year and month in Dutch time. A quiz runs from the first to the last day of its month.
 */
export function currentMonth(now = new Date()): { month: number; year: number } {
  const [year = 0, month = 0] = dayOf(now).split('-').map(Number)

  return { month, year }
}

/** The score of a supporter for a quiz, or `undefined` when they did not take part. */
export async function findEntry(
  db: Pick<Database, 'select'>,
  supporterId: number,
  quizId: number,
): Promise<undefined | { score: number }> {
  const [entry] = await db
    .select({ score: quizEntries.score })
    .from(quizEntries)
    .where(and(eq(quizEntries.supporterId, supporterId), eq(quizEntries.quizId, quizId)))

  return entry
}

/** The published quiz of the editors of the running month, or `undefined` without one. */
export async function loadMonthQuiz(db: Pick<Database, 'select'>, now = new Date()): Promise<MonthQuiz | undefined> {
  const { month, year } = currentMonth(now)
  const [quiz] = await db
    .select({ id: quizzes.id, intro: quizzes.intro })
    .from(quizzes)
    .where(
      and(
        eq(quizzes.year, year),
        eq(quizzes.month, month),
        eq(quizzes.source, source),
        eq(quizzes.status, 'published'),
      ),
    )

  if (quiz === undefined) {
    return undefined
  }

  const questions = await questionsOf(db, quiz.id)

  return { id: quiz.id, intro: quiz.intro ?? '', month, questions, version: versionOf(questions), year }
}

/**
 * Stores what a supporter sends in, with the score of this moment, in one transaction. It locks
 * the row of the quiz, as the admin does when it saves (#1481), so the questions can't change
 * between the check and the write and the quiz is locked from the first entry on. Nothing is
 * stored when the month is over, the account may not take part, the questions are not the ones
 * of the form (`version`) or the supporter took part before, which the unique key on supporter
 * and quiz enforces too. `answers` are the places (1 to 4) in the order of the questions.
 */
export async function submitEntry(
  db: Database,
  input: { answers: readonly number[]; quizId: number; supporterId: number; version: string },
  now?: Date,
): Promise<SubmitResult> {
  try {
    return await db.transaction(async (tx) => {
      const [quiz] = await tx
        .select({ month: quizzes.month, status: quizzes.status, year: quizzes.year })
        .from(quizzes)
        .where(and(eq(quizzes.id, input.quizId), eq(quizzes.source, source)))
        .for('update')
      // The moment is taken after the lock, so a wait never lets a late form in.
      const moment = now ?? new Date()

      if (quiz === undefined || quiz.status !== 'published') {
        return 'missing'
      }

      const running = currentMonth(moment)

      if (monthSlug(quiz.year, quiz.month) !== monthSlug(running.year, running.month)) {
        return 'closed'
      }

      const [account] = await tx
        .select({ disabledAt: supporters.disabledAt })
        .from(supporters)
        .where(eq(supporters.id, input.supporterId))
        .for('update')

      if (!mayTakePart(account)) {
        return 'blocked'
      }

      if ((await findEntry(tx, input.supporterId, input.quizId)) !== undefined) {
        return 'already'
      }

      const questions = await questionsOf(tx, input.quizId)

      if (versionOf(questions) !== input.version || input.answers.length !== questions.length) {
        return 'changed'
      }

      const key = await tx
        .select({ allCorrect: quizQuestions.allCorrect, correct: quizQuestions.correctAnswer })
        .from(quizQuestions)
        .where(eq(quizQuestions.quizId, input.quizId))
        .orderBy(asc(quizQuestions.position))
      // Of a question with "alles goed" every answer counts.
      const score = scoreQuiz(
        input.answers,
        key.map(({ allCorrect, correct }, index) => (allCorrect ? (input.answers[index] ?? 0) : (correct ?? 0))),
      )

      await tx.insert(quizEntries).values({
        answers: [...input.answers],
        quizId: input.quizId,
        score,
        submittedAt: moment,
        supporterId: input.supporterId,
      })
      await tx
        .update(quizzes)
        .set({ participants: sql`coalesce(${quizzes.participants}, 0) + 1` })
        .where(eq(quizzes.id, input.quizId))

      return 'saved'
    })
  } catch (error) {
    if (isDuplicate(error)) {
      return 'already'
    }

    throw error
  }
}

/** The questions of a quiz in their order, without the right answers. */
function questionsOf(db: Pick<Database, 'select'>, quizId: number): Promise<MonthQuestion[]> {
  return db
    .select({ answers: quizQuestions.answers, position: quizQuestions.position, text: quizQuestions.text })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(asc(quizQuestions.position))
}

/** A short mark of what a form shows: it changes with any question, answer or order. */
function versionOf(questions: readonly MonthQuestion[]) {
  return createHash('sha256')
    .update(JSON.stringify(questions.map(({ answers, position, text }) => [position, text, answers])))
    .digest('hex')
    .slice(0, 16)
}
