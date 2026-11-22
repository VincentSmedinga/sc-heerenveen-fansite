'use client'

import {
  Button,
  Card,
  CardLink,
  ErrorSummary,
  Form,
  Heading,
  KeyFigures,
  Notice,
  QuizQuestion,
  Strong,
  Text,
} from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import {
  answerField,
  averageText,
  emptyQuizState,
  missingAnswer,
  monthField,
  monthSlug,
  questionId,
  quizSize,
  type QuizState,
  type QuizViewQuestion,
  scoreOf,
  summaryTitle,
} from '#src/fans/fantest'

import { checkQuizAction } from './actions'

// The form of one month: a card for each question and one button. It is a client component only
// to show what the server says and to move the focus: the form is a plain POST that works
// without JavaScript. After an error the focus goes to the summary, whose links bring it to the
// questions. After the check the same questions show again with the right answers, and the
// link "Opnieuw" loads the page anew, so the form is empty again. Nothing is stored.
export function QuizForm({
  averageTenths,
  month,
  participants,
  questions,
  when,
  year,
}: {
  averageTenths: number | undefined
  month: number
  participants: number | undefined
  questions: readonly QuizViewQuestion[]
  /** "mei 2003", for the line under the figures. */
  when: string
  year: number
}) {
  const [state, action] = useActionState<QuizState, FormData>(checkQuizAction, emptyQuizState)
  const errors = questions.flatMap((question, index) =>
    state.errors[question.position] === undefined
      ? []
      : [{ id: questionId(question.position), message: missingAnswer(index + 1) }],
  )
  const missing = questions.length < quizSize

  useEffect(() => {
    if (errors.length > 0) {
      document.getElementById('fantest-fouten')?.focus()
    } else if (state.checked) {
      document.getElementById('fantest-score')?.focus()
    }
    // Only a new answer of the server moves the focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const intro = missing ? (
    <Notice>
      Bij deze maand ontbreekt{' '}
      {quizSize - questions.length === 1 ? 'een vraag' : `${quizSize - questions.length} vragen`}: het plaatje is niet
      bewaard. Je speelt de {questions.length} vragen die er zijn.
    </Notice>
  ) : null

  if (state.checked) {
    const score = scoreOf(questions, state)

    return (
      <>
        <Card aria-labelledby="fantest-score-kop" id="fantest-score" surface="strong" tabIndex={-1}>
          <Heading id="fantest-score-kop" level={2}>
            Je score
          </Heading>
          {participants === undefined || averageTenths === undefined ? (
            <Text>
              <Strong>
                {score} van {questions.length}
              </Strong>
            </Text>
          ) : (
            <KeyFigures
              figures={[
                { figure: String(score), label: `van ${questions.length}`, note: 'jouw score' },
                { figure: averageText(averageTenths), label: 'toen gemiddeld', note: `van ${questions.length}` },
                { figure: String(participants), label: 'deden toen mee', note: `in ${when}` },
              ]}
            />
          )}
        </Card>
        {participants === undefined ? null : <Text appearance="meta">Bij elke vraag: hoe fans het toen deden.</Text>}
        {intro}
        {questions.map((question, index) => (
          <QuizQuestion
            answers={question.answers}
            id={questionId(question.position)}
            key={question.position}
            name={answerField(question.position)}
            number={index + 1}
            question={question.text}
            result={{
              chosen: state.answers[question.position] ?? 0,
              correct: question.correct,
              percentages: question.percentages,
            }}
            total={questions.length}
          />
        ))}
        <CardLink href={`/fans/fantest/${monthSlug(year, month)}`}>Opnieuw</CardLink>
      </>
    )
  }

  return (
    <>
      <ErrorSummary errors={errors} id="fantest-fouten" level={2} tabIndex={-1} title={summaryTitle(errors.length)} />
      {intro}
      <Card aria-labelledby="fantest-vragen-kop">
        <Heading id="fantest-vragen-kop" level={2}>
          {questions.length === quizSize ? 'Tien vragen' : `${questions.length} vragen`}
        </Heading>
        <Text>
          Kies bij elke vraag één antwoord. Daarna zie je meteen hoe je het deed, en hoe fans het in {year} deden.
        </Text>
      </Card>
      <Form action={action}>
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
        <Button name={monthField} type="submit" value={monthSlug(year, month)}>
          Kijk mijn antwoorden na
        </Button>
        <Text appearance="meta">Beantwoord alle {questions.length} vragen</Text>
      </Form>
    </>
  )
}
