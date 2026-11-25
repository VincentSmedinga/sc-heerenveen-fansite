import { quizLimits } from '@fansite/db/schema'

import {
  allCorrectField,
  answerField,
  answerPlaces,
  correctField,
  questionField,
  type QuizErrors,
  quizLength,
  type QuizValues,
} from './quiz-fields'

// What an editor types in the form of a quiz: read as text, cleaned, and checked. The server
// does this for every request, whatever the browser did.

/** What a button of the form asks for. */
export type QuizIntent = { from: number; kind: 'move'; to: number } | { kind: 'publish' } | { kind: 'save' }

const lengthOf = (value: string) => [...value].length

/** A line of text: control characters and runs of spaces become one space, and the ends go. */
const line = (value: string) => value.replaceAll(/[\p{Cc}\s]+/gu, ' ').trim()

/** Plain text with lines: the ends go, and other control characters than the newline too. */
const block = (value: string) =>
  value
    .replaceAll('\r\n', '\n')
    .replaceAll(/(?!\n)\p{Cc}/gu, ' ')
    .trim()

/** The button that was pressed: `knop` is `publiceren`, `omhoog-3`, `omlaag-3` or nothing. */
export function readIntent(formData: FormData): QuizIntent {
  const button = formData.get('knop')

  if (button === 'publiceren') {
    return { kind: 'publish' }
  }

  const move = typeof button === 'string' ? /^(omhoog|omlaag)-([1-9]|10)$/u.exec(button) : null

  if (move !== null) {
    const from = Number(move[2])
    const to = move[1] === 'omhoog' ? from - 1 : from + 1

    if (to >= 1 && to <= quizLength) {
      return { from, kind: 'move', to }
    }
  }

  return { kind: 'save' }
}

export function readQuizValues(formData: FormData): QuizValues {
  const text = (name: string) => {
    const value = formData.get(name)

    return typeof value === 'string' ? value : ''
  }

  return {
    intro: block(text('intro')),
    slottekst: block(text('slottekst')),
    vragen: Array.from({ length: quizLength }, (_, index) => {
      const number = index + 1
      const correct = text(correctField(number))

      return {
        allesGoed: text(allCorrectField(number)) === 'ja',
        antwoorden: answerPlaces.map((place) => line(text(answerField(number, place)))) as [
          string,
          string,
          string,
          string,
        ],
        goed: /^[1-4]$/u.test(correct) ? correct : '',
        tekst: line(text(questionField(number))),
      }
    }),
  }
}

/** The values with the questions of the places `from` and `to` swapped. */
export function swapQuestions(values: QuizValues, from: number, to: number): QuizValues {
  const vragen = [...values.vragen]
  const first = vragen[from - 1]
  const second = vragen[to - 1]

  if (first === undefined || second === undefined) {
    return values
  }

  vragen[from - 1] = second
  vragen[to - 1] = first

  return { ...values, vragen }
}

const tooLong = (what: string, limit: number, length: number) =>
  `${what} is te lang. Gebruik hoogstens ${limit} tekens, nu zijn het er ${length}.`

/**
 * What is wrong with the values, by field, in the order of the form. A draft may be unfinished,
 * so it is only checked for texts that don't fit. With `complete`, for a quiz that is or goes
 * public, every question also needs its text, its four answers and the right answer.
 */
export function validateQuiz({ intro, slottekst, vragen }: QuizValues, complete: boolean): QuizErrors {
  const errors: QuizErrors = {}
  const check = (id: string, value: string, limit: number, what: string, missing?: string) => {
    if (complete && missing !== undefined && value === '') {
      errors[id] = missing
    } else if (lengthOf(value) > limit) {
      errors[id] = tooLong(what, limit, lengthOf(value))
    }
  }

  check('intro', intro, quizLimits.intro, 'De inleiding')
  check('slottekst', slottekst, quizLimits.closingText, 'De slottekst')

  vragen.forEach(({ antwoorden, goed, tekst }, index) => {
    const number = index + 1

    check(
      questionField(number),
      tekst,
      quizLimits.question,
      `De tekst van vraag ${number}`,
      `Schrijf de tekst van vraag ${number}.`,
    )
    answerPlaces.forEach((place) => {
      check(
        answerField(number, place),
        antwoorden[place - 1] ?? '',
        quizLimits.answer,
        `Antwoord ${place} van vraag ${number}`,
        `Vul antwoord ${place} van vraag ${number} in.`,
      )
    })

    if (complete && goed === '') {
      errors[correctField(number)] = `Kies het goede antwoord van vraag ${number}.`
    }
  })

  return errors
}
