'use client'

import { Button, Form, Link, Text } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import type { MergeFormState } from '../actions'

const errorId = 'samenvoegen-fout'

/**
 * The form that merges two persons: one button, whose text names both persons, and the link
 * that goes back without merging. Nothing moves before the button is pressed. A merge that
 * failed comes back as an error above the button, which gets the focus because it belongs to
 * no field. It works without JavaScript: the server answers with the page again.
 */
export function MergeForm({
  action,
  backHref,
  backLabel,
  label,
}: {
  action: () => Promise<MergeFormState>
  backHref: string
  backLabel: string
  /** The text of the button: "Voeg X samen met Y". */
  label: string
}) {
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.error !== undefined) {
      document.getElementById(errorId)?.focus()
    }
  }, [state])

  return (
    <Form action={formAction}>
      {state.error === undefined ? null : (
        <Text className="hf-field-error" id={errorId} tabIndex={-1}>
          <Text as="span" className="hf-visually-hidden">
            Fout:
          </Text>{' '}
          {state.error}
        </Text>
      )}
      <Button appearance="danger" disabled={pending} type="submit">
        {label}
      </Button>
      <Text>
        <Link href={backHref}>{backLabel}</Link>
      </Text>
    </Form>
  )
}
