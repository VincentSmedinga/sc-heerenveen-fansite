'use server'

import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { getDatabase } from '#src/database'
import { answerField, checkQuiz, fantestPath, monthField, monthSlug, type QuizState } from '#src/fans/fantest'
import {
  currentMonth,
  findEntry,
  loadMonthQuiz,
  submitEntry,
  type SubmitResult,
  versionField,
} from '#src/fans/fantest-entry'
import { logInPaths } from '#src/fans/log-in'
import { requireSupporter } from '#src/fans/require-supporter'

/** Where the supporter goes after each answer of `submitEntry`. */
const pageAfter: Record<Exclude<SubmitResult, 'missing'>, string> = {
  already: `${fantestPath}?al=1`,
  blocked: logInPaths.blocked,
  changed: `${fantestPath}?gewijzigd=1`,
  closed: `${fantestPath}?gesloten=1`,
  saved: `${fantestPath}?verstuurd=1`,
}

/**
 * Stores the answers of the supporter who is logged in to the quiz of the running month (issue
 * 1482), whose address is the value of the button that sent the form (`maand`). It answers
 * "not found" while the Fantest is off or the month has no quiz, sends a visitor without a
 * session to log in and a blocked account to its page (`requireSupporter`). With a question
 * without an answer it returns the errors and the chosen answers, and stores nothing. In every
 * other case it goes to the page, which says what happened: the answers were stored, the
 * supporter had taken part before, the month was over or the questions had changed. What it
 * returns never holds a right answer.
 */
export async function submitQuizAction(_previous: QuizState, formData: FormData): Promise<QuizState> {
  requireFansPart('fantest', notFound)

  const { supporterId } = await requireSupporter({ from: fantestPath })
  const { db } = getDatabase()
  const now = new Date()
  const running = currentMonth(now)

  if (formData.get(monthField) !== monthSlug(running.year, running.month)) {
    redirect(pageAfter.closed)
  }

  const quiz = await loadMonthQuiz(db, now)

  if (quiz === undefined) {
    notFound()
  }

  if ((await findEntry(db, supporterId, quiz.id)) !== undefined) {
    redirect(pageAfter.already)
  }

  const version = formData.get(versionField)

  if (version !== quiz.version) {
    redirect(pageAfter.changed)
  }

  const checked = checkQuiz(
    quiz.questions,
    quiz.questions.map((question) => formData.get(answerField(question.position))),
  )

  if (!checked.checked) {
    return checked
  }

  const result = await submitEntry(db, {
    answers: quiz.questions.map((question) => checked.answers[question.position] ?? 0),
    quizId: quiz.id,
    supporterId,
    version,
  })

  if (result === 'missing') {
    notFound()
  }

  redirect(pageAfter[result])
}
