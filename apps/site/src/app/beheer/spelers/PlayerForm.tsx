'use client'

import { Button, Card, ErrorSummary, Field, Form, Heading, Input, Link, Select, Text } from '@fansite/design-system'
import { useActionState, useEffect, useState } from 'react'

import type { CountryChoice } from '#src/beheer/countries'

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
 * JavaScript: the server answers with the form again. A Wikipedia page that belongs to another
 * person is refused with a link under the field to the page that merges the two (issue 977).
 *
 * The line and the country are those of the person (#1051), in every season; the position
 * under "In dit seizoen" is for a season that differs. Both are lists of the browser itself,
 * so a keyboard and a screen reader work them as any list, and typing the first letters of a
 * country finds it. A player without a person has neither field (`withoutPerson`).
 */
export function PlayerForm({
  action,
  cancelHref,
  countries,
  initial,
  nameHint,
  people,
  submitLabel,
  withoutPerson = false,
}: {
  action: (previous: PlayerFormState, formData: FormData) => Promise<PlayerFormState>
  cancelHref: string
  /** The countries to choose from, by name (`countryChoices`). */
  countries: readonly CountryChoice[]
  initial: PlayerValues
  /** What a change of the name does, under the field of the family name. */
  nameHint?: string | undefined
  /** The persons to choose from. Without it the form has no list: it changes a player. */
  people?: readonly { id: number; label: string; suggestion?: { number: number; season: string } }[]
  submitLabel: string
  /** The player has no person yet, so there is nobody to give a line or a country. */
  withoutPerson?: boolean
}) {
  const [state, formAction, pending] = useActionState(action, { errors: {}, values: initial })
  const { errors, merge, values } = state
  const choosing = people !== undefined && people.length > 0
  const [chosenId, setChosenId] = useState(values.persoon)
  // The number the person had in the season before, for a person from the list (issue 1076).
  const suggestion = people?.find((person) => String(person.id) === chosenId)?.suggestion
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
  // The form that adds does not know what a person from the list has, so empty changes nothing.
  // A player with a person keeps him: a page of another person is a merge, on its own page.
  const pageHint =
    people !== undefined || withoutPerson
      ? 'Hoort de pagina al bij een persoon, dan wordt de speler die persoon.'
      : 'Deze speler heeft al een persoon. Die krijgt de pagina alleen als de pagina nog bij niemand hoort. Hoort de pagina bij een andere persoon? Voeg de twee personen dan samen, onder Dezelfde persoon als.'
  const keeps = people === undefined ? '' : ' Kies je een persoon die we al kennen? Onbekend laat staan wat hij heeft.'

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
            <Select
              {...field('persoon')}
              onChange={(event) => {
                const next = people.find((person) => String(person.id) === event.target.value)?.suggestion
                const input = document.getElementById('rugnummer')

                // The number the form offered is replaced by the one of the new person, but a
                // number the editor typed stays.
                if (
                  input instanceof HTMLInputElement &&
                  (input.value === '' || input.value === String(suggestion?.number))
                ) {
                  input.value = next === undefined ? '' : String(next.number)
                }

                setChosenId(event.target.value)
              }}
            >
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
          <Input {...field('voornaam')} autoComplete="off" autoCorrect="off" />
        </Field>
        <Field
          error={errors.tussenvoegsel}
          hideOptional={choosing}
          hint={`${forNewPerson}Zoals van, de of van der.`}
          id="tussenvoegsel"
          label="Tussenvoegsel"
          required={false}
        >
          <Input {...field('tussenvoegsel')} autoCapitalize="off" autoComplete="off" autoCorrect="off" width="narrow" />
        </Field>
        <Field
          error={errors.achternaam}
          hideOptional
          {...(achternaamHint === undefined ? {} : { hint: achternaamHint })}
          id="achternaam"
          label="Achternaam"
          required={!choosing}
        >
          <Input {...field('achternaam')} autoComplete="off" autoCorrect="off" />
        </Field>
        <Field
          error={errors.wikipedia}
          hideOptional={choosing}
          hint={`${forNewPerson}De titel van het artikel op de Nederlandse Wikipedia, precies zoals hij daar staat, zoals Pim Verbeek (voetballer, 1999). Geen adres. ${pageHint}`}
          id="wikipedia"
          label="Wikipedia-pagina"
          required={false}
        >
          <Input {...field('wikipedia')} autoComplete="off" autoCorrect="off" />
        </Field>
        {/* The way on from a page of another person: the page that merges the two. */}
        {merge === undefined ? null : (
          <Text>
            <Link href={merge.href}>{merge.label}</Link>
          </Text>
        )}
        {withoutPerson ? null : (
          <>
            <Field
              error={errors.linie}
              hint={`De linie van deze persoon, in elk seizoen.${keeps}`}
              id="linie"
              label="Linie"
              required={false}
            >
              <Select {...field('linie')} width="natural">
                <Select.Option value="">Onbekend</Select.Option>
                {positionChoices.map((position) => (
                  <Select.Option key={position.value} value={position.value}>
                    {position.label}
                  </Select.Option>
                ))}
              </Select>
            </Field>
            <Field
              error={errors.land}
              hint={`Het land van deze persoon, in elk seizoen. De lijst staat op naam, met de landcode erachter.${keeps}`}
              id="land"
              label="Land"
              required={false}
            >
              <Select {...field('land')} width="natural">
                <Select.Option value="">Onbekend</Select.Option>
                {countries.map((country) => (
                  <Select.Option key={country.code} value={country.code}>
                    {country.label}
                  </Select.Option>
                ))}
              </Select>
            </Field>
          </>
        )}
      </Card>
      <Card aria-labelledby="seizoen-kop">
        <Heading id="seizoen-kop" level={2}>
          In dit seizoen
        </Heading>
        <Field
          error={errors.rugnummer}
          hint={`Een getal van 1 tot en met 99.${suggestion === undefined ? '' : ` Rugnummer in ${suggestion.season}.`}`}
          id="rugnummer"
          label="Rugnummer"
          required={false}
        >
          <Input {...field('rugnummer')} autoComplete="off" inputMode="numeric" width="narrow" />
        </Field>
        <Field
          error={errors.vorigrugnummer}
          hint="Het nummer dat hij in dit seizoen eerst droeg, als het nummer hierboven later is veranderd. Laat leeg als het nummer niet veranderde."
          id="vorigrugnummer"
          label="Vorig rugnummer"
          required={false}
        >
          <Input {...field('vorigrugnummer')} autoComplete="off" inputMode="numeric" width="narrow" />
        </Field>
        <Field
          error={errors.rugnummervanaf}
          hint="De dag waarop het rugnummer hierboven begon te gelden. Wedstrijden voor die dag houden het vorige rugnummer."
          id="rugnummervanaf"
          label="Nieuw nummer vanaf"
          required={false}
        >
          <Input {...field('rugnummervanaf')} type="date" width="natural" />
        </Field>
        <Field
          error={errors.positie}
          hint="Alleen voor dit seizoen. Bij Onbekend geldt de linie van de persoon."
          id="positie"
          label="Positie"
          required={false}
        >
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
