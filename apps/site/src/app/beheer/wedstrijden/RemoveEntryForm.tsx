'use client'

import { Button, Field, Form, Input } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import type { RemoveFormState } from './actions'

/**
 * The form that takes the entry of a match away. It asks for a reason, as every change does,
 * and names the match in the button, so a list of such buttons would still be told apart.
 */
export function RemoveEntryForm({
  action,
  title,
}: {
  action: (previous: RemoveFormState, formData: FormData) => Promise<RemoveFormState>
  title: string
}) {
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.error !== undefined) {
      document.getElementById('weghalen-reden')?.focus()
    }
  }, [state])

  return (
    <Form action={formAction}>
      <Field
        error={state.error}
        hint="Waarom haal je de invoer weg? Komt in het logboek, hoogstens 300 tekens."
        id="weghalen-reden"
        label="Reden om de invoer weg te halen"
      >
        <Input autoComplete="off" name="reden" />
      </Field>
      <Button appearance="soft" disabled={pending} type="submit">
        Invoer weghalen voor {title}
      </Button>
    </Form>
  )
}
