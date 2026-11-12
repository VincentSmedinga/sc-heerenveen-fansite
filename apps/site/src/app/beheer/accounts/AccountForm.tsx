'use client'

import { Button, ErrorSummary, Field, Form, Input, RadioGroup, Text } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import {
  accountFieldNames,
  type AccountFormState,
  type AccountValues,
  assignableRoles,
  generalError,
  roleLabels,
} from '#src/beheer/account-fields'

const summaryId = 'fouten'

/**
 * The form of an account: the one that adds one, and the one that changes one. Every field has
 * its own error, and the list of errors gets the focus after a save that did not work, also an
 * error that belongs to no field, which has a line of its own above the fields. It works
 * without JavaScript: the server answers with the form again.
 *
 * `kind` decides the fields: a new account has no status, because it is on; the owner's account
 * has no role and no status, because only the command on the host changes those.
 */
export function AccountForm({
  action,
  initial,
  kind,
  submitLabel,
}: {
  action: (previous: AccountFormState, formData: FormData) => Promise<AccountFormState>
  initial: AccountValues
  kind: 'edit' | 'new' | 'owner'
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState(action, { errors: {}, values: initial })
  const { errors, values } = state
  const summary = [generalError, ...accountFieldNames].flatMap((id) => {
    const message = errors[id]

    return message === undefined ? [] : [{ id, message }]
  })

  useEffect(() => {
    if (summary.length > 0) {
      document.getElementById(summaryId)?.focus()
    }
  }, [state, summary.length])

  // The value is the key of a field that a server answer must reset: React keeps what is typed.
  const field = (name: keyof AccountValues) => ({ defaultValue: values[name], key: `${name}-${values[name]}`, name })

  return (
    <Form action={formAction}>
      <ErrorSummary errors={summary} id={summaryId} level={2} tabIndex={-1} />
      {/* An error without a field has a line of its own: its link in the list leads here. */}
      {errors[generalError] === undefined ? null : (
        <Text className="hf-field-error" id={generalError} tabIndex={-1}>
          <Text as="span" className="hf-visually-hidden">
            Fout:
          </Text>{' '}
          {errors[generalError]}
        </Text>
      )}
      <Field
        error={errors.voornaam}
        hint="Staat alleen in het beheer, nooit op de site."
        id="voornaam"
        label="Voornaam"
      >
        <Input autoComplete="off" width="natural" {...field('voornaam')} />
      </Field>
      <Field
        error={errors.adres}
        hint={
          kind === 'new'
            ? 'Hiermee logt de persoon in, met een inloglink. Er gaat nu geen mail uit.'
            : 'Een nieuw adres beëindigt meteen alle sessies en inloglinks van dit account.'
        }
        id="adres"
        label="E-mailadres"
      >
        <Input autoComplete="off" spellCheck={false} type="email" {...field('adres')} />
      </Field>
      {kind === 'owner' ? null : (
        <RadioGroup
          error={errors.rol}
          hint="Een redacteur mag alles behalve accounts beheren. Een auteur schrijft en publiceert alleen zijn eigen artikelen."
          id="rol"
          key={`rol-${values.rol}`}
          legend="Rol"
          name="rol"
          options={assignableRoles.map((role) => ({ label: roleLabels[role], value: role }))}
          value={values.rol}
        />
      )}
      {kind === 'edit' ? (
        <RadioGroup
          error={errors.status}
          hint="Uit beëindigt meteen alle sessies en inloglinks. Het account blijft bestaan, want het logboek verwijst ernaar."
          id="status"
          key={`status-${values.status}`}
          legend="Status"
          name="status"
          options={[
            { label: 'Aan', value: 'aan' },
            { label: 'Uit', value: 'uit' },
          ]}
          value={values.status}
        />
      ) : null}
      <Button disabled={pending} type="submit">
        {submitLabel}
      </Button>
    </Form>
  )
}
