import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { Text } from '../text/Text'

/** The answers of a question of the Fantest: four, in the order shown. */
export type QuizAnswers = readonly [string, string, string, string]

export type QuizQuestionProps = Omit<ComponentPropsWithoutRef<'div'>, 'aria-describedby' | 'children' | 'id'> & {
  /** The four answers. */
  answers: QuizAnswers
  /**
   * What is wrong with the answer, and how to put it right. Without it, the question has no
   * error. It is text under the question, and the group points to it with `aria-describedby`.
   */
  error?: string | undefined
  /**
   * The `id` of the question. It is the `id` of the first radio button, so a link in an
   * ErrorSummary goes to it; the others get a number after it.
   */
  id: string
  /** The name the form sends the chosen answer under. */
  name: string
  /** The number of this question in the quiz, from 1. */
  number: number
  /** The question, in the words the quiz asks it. */
  question: string
  /** Shows the question as checked, with the right answer and the percentages, and no form. */
  result?: QuizQuestionResult | undefined
  /** How many questions the quiz has, so the card says "Vraag 3 van 10". */
  total: number
  /** The place (1 to 4) of the answer that is chosen when the page opens. Without it, none. */
  value?: number | string | undefined
}

/**
 * What a question looks like after it is checked: which answer is right and which one the
 * player chose, both as a place from 1 to 4, and how many percent of the others chose each
 * answer. Without `percentages` the card shows none.
 */
export type QuizQuestionResult = {
  /** The question was cancelled: no answer is marked, and every choice is good. */
  allCorrect?: boolean | undefined
  /**
   * The place (1 to 4) of the answer the player chose. Without it, the card is for somebody who
   * only reads: it names the right answer and has no "Goed." or "Fout.".
   */
  chosen?: number | undefined
  /** The place (1 to 4) of the right answer. */
  correct: number
  /** The percentage of each answer, in the order of the answers. */
  percentages?: null | readonly number[] | undefined
}

/**
 * One question of a quiz, in a card of its own: a small "Vraag 3 van 10", the question and four
 * answers as large rows, of which the whole row can be chosen. It is a group of radio buttons
 * with the question as its legend, so it works without JavaScript and with the keyboard (the
 * arrow keys move between the answers), and a question has its own error that the group points
 * to. With `result` it shows the same question after it is checked: the right answer in bold
 * and green, a wrong choice of the player in red, the percentage of each answer, and under them
 * "Goed." or "Fout. Het goede antwoord is …", and without a choice "Het goede antwoord is …".
 * Of a cancelled question (`allCorrect`) no answer is marked, and the card says that every
 * answer counts. Colour is never the only sign: the words, the bold and the percentage say the
 * same. quiz-question.css gives it its look.
 */
export const QuizQuestion = ({
  answers,
  className,
  error,
  id,
  name,
  number,
  question,
  result,
  total,
  value,
  ...props
}: QuizQuestionProps) => {
  const errorId = `${id}-error`
  const chosen = value === undefined || value === '' ? undefined : String(value)

  return (
    <div className={classNames('hf-card hf-quiz-question', className)} {...props}>
      <Text appearance="meta" className="hf-quiz-question-number">
        Vraag {number} van {total}
      </Text>
      {result === undefined ? (
        <fieldset
          aria-describedby={error ? errorId : undefined}
          className="hf-quiz-question-group"
          data-invalid={error ? '' : undefined}
        >
          <legend className="hf-quiz-question-text">{question}</legend>
          {error ? (
            <Text className="hf-field-error" id={errorId}>
              <span className="hf-visually-hidden">Fout:</span> {error}
            </Text>
          ) : null}
          <div className="hf-quiz-question-answers">
            {answers.map((answer, index) => (
              <label className="hf-quiz-question-answer" key={answer + index}>
                <input
                  defaultChecked={String(index + 1) === chosen}
                  id={index === 0 ? id : `${id}-${index + 1}`}
                  name={name}
                  required
                  type="radio"
                  value={index + 1}
                />
                <span>{answer}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className="hf-quiz-question-group">
          <h3 className="hf-quiz-question-text" id={`${id}-question`}>
            {question}
          </h3>
          <ul aria-labelledby={`${id}-question`} className="hf-quiz-question-answers" role="list">
            {answers.map((answer, index) => {
              const place = index + 1
              const isCorrect = !result.allCorrect && place === result.correct
              const isChosen = place === result.chosen
              const percentage = result.percentages?.[index]

              return (
                <li
                  className={classNames(
                    'hf-quiz-question-answer',
                    'hf-quiz-question-checked',
                    isCorrect && 'hf-quiz-question-correct',
                    isChosen && !isCorrect && !result.allCorrect && 'hf-quiz-question-wrong',
                  )}
                  key={answer + index}
                >
                  <span className="hf-quiz-question-answer-text">
                    {answer}
                    {isChosen ? <span className="hf-quiz-question-mark">Jouw keuze</span> : null}
                    {isCorrect ? <span className="hf-visually-hidden">, goed antwoord</span> : null}
                    {isChosen && !isCorrect && !result.allCorrect ? (
                      <span className="hf-visually-hidden">, fout antwoord</span>
                    ) : null}
                  </span>
                  {percentage === undefined ? null : <span className="hf-quiz-question-percentage">{percentage}%</span>}
                </li>
              )
            })}
          </ul>
          <Text className="hf-quiz-question-verdict">
            <QuizVerdict answers={answers} result={result} />
          </Text>
        </div>
      )}
    </div>
  )
}

/** The line under a checked question. */
const QuizVerdict = ({ answers, result }: { answers: QuizAnswers; result: QuizQuestionResult }) => {
  if (result.allCorrect) {
    return (
      <>
        {result.chosen === undefined ? null : (
          <>
            <strong>Goed.</strong>{' '}
          </>
        )}
        Bij deze vraag telt elk antwoord als goed.
      </>
    )
  }

  const right = `Het goede antwoord is ${answers[result.correct - 1]}.`

  if (result.chosen === undefined) {
    return right
  }

  return result.chosen === result.correct ? (
    <strong>Goed.</strong>
  ) : (
    <>
      <strong>Fout.</strong> {right}
    </>
  )
}
