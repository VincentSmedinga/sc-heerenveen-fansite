'use client'

import { Button, ErrorSummary, Field, Form, Input } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import type { HeldChangeFormState } from './actions'

/**
 * The form that decides one change that Wikipedia holds back: one reason, and two buttons, one
 * that takes Wikipedia over and one that rejects the change. Every button names the match and
 * what changes, so a page with several changes still tells them apart. A missing reason comes
 * back as an error with the focus on the list of errors. The form is a plain POST that works
 * without JavaScript.
 */
export function HeldChangeForm({
  action,
  id,
  title,
  what,
}: {
  action: (previous: HeldChangeFormState, formData: FormData) => Promise<HeldChangeFormState>
  /** The number of the change, so the ids on a page with several forms stay unique. */
  id: number
  /** The name of the match. */
  title: string
  /** What changes, in words: "de uitslag en de doelpunten", "het weghalen van de wedstrijd". */
  what: string
}) {
  const [state, formAction, pending] = useActionState(action, {})
  const reasonId = `wijziging-${id}-reden`
  const summaryId = `wijziging-${id}-fouten`

  useEffect(() => {
    if (state.error !== undefined) {
      document.getElementById(summaryId)?.focus()
    }
  }, [state, summaryId])

  return (
    <>
      <ErrorSummary
        errors={state.error === undefined ? [] : [{ id: reasonId, message: state.error }]}
        id={summaryId}
        level={3}
        tabIndex={-1}
      />
      <Form action={formAction}>
        <Field
          error={state.error}
          hint="Waarom beslis je dit? Komt in het logboek, hoogstens 300 tekens."
          id={reasonId}
          label={`Reden voor je besluit over ${what}`}
        >
          <Input autoComplete="off" name="reden" />
        </Field>
        <Button
          aria-label={`Neem Wikipedia over: ${what} van ${title}`}
          disabled={pending}
          name="besluit"
          type="submit"
          value="overnemen"
        >
          Neem Wikipedia over
        </Button>
        <Button
          appearance="soft"
          aria-label={`Wijs af: ${what} van ${title}`}
          disabled={pending}
          name="besluit"
          type="submit"
          value="afwijzen"
        >
          Wijs af
        </Button>
      </Form>
    </>
  )
}
