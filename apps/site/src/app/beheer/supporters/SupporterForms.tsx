'use client'

import { Button, ErrorSummary, Field, Form, Input, Notice, Select, Textarea } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import {
  type BlockFormState,
  blockReasons,
  type ForgetFormState,
  noteMaxLength,
  type RenameFormState,
} from '#src/beheer/supporter-fields'

// The forms of the editors on an account of a supporter (issue 1458). Each field has its own
// error, and the list of errors gets the focus after an answer that did not work. They work
// without JavaScript: the server answers with the page again.

/** The form to block one account, with a reason from the list; the button names the account. */
export function BlockForm({
  action,
  screenName,
}: {
  action: (previous: BlockFormState, formData: FormData) => Promise<BlockFormState>
  screenName: string
}) {
  const [state, formAction, pending] = useActionState(action, { errors: {}, values: { reden: '', toelichting: '' } })
  const { errors, values } = state
  const summary = (['reden', 'toelichting'] as const).flatMap((id) => {
    const message = errors[id]

    return message === undefined ? [] : [{ id, message }]
  })

  useFocusOnErrors('block-fouten', summary.length, state)

  return (
    <Form action={formAction}>
      <ErrorSummary errors={summary} id="block-fouten" level={3} tabIndex={-1} />
      <Field
        error={errors.reden}
        hint="De reden staat in het logboek en op de pagina met alle gegevens van de supporter."
        id="reden"
        label="Reden"
      >
        <Select defaultValue={values.reden} key={`reden-${values.reden}`} name="reden">
          <Select.Option value="">Kies een reden</Select.Option>
          {blockReasons.map((reason) => (
            <Select.Option key={reason.value} value={reason.value}>
              {reason.label}
            </Select.Option>
          ))}
        </Select>
      </Field>
      <Field
        error={errors.toelichting}
        hint={`Alleen bij de reden "Anders", en dan verplicht. Hoogstens ${noteMaxLength} tekens.`}
        id="toelichting"
        label="Toelichting"
        required={false}
      >
        <Textarea
          defaultValue={values.toelichting}
          key={`toelichting-${values.toelichting}`}
          maxLength={noteMaxLength * 2}
          name="toelichting"
          rows={3}
        />
      </Field>
      <Button disabled={pending} type="submit">
        Blokkeer {screenName}
      </Button>
    </Form>
  )
}

/** The form of the owner to let a blocked address sign up again. */
export function ForgetAddressForm({
  action,
}: {
  action: (previous: ForgetFormState, formData: FormData) => Promise<ForgetFormState>
}) {
  const [state, formAction, pending] = useActionState(action, { value: '' })
  const summary = state.error === undefined ? [] : [{ id: 'adres', message: state.error }]

  useFocusOnErrors('adres-fouten', summary.length, state)

  return (
    <Form action={formAction}>
      <ErrorSummary errors={summary} id="adres-fouten" level={3} tabIndex={-1} />
      {/* The notice is in the page before the action, so a screen reader reads it. */}
      <Notice>
        {state.done === 'removed'
          ? 'Het adres kan weer aanmelden.'
          : state.done === 'none'
            ? 'Dit adres stond niet in de lijst. Er is niets veranderd.'
            : null}
      </Notice>
      <Field
        error={state.error}
        hint="Het adres wordt niet bewaard: de site zoekt de hash ervan op en haalt die weg."
        id="adres"
        label="E-mailadres"
      >
        <Input
          autoComplete="off"
          defaultValue={state.value}
          key={`${state.value}-${state.done ?? ''}`}
          name="adres"
          spellCheck={false}
          type="email"
        />
      </Field>
      <Button disabled={pending} type="submit">
        Laat dit adres weer aanmelden
      </Button>
    </Form>
  )
}

/** The form to change the screen name of one account. The button says which account. */
export function RenameForm({
  action,
  screenName,
}: {
  action: (previous: RenameFormState, formData: FormData) => Promise<RenameFormState>
  screenName: string
}) {
  const [state, formAction, pending] = useActionState(action, { value: screenName })
  const summary = state.error === undefined ? [] : [{ id: 'schermnaam', message: state.error }]

  useFocusOnErrors('rename-fouten', summary.length, state)

  return (
    <Form action={formAction}>
      <ErrorSummary errors={summary} id="rename-fouten" level={3} tabIndex={-1} />
      <Field
        error={state.error}
        hint="Dezelfde regels als bij het aanmelden. De supporter ziet op Mijn account één keer dat de redactie de naam heeft aangepast."
        id="schermnaam"
        label="Nieuwe schermnaam"
      >
        <Input autoComplete="off" defaultValue={state.value} key={state.value} name="schermnaam" />
      </Field>
      <Button disabled={pending} type="submit">
        Pas de naam van {screenName} aan
      </Button>
    </Form>
  )
}

/** Moves the focus to the list of errors when there are any. */
function useFocusOnErrors(id: string, count: number, state: unknown) {
  useEffect(() => {
    if (count > 0) {
      document.getElementById(id)?.focus()
    }
  }, [count, id, state])
}
