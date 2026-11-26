'use client'

import { Button, Form, Text } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import type { SquadMarkState } from './actions'

const errorId = 'selectie-compleet-fout'

/**
 * The form with the one button that marks the squad of a season as complete, or takes the mark
 * back (issue 1675). The text of the button names the season. An action that failed comes back
 * as an error above the button, which gets the focus because it belongs to no field. It works
 * without JavaScript: the server answers with the page again.
 */
export function SquadMarkForm({ action, label }: { action: () => Promise<SquadMarkState>; label: string }) {
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
      <Button appearance="soft" disabled={pending} type="submit">
        {label}
      </Button>
    </Form>
  )
}
