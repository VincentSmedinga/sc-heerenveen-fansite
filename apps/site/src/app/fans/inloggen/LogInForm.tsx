'use client'

import { Button, ErrorSummary, Field, Form, Input, Notice } from '@fansite/design-system'
import { type ReactNode, useActionState, useEffect } from 'react'

import { emptyLogInState, limitedMessage, type LogInState, returnParameter } from '#src/fans/log-in-form'
import { failureMessage } from '#src/fans/sign-up-form'

import { requestLogIn } from './actions'

const summaryId = 'fouten'
const failureId = 'mislukt'
const fieldId = 'e-mail'

/** The state of the form of logging in and its action, for the form and for what holds it. */
export const useLogIn = () => useActionState<LogInState, FormData>(requestLogIn, emptyLogInState)

/**
 * The errors, the messages of the limits and the form itself. `beside` stands next to the
 * button, and under it where there is no room. `summaryLevel` is the level of the heading of
 * the list of errors, which is one under the heading above the form.
 */
export function LogInFields({
  beside,
  logIn: [state, action],
  returnTo,
  summaryLevel = 2,
}: {
  beside?: ReactNode
  logIn: ReturnType<typeof useLogIn>
  returnTo: string | undefined
  summaryLevel?: 2 | 3 | 4
}) {
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

  const send = <Button type="submit">Stuur me een link</Button>

  return (
    <>
      <ErrorSummary
        errors={error === undefined ? [] : [{ id: fieldId, message: error }]}
        id={summaryId}
        level={summaryLevel}
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
        {beside === undefined ? (
          send
        ) : (
          <Form.Actions>
            {send}
            {beside}
          </Form.Actions>
        )}
      </Form>
    </>
  )
}

// The form of logging in, on the page to log in and on the pages of Fans (LogInCard). Like the
// form of signing up, it is a client component only to show what the server says: the form is a
// plain POST that works without JavaScript.
export function LogInForm({ returnTo }: { returnTo: string | undefined }) {
  return <LogInFields logIn={useLogIn()} returnTo={returnTo} />
}
