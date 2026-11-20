'use client'

import { Button, Card, ErrorSummary, Field, Form, Heading, Input, Text } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import { emailHint, failureMessages, screenNameHint, signUpFields, type SignUpState } from '#src/fans/sign-up-form'

import { signUp } from './actions'

const summaryId = 'fouten'
const failureId = 'mislukt'

// The form of signing up. It is a client component only to show what the server says: the form
// is a plain POST that works without JavaScript, and with JavaScript the page doesn't reload.
export function SignUpForm({ initial }: { initial: SignUpState }) {
  const [state, action] = useActionState<SignUpState, FormData>(signUp, initial)
  const { errors, failure, values } = state
  const summary = (['screenName', 'email'] as const).flatMap((name) => {
    const message = errors[name]

    return message === undefined ? [] : [{ id: signUpFields[name], message }]
  })

  // After a submit the visitor must hear what is wrong: the focus goes to the summary, or to
  // the block of a failure that is not about a field.
  useEffect(() => {
    if (state.errors.screenName !== undefined || state.errors.email !== undefined) {
      document.getElementById(summaryId)?.focus()
    } else if (state.failure !== undefined) {
      document.getElementById(failureId)?.focus()
    }
  }, [state])

  return (
    <>
      <ErrorSummary
        errors={summary}
        id={summaryId}
        level={2}
        tabIndex={-1}
        title={summary.length === 1 ? 'Kijk nog even naar 1 ding' : `Kijk nog even naar ${summary.length} dingen`}
      />
      {failure === undefined ? null : (
        <Card aria-labelledby={`${failureId}-kop`} id={failureId} surface="soft" tabIndex={-1}>
          <Heading id={`${failureId}-kop`} level={2}>
            Even niet
          </Heading>
          <Text>{failureMessages[failure]}</Text>
        </Card>
      )}
      <Form action={action}>
        <Field error={errors.screenName} hint={screenNameHint} id={signUpFields.screenName} label="Schermnaam">
          <Input
            autoCapitalize="off"
            autoComplete="nickname"
            autoCorrect="off"
            defaultValue={values.screenName}
            name={signUpFields.screenName}
            spellCheck={false}
          />
        </Field>
        <Field error={errors.email} hint={emailHint} id={signUpFields.email} label="E-mailadres">
          <Input
            autoCapitalize="off"
            autoComplete="email"
            autoCorrect="off"
            defaultValue={values.email}
            name={signUpFields.email}
            spellCheck={false}
            type="email"
          />
        </Field>
        <Button type="submit">Account maken</Button>
      </Form>
    </>
  )
}
