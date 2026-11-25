import { scoreQuiz } from '@fansite/shared/quiz-score'

// The words, the addresses and the form of the Fantest, without the database, so the browser
// can use them too. A visitor plays a month that is over, of the old fansite (issue 1480) or
// of the editors (issue 1484), and the answers are checked and forgotten. fantest-months.ts
// reads those months; the quiz of the running month, which a supporter takes part in, is in
// fantest-entry.ts.

/** The address of the page of the Fantest: the quiz of the month and the archive. */
export const fantestPath = '/fans/fantest'

/** The ranking per calendar year and month (issue 1483). */
export const fantestRankingPath = `${fantestPath}/ranglijst`

/** A quiz has ten questions; one with fewer has a question that was left out. */
export const quizSize = 10

/** The percentages and the averages of a month show with at least this many participants. */
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
  /**
   * What only a quiz of the editors has (issue 1484). `count` is how many took part, also when
   * that is too few for the other figures, and `allRight` how many had every question right.
   */
  recent?: undefined | { allRight: number | undefined; closingText: string; count: number; intro: string }
  year: number
}

export type QuizViewQuestion = {
  /** The editors cancelled the question: every answer counts. */
  allCorrect?: boolean
  answers: [string, string, string, string]
  /** The place (1 to 4) of the right answer. */
  correct: number
  percentages: [number, number, number, number] | undefined
  /** The place in the quiz, which names the field. */
  position: number
  text: string
}

export const emptyQuizState: QuizState = { answers: {}, checked: false, errors: {} }

/** "Kies een antwoord bij vraag 3." The number is the place in this quiz, from 1. */
export const missingAnswer = (number: number) => `Kies een antwoord bij vraag ${number}.`

export const summaryTitle = (missing: number) => `Nog ${missing} ${missing === 1 ? 'vraag' : 'vragen'} zonder antwoord`

/**
 * Checks the answers of one form against the questions. `entries` are the values of the fields,
 * one for each question in order. Every question needs one of the four answers; a question
 * without one gets its own error and the state is not `checked`, so a visitor never sees a
 * score of a quiz they did not finish. The answers that were given stay in the state. Nothing
 * is stored.
 */
export function checkQuiz(
  questions: readonly Pick<QuizViewQuestion, 'position'>[],
  entries: readonly unknown[],
): QuizState {
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
 * The score of the chosen answers, by the position of each question. Of a question with "alles
 * goed" every answer counts.
 */
export const scoreOf = (questions: readonly QuizViewQuestion[], answers: QuizState['answers']) =>
  scoreQuiz(
    questions.map((question) => answers[question.position]),
    questions.map((question) => (question.allCorrect ? (answers[question.position] ?? 0) : question.correct)),
  )
