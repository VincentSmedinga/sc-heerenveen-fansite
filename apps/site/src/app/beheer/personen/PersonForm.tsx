'use client'

import { Button, Card, ErrorSummary, Field, Form, Heading, Input, Link, Text } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import type { CountryChoice } from '#src/beheer/countries'

import { personFormId } from '#src/beheer/form-ids'
import {
  type PersonFieldName,
  personFieldNames,
  type PersonFormState,
  type PersonPart,
  type PersonValues,
} from '#src/beheer/person-fields'

import { CountryField, DeathYearField, LineField, NameFields } from '../spelers/PersonFields'

const summaryId = 'fouten'

/**
 * The form of a person (issue 1164): a card for each part, or only the card of one `part`, and
 * the card Opslaan with the reason under it. The fields are those of the form of a player
 * (`PersonFields`). Every field has its own error, and the list of errors gets the focus after
 * a save that did not work, also an error that belongs to no field (`algemeen`). It works
 * without JavaScript: the server answers with the form again. A Wikipedia page of another
 * person is refused with a link under the field to the page that merges the two.
 */
export function PersonForm({
  action,
  cancelHref,
  countries,
  initial,
  next = false,
  part,
}: {
  action: (previous: PersonFormState, formData: FormData) => Promise<PersonFormState>
  cancelHref: string
  /** The countries to choose from, by name (`countryChoices`). */
  countries: readonly CountryChoice[]
  initial: PersonValues
  /** Whether the editor came from the table of Kwaliteit, so "Opslaan en volgende" is there. */
  next?: boolean
  /** The part on the page; none for the whole form. */
  part?: PersonPart | undefined
}) {
  const [state, formAction, pending] = useActionState(action, { errors: {}, values: initial })
  const { errors, merge, values } = state
  const shows = (shown: PersonPart) => part === undefined || part === shown
  const summary = [...personFieldNames, 'algemeen' as const].flatMap((id) => {
    const message = errors[id]

    return message === undefined ? [] : [{ id, message }]
  })

  useEffect(() => {
    if (summary.length > 0) {
      document.getElementById(summaryId)?.focus()
    }
  }, [state, summary.length])

  // The value is the key of a field that a server answer must reset: React keeps what is typed.
  const field = (name: PersonFieldName) => ({ defaultValue: values[name], key: `${name}-${values[name]}`, name })

  return (
    <Form action={formAction} id={personFormId}>
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
      {shows('naam') ? (
        <Card aria-labelledby="naam-kop">
          <Heading id="naam-kop" level={2}>
            Naam
          </Heading>
          <NameFields
            errors={errors}
            familyHint="Een andere naam geldt voor deze persoon in elk seizoen."
            input={field}
            pageHint="Een persoon zonder pagina krijgt hem, en zijn spelers in de seizoenen zonder pagina ook. Een persoon met een pagina houdt die. Hoort de pagina bij een andere persoon? Voeg de twee dan samen."
          />
          {/* The way on from a page of another person: the page that merges the two. */}
          {merge === undefined ? null : (
            <Text>
              <Link href={merge.href}>{merge.label}</Link>
            </Text>
          )}
        </Card>
      ) : null}
      {shows('leven') ? (
        <Card aria-labelledby="leven-kop">
          <Heading id="leven-kop" level={2}>
            Leven
          </Heading>
          <Field
            error={errors.geboren}
            hint="Een jaar, zoals 1985, of een datum, zoals 14-3-1985. Wat je hier invult, gaat voor Wikidata. Maak je het leeg, dan geldt weer Wikidata."
            id="geboren"
            label="Geboortedatum"
            required={false}
          >
            <Input {...field('geboren')} autoComplete="off" width="natural" />
          </Field>
          <DeathYearField
            error={errors.overleden}
            hint="Het jaar van overlijden, met vier cijfers. Een jaar dat je hier invult, gaat voor Wikidata. Maak je het leeg, dan geldt weer Wikidata."
            input={field('overleden')}
          />
        </Card>
      ) : null}
      {shows('land') ? (
        <Card aria-labelledby="land-kop">
          <Heading id="land-kop" level={2}>
            Land
          </Heading>
          <CountryField
            countries={countries}
            error={errors.land}
            hint="Het land van deze persoon, in elk seizoen. De lijst staat op naam, met de landcode erachter."
            input={field('land')}
          />
        </Card>
      ) : null}
      {shows('linie') ? (
        <Card aria-labelledby="linie-kop">
          <Heading id="linie-kop" level={2}>
            Linie
          </Heading>
          <LineField error={errors.linie} hint="De linie van deze persoon, in elk seizoen." input={field('linie')} />
        </Card>
      ) : null}
      <Card aria-labelledby="opslaan-kop">
        <Heading id="opslaan-kop" level={2}>
          Opslaan
        </Heading>
        <Field
          error={errors.reden}
          hideOptional
          hint="Mag leeg. Komt in het logboek, hoogstens 300 tekens."
          id="reden"
          label="Reden"
          required={false}
        >
          <Input {...field('reden')} autoComplete="off" />
        </Field>
        {next ? (
          // From the table of Kwaliteit (issue 1165): save, and go on to the next person of the
          // letter with a gap in the same column.
          <Button disabled={pending} icon="save" name="knop" type="submit" value="volgende">
            Opslaan en volgende
          </Button>
        ) : null}
        <Button
          appearance={next ? 'soft' : 'default'}
          disabled={pending}
          icon="save"
          name="knop"
          type="submit"
          value="opslaan"
        >
          Opslaan
        </Button>
      </Card>
      <Text>
        <Link href={cancelHref}>Annuleren</Link>
      </Text>
    </Form>
  )
}
