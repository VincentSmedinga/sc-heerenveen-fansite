'use client'

import { Button, ErrorSummary, Field, Form, Input } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import type { ConflictFormState } from './actions'

/**
 * The form that decides one difference between Wikipedia and the entry of the editors: one
 * reason, and two buttons, one that takes Wikipedia over and one that keeps the entry. A
 * difference between two other values gives its own words for the buttons (`labels`). Every
 * button names the match and the part, so a page with several differences still tells them
 * apart. A missing reason comes back as an error with the focus on the list of errors. The
 * form is a plain POST that works without JavaScript.
 */
export function ConflictForm({
  action,
  id,
  labels = { keep: 'Houd onze invoer', takeOver: 'Neem Wikipedia over' },
  part,
  title,
}: {
  action: (previous: ConflictFormState, formData: FormData) => Promise<ConflictFormState>
  /** The number of the difference, so the ids on a page with several forms stay unique. */
  id: number
  /** The words of the two buttons. */
  labels?: { keep: string; takeOver: string }
  /** The part in words: "de uitslag". */
  part: string
  /** The name of the match. */
  title: string
}) {
  const [state, formAction, pending] = useActionState(action, {})
  const reasonId = `besluit-${id}-reden`
  const summaryId = `besluit-${id}-fouten`

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
          hint="Mag leeg. Komt in het logboek, hoogstens 300 tekens."
          id={reasonId}
          label={`Reden voor je besluit over ${part}`}
        >
          <Input autoComplete="off" name="reden" />
        </Field>
        <Button
          aria-label={`${labels.takeOver}: ${part} van ${title}`}
          disabled={pending}
          name="besluit"
          type="submit"
          value="overnemen"
        >
          {labels.takeOver}
        </Button>
        <Button
          appearance="soft"
          aria-label={`${labels.keep}: ${part} van ${title}`}
          disabled={pending}
          name="besluit"
          type="submit"
          value="houden"
        >
          {labels.keep}
        </Button>
      </Form>
    </>
  )
}
