'use client'

import { hiddenReasonMaxLength } from '@fansite/db/schema'
import { Button, Field, Form, Input, Select, Text } from '@fansite/design-system'
import { useState } from 'react'

import { hideReasons, otherReasonKey } from '#src/beheer/hide-reasons'

type Props = {
  /** The action of the form, with the item and the list bound to it (`submitHide`). */
  action: (formData: FormData) => Promise<void>
  /** The choice that stood when the last try failed: `anders` keeps its text field open. */
  chosen?: string | undefined
  /** The error at the list, and the error at the text field. */
  errors: { choice?: string | undefined; note?: string | undefined }
  itemId: number
  /** The headline of the item, so the labels say which item they belong to. */
  title: string
}

/**
 * The form that hides one item (#1013): the list of reasons, the text field that is there
 * when "Anders" is chosen, and the button. A client component, since the text field opens with
 * the choice; the server checks the choice again. The form is one line, which breaks only
 * where there is no room.
 */
export function HideForm({ action, chosen, errors, itemId, title }: Props) {
  const [choice, setChoice] = useState(chosen ?? '')
  const other = choice === otherReasonKey

  return (
    <Form action={action} inline>
      <Field
        error={errors.choice}
        id={`reden-${itemId}`}
        label={
          <>
            Reden{' '}
            <Text as="span" className="hf-visually-hidden">
              om “{title}” te verbergen
            </Text>
          </>
        }
      >
        <Select name="reden" onChange={(event) => setChoice(event.target.value)} value={choice}>
          <Select.Option value="">Kies een reden</Select.Option>
          {hideReasons.map(({ key, text }) => (
            <Select.Option key={key} value={key}>
              {text}
            </Select.Option>
          ))}
          <Select.Option value={otherReasonKey}>Anders</Select.Option>
        </Select>
      </Field>
      <Field
        error={other ? errors.note : undefined}
        hidden={!other}
        id={`toelichting-${itemId}`}
        label={
          <>
            Toelichting{' '}
            <Text as="span" className="hf-visually-hidden">
              bij het verbergen van “{title}”
            </Text>
          </>
        }
      >
        <Input autoComplete="off" disabled={!other} maxLength={hiddenReasonMaxLength} name="toelichting" />
      </Field>
      <Button aria-label={`Verberg: ${title}`} type="submit">
        Verberg
      </Button>
    </Form>
  )
}
