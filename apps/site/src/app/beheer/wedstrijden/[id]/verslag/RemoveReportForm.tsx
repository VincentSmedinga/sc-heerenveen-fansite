'use client'

import { Button, Disclosure, Field, Form, Input, Text } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import type { RemoveReportFormState } from './actions'

/**
 * The block that takes the report of a match away: a Disclosure, so the red button is not one
 * press away, with a reason, as every change asks for one. The button names the match. A
 * missing reason comes back as an error, and the block is open then, also without JavaScript,
 * where the server makes the page again and a closed block would hide the error.
 */
export function RemoveReportForm({
  action,
  title,
}: {
  action: (previous: RemoveReportFormState, formData: FormData) => Promise<RemoveReportFormState>
  title: string
}) {
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.error !== undefined) {
      document.getElementById('verslag-weghalen-reden')?.focus()
    }
  }, [state])

  return (
    <Disclosure open={state.error === undefined ? undefined : true} summary="Verslag weghalen">
      <Text>
        Dit haalt de spelers, de wissels, de kaarten, de gemiste strafschoppen en de schoten van de strafschoppenserie
        weg. De doelpunten gaan terug naar wat Wikipedia zegt.
      </Text>
      <Form action={formAction}>
        <Field
          error={state.error}
          hint="Mag leeg. Komt in het logboek, hoogstens 300 tekens."
          id="verslag-weghalen-reden"
          label="Reden om het verslag weg te halen"
        >
          <Input autoComplete="off" name="reden" />
        </Field>
        <Button appearance="danger" aria-label={`Verslag weghalen voor ${title}`} disabled={pending} type="submit">
          Verslag weghalen
        </Button>
      </Form>
    </Disclosure>
  )
}
