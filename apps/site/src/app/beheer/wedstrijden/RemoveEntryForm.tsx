'use client'

import { Button, Disclosure, Field, Form, Input, Text } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import type { RemoveFormState } from './actions'

/**
 * The block that takes the entry of a match away: a Disclosure, so the red button is not one
 * press away, with a reason, as every change asks for one. The button names the match. A
 * missing reason comes back as an error, and the block is open then, also without JavaScript,
 * where the server makes the page again and a closed block would hide the error.
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
    <Disclosure open={state.error === undefined ? undefined : true} summary="Invoer weghalen">
      <Text>
        Dit zet de wedstrijd terug naar wat er stond voor de eerste invoer. Daarna leest de import weer wat Wikipedia
        zegt.
      </Text>
      <Form action={formAction}>
        <Field
          error={state.error}
          hideOptional
          hint="Mag leeg. Komt in het logboek, hoogstens 300 tekens."
          id="weghalen-reden"
          label="Reden om de invoer weg te halen"
          required={false}
        >
          <Input autoComplete="off" name="reden" />
        </Field>
        <Button appearance="danger" aria-label={`Invoer weghalen voor ${title}`} disabled={pending} type="submit">
          Invoer weghalen
        </Button>
      </Form>
    </Disclosure>
  )
}
