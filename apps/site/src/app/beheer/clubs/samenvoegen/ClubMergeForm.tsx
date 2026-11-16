'use client'

import { Button, ErrorSummary, Field, Form, Input, Link, Text } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import type { MergeClubsState } from '../actions'

const summaryId = 'samenvoegen-fouten'
const fieldId = 'sinds'

/**
 * The form that merges two clubs: the optional season the name that stays begins in, one button
 * whose text names both clubs, and the link that goes back without merging. Nothing moves
 * before the button is pressed. An error is at its field and in the list of errors, which gets
 * the focus. It works without JavaScript: the server answers with the page again.
 */
export function ClubMergeForm({
  action,
  backHref,
  backLabel,
  keptName,
  label,
}: {
  action: (previous: MergeClubsState, formData: FormData) => Promise<MergeClubsState>
  backHref: string
  backLabel: string
  /** The name of the club that stays, for the label of the field. */
  keptName: string
  /** The text of the button: "Voeg X samen met Y". */
  label: string
}) {
  const [state, formAction, pending] = useActionState<MergeClubsState, FormData>(action, {})

  useEffect(() => {
    if (state.error !== undefined) {
      document.getElementById(summaryId)?.focus()
    }
  }, [state])

  return (
    <>
      <ErrorSummary
        errors={state.error === undefined ? [] : [{ id: fieldId, message: state.error }]}
        id={summaryId}
        level={2}
        tabIndex={-1}
      />
      <Form action={formAction}>
        <Field
          error={state.error}
          hint={`Zoals 2002/03. Laat het leeg als je het seizoen niet weet: dan wordt de naam die verdwijnt een andere naam van ${keptName}, zonder jaren.`}
          id={fieldId}
          label="De blijvende naam heet sinds seizoen"
          required={false}
        >
          <Input autoComplete="off" defaultValue={state.sinds ?? ''} name="sinds" type="text" />
        </Field>
        <Button appearance="danger" disabled={pending} type="submit">
          {label}
        </Button>
        <Text>
          <Link href={backHref}>{backLabel}</Link>
        </Text>
      </Form>
    </>
  )
}
