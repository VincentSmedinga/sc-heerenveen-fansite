import type { Database } from '@fansite/db/client'

import { quizQuestions, quizzes } from '@fansite/db/schema'
import { scoreQuiz } from '@fansite/shared/quiz-score'
import { and, asc, count, desc, eq } from 'drizzle-orm'

// The Fantest of the old fansite as an archive (issue 1480): the quizzes by month and the pages
// that let a visitor play one. It holds the sums of the visitors of then and never a person,
// and nothing of a visitor of this site: the answers are checked and forgotten.

/** The address of the archive. */
export const fantestPath = '/fans/fantest'

/** A quiz has ten questions; one with fewer has a question that was left out. */
export const quizSize = 10

/** The percentages and the average of a month show with at least this many participants. */
export const quizMinimum = 5

/** The line under the heading of the archive and of a month, which credits the old editors. */
export const archiveCredit = 'Vragen uit het archief van de Fansite, gemaakt door de toenmalige redactie.'

const monthNames = [
  'januari',
  'februari',
  'maart',
  'april',
  'mei',
  'juni',
  'juli',
  'augustus',
  'september',
  'oktober',
  'november',
  'december',
] as const

/** `2003-05`, the address of the page of a month. */
export const monthSlug = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`

export const monthPath = (year: number, month: number) => `${fantestPath}/${monthSlug(year, month)}`

/** The year and month of an address such as `2003-05`, or nothing when it is no month. */
export function parseMonthSlug(slug: string): undefined | { month: number; year: number } {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(slug)

  return match === null ? undefined : { month: Number(match[2]), year: Number(match[1]) }
}

export const monthName = (month: number) => monthNames[month - 1] ?? ''

/** "mei 2003". */
export const monthTitle = (year: number, month: number) => `${monthName(month)} ${year}`

/** "Mei 2003", for a link: the title with a capital. */
export const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** The average as a fan reads it: tenths in, "4,1" out. */
export const averageText = (tenths: number) => (tenths / 10).toFixed(1).replace('.', ',')

/** The name of the form field of a question, from its place in the quiz. */
export const answerField = (position: number) => `vraag-${position}`

/** The `id` of the first radio button of a question, which a link in the summary goes to. */
export const questionId = (position: number) => answerField(position)

/** The name of the hidden field that says which month the form belongs to. */
export const monthField = 'maand'

/** One month in the archive, as the list shows it. */
export type ArchiveMonth = {
  /** The average score in tenths, or nothing when too few took part for it to show. */
  averageTenths: number | undefined
  month: number
  questions: number
  year: number
}

/** What the form of a month holds: the answers, the errors and whether it was checked. */
export type QuizState = {
  /** The chosen answer (1 to 4) of each question, by its position. */
  answers: Record<number, number>
  /** Whether the answers are checked: then the page shows the result. */
  checked: boolean
  /** The error of each question without an answer, by its position. */
  errors: Record<number, string>
}

/** The questions of one month. `percentages` are left out when too few took part. */
export type QuizView = {
  averageTenths: number | undefined
  month: number
  participants: number | undefined
  questions: QuizViewQuestion[]
  year: number
}

export type QuizViewQuestion = {
  answers: [string, string, string, string]
  /** The place (1 to 4) of the right answer. */
  correct: number
  percentages: [number, number, number, number] | undefined
  /** The place in the quiz of the old site, which names the field. */
  position: number
  text: string
}

export const emptyQuizState: QuizState = { answers: {}, checked: false, errors: {} }

/** "Kies een antwoord bij vraag 3." The number is the place in this quiz, from 1. */
export const missingAnswer = (number: number) => `Kies een antwoord bij vraag ${number}.`

export const summaryTitle = (missing: number) => `Nog ${missing} ${missing === 1 ? 'vraag' : 'vragen'} zonder antwoord`

/**
 * The months of the archive, the newest first. Only quizzes of the old fansite are in it: a
 * quiz of the editors shows nowhere yet. A month has a quiz only when it is published,
 * so a month without one (such as July and August 2003) is not in the list. The average shows
 * only for a month with at least `quizMinimum` participants.
 */
export async function loadArchive(db: Database): Promise<ArchiveMonth[]> {
  const rows = await db
    .select({
      average: quizzes.averageScoreTenths,
      month: quizzes.month,
      participants: quizzes.participants,
      questions: count(quizQuestions.id),
      year: quizzes.year,
    })
    .from(quizzes)
    .leftJoin(quizQuestions, eq(quizQuestions.quizId, quizzes.id))
    .where(and(eq(quizzes.source, 'oude-fansite'), eq(quizzes.status, 'published')))
    .groupBy(quizzes.id)
    .orderBy(desc(quizzes.year), desc(quizzes.month))

  return rows.map(({ average, month, participants, questions, year }) => ({
    averageTenths: enough(participants) ? (average ?? undefined) : undefined,
    month,
    questions,
    year,
  }))
}

/** Whether enough visitors took part for their figures to show. */
const enough = (participants: null | number) => participants !== null && participants >= quizMinimum

/**
 * Checks the answers of one form against the questions. `entries` are the values of the fields,
 * one for each question in order. Every question needs one of the four answers; a question
 * without one gets its own error and the state is not `checked`, so a visitor never sees a
 * score of a quiz they did not finish. The answers that were given stay in the state. Nothing
 * is stored.
 */
export function checkQuiz(questions: readonly QuizViewQuestion[], entries: readonly unknown[]): QuizState {
  const answers: Record<number, number> = {}
  const errors: Record<number, string> = {}

  questions.forEach((question, index) => {
    const entry = entries[index]
    const place = typeof entry === 'string' && /^[1-4]$/.test(entry) ? Number(entry) : undefined

    if (place === undefined) {
      errors[question.position] = missingAnswer(index + 1)
    } else {
      answers[question.position] = place
    }
  })

  return { answers, checked: Object.keys(errors).length === 0, errors }
}

/**
 * One published quiz of the old fansite with its questions in their order, or nothing when the
 * month has none. A quiz of the editors is never read here, so its right answers can't reach a
 * visitor through the archive. The
 * percentages, the average and the number of participants are there only when at least
 * `quizMinimum` visitors took part, so a page can't show a figure of a handful of people.
 */
export async function loadQuiz(db: Database, year: number, month: number): Promise<QuizView | undefined> {
  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(
      and(
        eq(quizzes.year, year),
        eq(quizzes.month, month),
        eq(quizzes.source, 'oude-fansite'),
        eq(quizzes.status, 'published'),
      ),
    )
    .limit(1)

  if (quiz === undefined) {
    return undefined
  }

  const shown = enough(quiz.participants)
  const rows = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quiz.id))
    .orderBy(asc(quizQuestions.position))

  return {
    averageTenths: shown ? (quiz.averageScoreTenths ?? undefined) : undefined,
    month,
    participants: shown ? (quiz.participants ?? undefined) : undefined,
    questions: rows.map((row) => ({
      answers: row.answers,
      // A quiz of the old fansite always has the right answer.
      correct: row.correctAnswer ?? 0,
      percentages: shown ? (row.percentages ?? undefined) : undefined,
      position: row.position,
      text: row.text,
    })),
    year,
  }
}

/** The score of a checked state, "6 van 10". */
export const scoreOf = (questions: readonly QuizViewQuestion[], state: QuizState) =>
  scoreQuiz(
    questions.map((question) => state.answers[question.position]),
    questions.map((question) => question.correct),
  )
