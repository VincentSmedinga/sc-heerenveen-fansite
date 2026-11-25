'use server'

import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'

import { getDatabase } from '#src/database'
import { answerField, checkQuiz, monthField, parseMonthSlug, type QuizState } from '#src/fans/fantest'
import { loadQuiz } from '#src/fans/fantest-months'

/**
 * Checks the answers to the quiz of one month, whose address is the value of the button that
 * sent the form (`maand`). It answers "not found" while the Fantest is off or the month has
 * no quiz that can be played, such as the quiz of the editors of the running month, and
 * otherwise returns the answers with the errors of the questions without one, or
 * with the state `checked`. It stores nothing: no answer, no score, no cookie, and no mark that
 * a visitor played the month (issues 1480 and 1484). The page shows the result from what it
 * returns.
 */
export async function checkQuizAction(_previous: QuizState, formData: FormData): Promise<QuizState> {
  requireFansPart('fantest', notFound)

  const slug = formData.get(monthField)
  const month = typeof slug === 'string' ? parseMonthSlug(slug) : undefined
  const quiz = month === undefined ? undefined : await loadQuiz(getDatabase().db, month.year, month.month)

  if (quiz === undefined) {
    notFound()
  }

  return checkQuiz(
    quiz.questions,
    quiz.questions.map((question) => formData.get(answerField(question.position))),
  )
}
