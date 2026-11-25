'use client'

import { Button, ErrorSummary, Form, Input, QuizQuestion, Text } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import {
  answerField,
  emptyQuizState,
  missingAnswer,
  monthField,
  questionId,
  type QuizState,
  summaryTitle,
} from '#src/fans/fantest'
import { type MonthQuestion, versionField } from '#src/fans/fantest-entry-fields'

import { submitQuizAction } from './actions'

const summaryId = 'fantest-fouten'

// The form of the quiz of the running month: a card for each question and one button. It is a
// client component only to show what the server says and to move the focus: the form is a plain
// POST that works without JavaScript. After an error the focus goes to the summary, whose links
// bring it to the questions. It gets no right answer, so none can be in the page.
export function MonthQuizForm({
  month,
  questions,
  version,
}: {
  /** The address of the month, "2026-11". */
  month: string
  questions: readonly MonthQuestion[]
  version: string
}) {
  const [state, action] = useActionState<QuizState, FormData>(submitQuizAction, emptyQuizState)
  const errors = questions.flatMap((question, index) =>
    state.errors[question.position] === undefined
      ? []
      : [{ id: questionId(question.position), message: missingAnswer(index + 1) }],
  )

  useEffect(() => {
    if (errors.length > 0) {
      document.getElementById(summaryId)?.focus()
    }
    // Only a new answer of the server moves the focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <>
      <ErrorSummary errors={errors} id={summaryId} level={3} tabIndex={-1} title={summaryTitle(errors.length)} />
      <Form action={action}>
        <Input name={versionField} type="hidden" value={version} />
        {questions.map((question, index) => (
          <QuizQuestion
            answers={question.answers}
            error={state.errors[question.position]}
            id={questionId(question.position)}
            key={question.position}
            name={answerField(question.position)}
            number={index + 1}
            question={question.text}
            total={questions.length}
            value={state.answers[question.position]}
          />
        ))}
        <Button name={monthField} type="submit" value={month}>
          Verstuur mijn antwoorden
        </Button>
        <Text appearance="meta">Beantwoord alle {questions.length} vragen</Text>
      </Form>
    </>
  )
}
