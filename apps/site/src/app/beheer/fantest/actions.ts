'use server'

import { adminRoles } from '@fansite/db/schema'
import { redirect } from 'next/navigation'

import { parseItemId } from '#src/beheer/items'
import { type NewQuizState, type QuizFormState } from '#src/beheer/quiz-fields'
import { readIntent, readQuizValues } from '#src/beheer/quiz-form'
import { createQuiz, saveQuiz } from '#src/beheer/quizzes'
import { requireFantest } from '#src/beheer/require-fantest'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { quizPath, quizzesPath } from './paths'

// The actions of the Fantest in the admin, for every role. Each checks the role and the setting
// of the Fantest before it reads anything. They work without JavaScript: a form that is right
// ends on a page with a notice, and one with an error returns with the values kept.

/** Makes the draft for a month. */
export async function submitNewQuiz(_previous: NewQuizState, formData: FormData): Promise<NewQuizState> {
  const { userId } = await requireRole(...adminRoles)

  requireFantest()

  const text = (name: string) => {
    const value = formData.get(name)

    return typeof value === 'string' ? value : ''
  }
  const values = { jaar: text('jaar'), maand: text('maand') }
  const month = /^(?:[1-9]|1[0-2])$/u.test(values.maand) ? Number(values.maand) : undefined
  const year = /^20\d\d$/u.test(values.jaar) ? Number(values.jaar) : undefined

  if (month === undefined || year === undefined) {
    return {
      errors: {
        ...(month === undefined ? { maand: 'Kies een maand.' } : {}),
        ...(year === undefined ? { jaar: 'Kies een jaar.' } : {}),
      },
      values,
    }
  }

  const outcome = await createQuiz(getDatabase().db, userId, { month, year })

  if (outcome.status === 'invalid') {
    return { errors: outcome.errors, values }
  }

  redirect(quizPath(outcome.id, 'gemaakt'))
}

/**
 * Saves the form of a quiz, and publishes it or moves a question when the button that was
 * pressed says so (`knop`). The number of the quiz is bound to the action, which is input from
 * outside all the same, so it is checked again.
 */
export async function submitQuiz(quizId: number, _previous: QuizFormState, formData: FormData): Promise<QuizFormState> {
  const { userId } = await requireRole(...adminRoles)

  requireFantest()

  const id = parseItemId(quizId)

  if (id === undefined) {
    redirect(`${quizzesPath}?fout=weg`)
  }

  const values = readQuizValues(formData)
  const intent = readIntent(formData)
  const outcome = await saveQuiz(getDatabase().db, userId, id, values, intent)

  if (outcome.status === 'invalid') {
    return { errors: outcome.errors, values }
  }

  if (outcome.status === 'missing') {
    redirect(`${quizzesPath}?fout=weg`)
  }

  const done = {
    locked: 'vergrendeld',
    moved: 'verplaatst',
    published: 'gepubliceerd',
    saved: 'opgeslagen',
    unchanged: 'ongewijzigd',
  } as const

  redirect(quizPath(id, done[outcome.status]))
}
