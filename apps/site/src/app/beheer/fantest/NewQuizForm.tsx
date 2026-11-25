'use client'

import { Button, ErrorSummary, Field, Form, Select } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import type { NewQuizState } from '#src/beheer/quiz-fields'

const summaryId = 'fouten'

/**
 * The form that makes a quiz for a month. It is a plain POST that works without JavaScript;
 * with JavaScript the focus goes to the summary after an error.
 */
export function NewQuizForm({
  action,
  initial,
  months,
  years,
}: {
  action: (previous: NewQuizState, formData: FormData) => Promise<NewQuizState>
  initial: NewQuizState['values']
  /** The names of the months, January first. */
  months: readonly string[]
  years: readonly number[]
}) {
  const [state, formAction, pending] = useActionState(action, { errors: {}, values: initial })
  const { errors, values } = state
  const summary = (['maand', 'jaar'] as const).flatMap((id) => {
    const message = errors[id]

    return message === undefined ? [] : [{ id, message }]
  })

  useEffect(() => {
    if (Object.keys(state.errors).length > 0) {
      document.getElementById(summaryId)?.focus()
    }
  }, [state])

  return (
    <>
      <ErrorSummary errors={summary} id={summaryId} level={2} tabIndex={-1} />
      <Form action={formAction}>
        <Field error={errors.maand} id="maand" label="Maand">
          <Select defaultValue={values.maand} key={values.maand} name="maand" width="natural">
            {months.map((name, index) => (
              <Select.Option key={name} value={String(index + 1)}>
                {name}
              </Select.Option>
            ))}
          </Select>
        </Field>
        <Field error={errors.jaar} id="jaar" label="Jaar">
          <Select defaultValue={values.jaar} key={values.jaar} name="jaar" width="natural">
            {years.map((year) => (
              <Select.Option key={year} value={String(year)}>
                {year}
              </Select.Option>
            ))}
          </Select>
        </Field>
        <Button disabled={pending} type="submit">
          Quiz maken
        </Button>
      </Form>
    </>
  )
}
