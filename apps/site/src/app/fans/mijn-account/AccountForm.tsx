'use client'

import type { ComponentProps } from 'react'

import { Button, ErrorSummary, Field, Form, Input, Link, Notice, Text } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import type { AccountFormState as State } from '#src/fans/account-form'

import { signUpPaths } from '#src/fans/sign-up'

const summaryId = 'fouten'
const failureId = 'mislukt'

// The form of a change on Mijn account: one field, a button and Annuleren, which goes back. It
// is a client component only to show what the server says: the form is a plain POST that works
// without JavaScript. After a submit the focus goes to the summary of the error, or to the
// notice of a limit, which is in the page from the start, so it is announced.
export function AccountForm({
  action: serverAction,
  failureMessage,
  field,
  input,
  submit,
}: {
  action: (previous: State, formData: FormData) => Promise<State>
  failureMessage?: string
  field: { hint?: string; id: string; label: string }
  input: Omit<ComponentProps<typeof Input>, 'defaultValue' | 'id' | 'name'>
  submit: string
}) {
  const [state, action] = useActionState<State, FormData>(serverAction, { value: '' })
  const { error, failure, value } = state

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
        errors={error === undefined ? [] : [{ id: field.id, message: error }]}
        id={summaryId}
        level={2}
        tabIndex={-1}
        title="Kijk nog even naar 1 ding"
      />
      <Notice id={failureId} tabIndex={-1}>
        {failure === undefined ? null : failureMessage}
      </Notice>
      <Form action={action}>
        <Field
          error={error}
          id={field.id}
          label={field.label}
          {...(field.hint === undefined ? {} : { hint: field.hint })}
        >
          <Input
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            {...input}
            defaultValue={value}
            name={field.id}
          />
        </Field>
        <Button type="submit">{submit}</Button>
        <Text>
          <Link href={signUpPaths.account}>Annuleren</Link>
        </Text>
      </Form>
    </>
  )
}
