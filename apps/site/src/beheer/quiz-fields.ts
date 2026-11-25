// The fields of the form of a quiz of the editors (issue 1481), for the server and the browser.
// This module imports nothing that must stay on the server.

/** A quiz of the editors has exactly this many questions, in this order. */
export const quizLength = 10

/** A question has exactly four answers. */
export const answerPlaces = [1, 2, 3, 4] as const

export type NewQuizState = { errors: { jaar?: string; maand?: string }; values: { jaar: string; maand: string } }

export type QuestionValues = {
  /** The editors cancelled the question: every answer counts. */
  allesGoed: boolean
  antwoorden: [string, string, string, string]
  /** The place (`1` to `4`) of the right answer, or nothing yet. */
  goed: string
  tekst: string
}

/** The error of each wrong field, by the `id` of the field, in the order of the form. */
export type QuizErrors = Record<string, string>

export type QuizFormState = { errors: QuizErrors; values: QuizValues }

export type QuizValues = {
  intro: string
  slottekst: string
  /** Always ten, in the order of the quiz. */
  vragen: QuestionValues[]
}

/** The names of the fields, which are their `id` as well. `number` is the place in the quiz. */
export const questionField = (number: number) => `vraag-${number}`
export const answerField = (number: number, place: number) => `vraag-${number}-antwoord-${place}`
export const correctField = (number: number) => `vraag-${number}-goed`
export const allCorrectField = (number: number) => `vraag-${number}-alles-goed`

/** The values of the button `knop` that move a question one place. */
export const moveValue = (direction: 'omhoog' | 'omlaag', number: number) => `${direction}-${number}`

export const emptyQuestion = (): QuestionValues => ({
  allesGoed: false,
  antwoorden: ['', '', '', ''],
  goed: '',
  tekst: '',
})
