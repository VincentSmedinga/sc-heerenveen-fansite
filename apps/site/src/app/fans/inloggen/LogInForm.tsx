'use client'

import { Button, ErrorSummary, Field, Form, Input, Notice } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import { limitedMessage, type LogInState, returnParameter } from '#src/fans/log-in-form'
import { failureMessage } from '#src/fans/sign-up-form'

import { requestLogIn } from './actions'

const summaryId = 'fouten'
const failureId = 'mislukt'
const fieldId = 'e-mail'

// The form of logging in. Like the form of signing up, it is a client component only to show
// what the server says: the form is a plain POST that works without JavaScript.
export function LogInForm({ returnTo }: { returnTo: string | undefined }) {
  const [state, action] = useActionState<LogInState, FormData>(requestLogIn, { value: '' })
  const { error, failure, value } = state

  // After a submit the visitor must hear what is wrong: the focus goes to the summary, or to
  // the notice of a limit, which is in the page from the start, so it is announced.
  useEffect(() => {
    if (state.error !== undefined) {
      document.getElementById(summaryId)?.focus()
    } else if (state.failure !== undefined) {
      document.getElementById(failureId)?.focus()
    }
  }, [state])

  return (
    <>
      <ErrorSummary
        errors={error === undefined ? [] : [{ id: fieldId, message: error }]}
        id={summaryId}
        level={2}
        tabIndex={-1}
        title="Kijk nog even naar 1 ding"
      />
      <Notice id={failureId} tabIndex={-1}>
        {failure === 'limited' ? limitedMessage : failure === 'ceiling' ? failureMessage : null}
      </Notice>
      <Form action={action}>
        {returnTo === undefined ? null : <Input name={returnParameter} type="hidden" value={returnTo} />}
        <Field error={error} id={fieldId} label="E-mailadres">
          <Input
            autoCapitalize="off"
            autoComplete="email"
            autoCorrect="off"
            defaultValue={value}
            name={fieldId}
            spellCheck={false}
            type="email"
          />
        </Field>
        <Button type="submit">Stuur me een link</Button>
      </Form>
    </>
  )
}
