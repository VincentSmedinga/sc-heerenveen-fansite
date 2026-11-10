'use client'

import { Button, Card, ErrorSummary, Field, Form, Heading, Input, Link, Select, Text } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import {
  newPersonChoice,
  type PlayerFieldName,
  playerFieldNames,
  type PlayerFormState,
  type PlayerValues,
  positionChoices,
} from '#src/beheer/player-fields'

const summaryId = 'fouten'

/**
 * The form of a player: the one that adds a player to a season, and the one that changes him.
 * The form that adds has the list of the persons the search found (`people`), with "Een nieuwe
 * persoon" as its last choice; the fields of the name and the title are for a new person only,
 * so they are not required while there is a list. Every field has its own error, and the list
 * of errors gets the focus after a save that did not work, also an error that belongs to no
 * field (`algemeen`), which has a line of its own above the fields. It works without
 * JavaScript: the server answers with the form again.
 */
export function PlayerForm({
  action,
  cancelHref,
  initial,
  nameHint,
  people,
  submitLabel,
}: {
  action: (previous: PlayerFormState, formData: FormData) => Promise<PlayerFormState>
  cancelHref: string
  initial: PlayerValues
  /** What a change of the name does, under the field of the family name. */
  nameHint?: string | undefined
  /** The persons to choose from. Without it the form has no list: it changes a player. */
  people?: readonly { id: number; label: string }[]
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState(action, { errors: {}, values: initial })
  const { errors, values } = state
  const choosing = people !== undefined && people.length > 0
  const summary = [...playerFieldNames, 'algemeen' as const].flatMap((id) => {
    const message = errors[id]

    return message === undefined ? [] : [{ id, message }]
  })

  useEffect(() => {
    if (summary.length > 0) {
      document.getElementById(summaryId)?.focus()
    }
  }, [state, summary.length])

  // The value is the key of a field that a server answer must reset: React keeps what is typed.
  const field = (name: PlayerFieldName) => ({ defaultValue: values[name], key: `${name}-${values[name]}`, name })
  const forNewPerson = choosing ? 'Alleen voor een nieuwe persoon. ' : ''
  const achternaamHint = choosing ? 'Alleen voor een nieuwe persoon, en dan verplicht.' : nameHint

  return (
    <Form action={formAction}>
      <ErrorSummary errors={summary} id={summaryId} level={2} tabIndex={-1} />
      {/* An error without a field has a line of its own: its link in the list leads here. */}
      {errors.algemeen === undefined ? null : (
        <Text className="hf-field-error" id="algemeen" tabIndex={-1}>
          <Text as="span" className="hf-visually-hidden">
            Fout:
          </Text>{' '}
          {errors.algemeen}
        </Text>
      )}
      <Card aria-labelledby="wie-kop">
        <Heading id="wie-kop" level={2}>
          Wie
        </Heading>
        {choosing ? (
          <Field
            error={errors.persoon}
            hint="Kies de persoon als we hem al kennen. Hij blijft dan in elk seizoen dezelfde persoon."
            id="persoon"
            label="Persoon"
          >
            <Select {...field('persoon')}>
              {people.map((person) => (
                <Select.Option key={person.id} value={String(person.id)}>
                  {person.label}
                </Select.Option>
              ))}
              <Select.Option value={newPersonChoice}>Een nieuwe persoon, die hieronder staat</Select.Option>
            </Select>
          </Field>
        ) : null}
        <Field
          error={errors.voornaam}
          hideOptional={choosing}
          hint={`${forNewPerson}Laat leeg voor een speler met één naam.`}
          id="voornaam"
          label="Voornaam"
          required={false}
        >
          <Input {...field('voornaam')} autoComplete="off" />
        </Field>
        <Field
          error={errors.tussenvoegsel}
          hideOptional={choosing}
          hint={`${forNewPerson}Zoals van, de of van der.`}
          id="tussenvoegsel"
          label="Tussenvoegsel"
          required={false}
        >
          <Input {...field('tussenvoegsel')} autoComplete="off" width="narrow" />
        </Field>
        <Field
          error={errors.achternaam}
          hideOptional
          {...(achternaamHint === undefined ? {} : { hint: achternaamHint })}
          id="achternaam"
          label="Achternaam"
          required={!choosing}
        >
          <Input {...field('achternaam')} autoComplete="off" />
        </Field>
        <Field
          error={errors.wikipedia}
          hideOptional={choosing}
          hint={`${forNewPerson}De titel van het artikel op de Nederlandse Wikipedia, precies zoals hij daar staat, zoals Pim Verbeek (voetballer, 1999). Geen adres. Hoort de pagina al bij een persoon, dan wordt de speler die persoon.`}
          id="wikipedia"
          label="Wikipedia-pagina"
          required={false}
        >
          <Input {...field('wikipedia')} autoComplete="off" />
        </Field>
      </Card>
      <Card aria-labelledby="seizoen-kop">
        <Heading id="seizoen-kop" level={2}>
          In dit seizoen
        </Heading>
        <Field
          error={errors.rugnummer}
          hint="Een getal van 1 tot en met 99."
          id="rugnummer"
          label="Rugnummer"
          required={false}
        >
          <Input {...field('rugnummer')} autoComplete="off" inputMode="numeric" width="narrow" />
        </Field>
        <Field error={errors.positie} id="positie" label="Positie" required={false}>
          <Select {...field('positie')} width="natural">
            <Select.Option value="">Onbekend</Select.Option>
            {positionChoices.map((position) => (
              <Select.Option key={position.value} value={position.value}>
                {position.label}
              </Select.Option>
            ))}
          </Select>
        </Field>
      </Card>
      <Button disabled={pending} icon="save" type="submit">
        {submitLabel}
      </Button>
      <Text>
        <Link href={cancelHref}>Annuleren</Link>
      </Text>
    </Form>
  )
}
