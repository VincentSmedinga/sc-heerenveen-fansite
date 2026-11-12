import { Field, Input, Select } from '@fansite/design-system'

import type { CountryChoice } from '#src/beheer/countries'

import { positionChoices } from '#src/beheer/player-fields'

// The fields of a person: the name in parts with the Wikipedia page, the year of death, the
// country and the line. The form of a player and the form of a person (issue 1164)
// both use them, so a field looks and reads the same in both. Each field takes the props of its
// input from the form (`input`), with the value the server answered and a key that resets it.

/** The props of an input: its name, the value it opens with, and the key that resets it. */
export type PersonInput = { defaultValue: string; key: string; name: string }

/** The country of a person, from the list of countries by name, or Onbekend. */
export function CountryField({
  countries,
  error,
  hint,
  input,
}: {
  countries: readonly CountryChoice[]
  error: string | undefined
  hint: string
  input: PersonInput
}) {
  return (
    <Field error={error} hint={hint} id="land" label="Land" required={false}>
      <Select {...input} width="natural">
        <Select.Option value="">Onbekend</Select.Option>
        {countries.map((country) => (
          <Select.Option key={country.code} value={country.code}>
            {country.label}
          </Select.Option>
        ))}
      </Select>
    </Field>
  )
}

/** The year of death of a person, with four digits. */
export function DeathYearField({
  error,
  hint,
  input,
}: {
  error: string | undefined
  hint: string
  input: PersonInput
}) {
  return (
    <Field error={error} hint={hint} id="overleden" label="Jaar van overlijden" required={false}>
      <Input {...input} autoComplete="off" inputMode="numeric" width="narrow" />
    </Field>
  )
}

/** The line of a person, or Onbekend. */
export function LineField({ error, hint, input }: { error: string | undefined; hint: string; input: PersonInput }) {
  return (
    <Field error={error} hint={hint} id="linie" label="Linie" required={false}>
      <Select {...input} width="natural">
        <Select.Option value="">Onbekend</Select.Option>
        {positionChoices.map((position) => (
          <Select.Option key={position.value} value={position.value}>
            {position.label}
          </Select.Option>
        ))}
      </Select>
    </Field>
  )
}

/**
 * The name in parts and the Wikipedia page. Only the family name is required
 * (`familyRequired`); the form that adds a player with a list of persons asks for none of them.
 */
export function NameFields({
  errors,
  familyHint,
  familyRequired = true,
  hideOptional = false,
  input,
  pageHint,
  prefix = '',
}: {
  errors: Partial<Record<'achternaam' | 'tussenvoegsel' | 'voornaam' | 'wikipedia', string>>
  /** What a change of the name does, under the field of the family name. */
  familyHint?: string | undefined
  familyRequired?: boolean
  /** Hides "(niet verplicht)" on the fields that are optional. */
  hideOptional?: boolean
  input: (name: 'achternaam' | 'tussenvoegsel' | 'voornaam' | 'wikipedia') => PersonInput
  /** What the page does to the person, at the end of the hint of the page. */
  pageHint: string
  /** What goes before the hint of every field but the family name. */
  prefix?: string
}) {
  return (
    <>
      <Field
        error={errors.voornaam}
        hideOptional={hideOptional}
        hint={`${prefix}Laat leeg voor een speler met één naam.`}
        id="voornaam"
        label="Voornaam"
        required={false}
      >
        <Input {...input('voornaam')} autoComplete="off" autoCorrect="off" />
      </Field>
      <Field
        error={errors.tussenvoegsel}
        hideOptional={hideOptional}
        hint={`${prefix}Zoals van, de of van der.`}
        id="tussenvoegsel"
        label="Tussenvoegsel"
        required={false}
      >
        <Input {...input('tussenvoegsel')} autoCapitalize="off" autoComplete="off" autoCorrect="off" width="narrow" />
      </Field>
      <Field
        error={errors.achternaam}
        hideOptional
        {...(familyHint === undefined ? {} : { hint: familyHint })}
        id="achternaam"
        label="Achternaam"
        required={familyRequired}
      >
        <Input {...input('achternaam')} autoComplete="off" autoCorrect="off" />
      </Field>
      <Field
        error={errors.wikipedia}
        hideOptional={hideOptional}
        hint={`${prefix}De titel van het artikel op de Nederlandse Wikipedia, precies zoals hij daar staat, zoals Pim Verbeek (voetballer, 1999). Geen adres. ${pageHint}`}
        id="wikipedia"
        label="Wikipedia-pagina"
        required={false}
      >
        <Input {...input('wikipedia')} autoComplete="off" autoCorrect="off" />
      </Field>
    </>
  )
}
