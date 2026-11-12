'use client'

import { Button, Disclosure, Field, Form, Input, Text } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import type { RemoveFormState } from './actions'

/**
 * The block that deletes a match the editors added: a Disclosure, so the red button is not one
 * press away, with what goes with the match and a reason, as every change asks for one. A
 * missing reason comes back as an error with the focus, and the block is open then, also
 * without JavaScript.
 */
export function RemoveMatchForm({
  action,
  title,
}: {
  action: (previous: RemoveFormState, formData: FormData) => Promise<RemoveFormState>
  title: string
}) {
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.error !== undefined) {
      document.getElementById('verwijderen-reden')?.focus()
    }
  }, [state])

  return (
    <Disclosure open={state.error === undefined ? undefined : true} summary="Wedstrijd verwijderen">
      <Text>
        Dit verwijdert de wedstrijd met zijn doelpunten, zijn verslag en zijn invoer. Het kan niet terug. Alleen een
        wedstrijd die de redactie toevoegde, kan weg.
      </Text>
      <Form action={formAction}>
        <Field
          error={state.error}
          hideOptional
          hint="Mag leeg. Komt in het logboek, hoogstens 300 tekens."
          id="verwijderen-reden"
          label="Reden om de wedstrijd te verwijderen"
          required={false}
        >
          <Input autoComplete="off" name="reden" />
        </Field>
        <Button appearance="danger" aria-label={`Wedstrijd verwijderen: ${title}`} disabled={pending} type="submit">
          Wedstrijd verwijderen
        </Button>
      </Form>
    </Disclosure>
  )
}
