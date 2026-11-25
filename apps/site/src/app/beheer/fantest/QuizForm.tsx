'use client'

import {
  Button,
  Card,
  ErrorSummary,
  Field,
  Form,
  Heading,
  Input,
  RadioGroup,
  Select,
  Text,
  Textarea,
} from '@fansite/design-system'
import { useActionState, useEffect, useState } from 'react'

import { quizFormId } from '#src/beheer/form-ids'
import {
  allCorrectField,
  answerField,
  answerPlaces,
  correctField,
  moveValue,
  questionField,
  type QuestionValues,
  type QuizFormState,
  type QuizValues,
} from '#src/beheer/quiz-fields'

const summaryId = 'fouten'

/** Where the quiz stands, which decides the fields and the buttons. */
export type QuizFormStage = 'draft' | 'locked' | 'published'

/**
 * The form of a quiz: the introduction, ten questions with four answers and the right one, and
 * the closing text. "Opslaan" is the button the Enter key presses (the toolbar of the page has
 * it first), "Quiz publiceren" saves and publishes, and each question has buttons to move it
 * one place, which save the form too. A locked quiz shows its questions as text and takes only
 * the closing text and "alles goed" per question. It works without JavaScript; with JavaScript
 * the focus goes to the summary after an error.
 */
export function QuizForm({
  action,
  initial,
  maxLengths,
  stage,
}: {
  action: (previous: QuizFormState, formData: FormData) => Promise<QuizFormState>
  initial: QuizValues
  maxLengths: { answer: number; closingText: number; intro: number; question: number }
  stage: QuizFormStage
}) {
  const [state, formAction, pending] = useActionState(action, { errors: {}, values: initial })
  const { errors, values } = state
  const locked = stage === 'locked'
  const summary = Object.entries(errors).map(([id, message]) => ({ id, message }))
  // React empties a form after its action, so every answer of the server draws it anew.
  const [answer, setAnswer] = useState({ count: 0, state })

  if (answer.state !== state) {
    setAnswer({ count: answer.count + 1, state })
  }

  useEffect(() => {
    if (Object.keys(state.errors).length > 0) {
      document.getElementById(summaryId)?.focus()
    }
  }, [state])

  const closing = (
    <Field
      error={errors['slottekst']}
      hint={`Staat onder de uitslag, na het insturen. Gewone tekst, hoogstens ${maxLengths.closingText} tekens.`}
      id="slottekst"
      label="Slottekst"
      required={false}
    >
      <Textarea autoComplete="off" defaultValue={values.slottekst} name="slottekst" rows={4} />
    </Field>
  )

  return (
    <>
      <ErrorSummary errors={summary} id={summaryId} level={2} tabIndex={-1} />
      <Form action={formAction} id={quizFormId} key={answer.count}>
        {locked ? null : (
          <Field
            error={errors['intro']}
            hint={`Staat boven de vragen. Gewone tekst, hoogstens ${maxLengths.intro} tekens.`}
            id="intro"
            label="Inleiding"
            required={false}
          >
            <Textarea autoComplete="off" defaultValue={values.intro} name="intro" rows={4} />
          </Field>
        )}
        {values.vragen.map((question, index) => (
          <Question
            errors={errors}
            key={index}
            locked={locked}
            maxLengths={maxLengths}
            number={index + 1}
            pending={pending}
            question={question}
            total={values.vragen.length}
          />
        ))}
        {closing}
        <Button className="hf-space-end-0" disabled={pending} type="submit">
          Opslaan
        </Button>
        {stage === 'draft' ? (
          <Button appearance="soft" disabled={pending} name="knop" type="submit" value="publiceren">
            Quiz publiceren
          </Button>
        ) : null}
      </Form>
    </>
  )
}

/** The card of one question. The names of its fields and buttons say which question it is. */
function Question({
  errors,
  locked,
  maxLengths,
  number,
  pending,
  question,
  total,
}: {
  errors: Record<string, string>
  locked: boolean
  maxLengths: { answer: number; question: number }
  number: number
  pending: boolean
  question: QuestionValues
  total: number
}) {
  const headingId = `vraag-${number}-kop`

  return (
    <Card aria-labelledby={headingId}>
      {/* The page brings the focus here after the question moved. */}
      <Heading id={headingId} level={2} tabIndex={-1}>
        Vraag {number}
      </Heading>
      {locked ? (
        <>
          <Text>{question.tekst}</Text>
          {answerPlaces.map((place) => (
            <Text key={place}>
              Antwoord {place}: {question.antwoorden[place - 1]}
              {question.goed === String(place) ? ' (goed antwoord)' : ''}
            </Text>
          ))}
        </>
      ) : (
        <>
          <Field
            error={errors[questionField(number)]}
            hideOptional
            hint={`Hoogstens ${maxLengths.question} tekens.`}
            id={questionField(number)}
            label={`Tekst van vraag ${number}`}
            required={false}
          >
            <Textarea autoComplete="off" defaultValue={question.tekst} name={questionField(number)} rows={2} />
          </Field>
          {answerPlaces.map((place) => (
            <Field
              error={errors[answerField(number, place)]}
              hideOptional
              id={answerField(number, place)}
              key={place}
              label={`Antwoord ${place} van vraag ${number}`}
              required={false}
            >
              <Input
                autoComplete="off"
                defaultValue={question.antwoorden[place - 1]}
                name={answerField(number, place)}
              />
            </Field>
          ))}
          <Field
            error={errors[correctField(number)]}
            hideOptional
            id={correctField(number)}
            label={`Goede antwoord van vraag ${number}`}
            required={false}
          >
            <Select defaultValue={question.goed} name={correctField(number)} width="natural">
              <Select.Option value="">Kies een antwoord</Select.Option>
              {answerPlaces.map((place) => (
                <Select.Option key={place} value={String(place)}>
                  Antwoord {place}
                </Select.Option>
              ))}
            </Select>
          </Field>
        </>
      )}
      <RadioGroup
        hideOptional
        hint="Alles goed is voor een slechte vraag: dan telt elk antwoord."
        id={allCorrectField(number)}
        legend={`Nakijken van vraag ${number}`}
        name={allCorrectField(number)}
        options={[
          { label: 'Alleen het goede antwoord telt', value: 'nee' },
          { label: 'Alles goed', value: 'ja' },
        ]}
        required={false}
        value={question.allesGoed ? 'ja' : 'nee'}
      />
      {locked ? null : (
        <Form.Buttons>
          {number > 1 ? (
            <Button appearance="soft" disabled={pending} name="knop" type="submit" value={moveValue('omhoog', number)}>
              Vraag {number} omhoog
            </Button>
          ) : null}
          {number < total ? (
            <Button appearance="soft" disabled={pending} name="knop" type="submit" value={moveValue('omlaag', number)}>
              Vraag {number} omlaag
            </Button>
          ) : null}
        </Form.Buttons>
      )}
    </Card>
  )
}
