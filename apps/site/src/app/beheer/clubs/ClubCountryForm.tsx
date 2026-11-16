'use client'

import { Button, Card, ErrorSummary, Field, Form, Heading, Select, Text } from '@fansite/design-system'
import { useActionState, useEffect, useRef } from 'react'

import type { ClubCountryState } from '#src/app/beheer/clubs/kwaliteit/actions'
import type { CountryChoice } from '#src/beheer/countries'

type Props = {
  /** The action that saves the choice: `submitClubCountry` with the club bound to it. */
  action: (previous: ClubCountryState, formData: FormData) => Promise<ClubCountryState>
  /** The countries to choose from, by their Dutch name. */
  countries: readonly CountryChoice[]
  /** The code the club has now, if any. */
  country: null | string
  /** The name of the club, for the names of the buttons. */
  name: string
  /** Where the country comes from, in words: "uit Wikidata" or "van de redactie". */
  source: null | string
}

const summaryId = 'land-fouten'
const fieldId = 'land'
const statusId = 'land-stand'

/**
 * The country of a club: a list with "Onbekend" and the countries, and a button. A country an
 * editor chooses is theirs, and the import never changes it; "Onbekend" takes it away, so the
 * import can fill it in again. An error is at the list and in the list of errors, which gets
 * the focus; what was saved is said in a line with a role, for a screen reader too. It is a
 * plain POST that works without JavaScript.
 */
export function ClubCountryForm({ action, countries, country, name, source }: Props) {
  const [state, formAction, pending] = useActionState<ClubCountryState, FormData>(action, {})
  const told = useRef(state)
  const shown = state.saved ?? state.land ?? country ?? ''
  const label = countries.find(({ code }) => code === state.saved)?.label

  useEffect(() => {
    if (told.current === state) {
      return
    }

    told.current = state

    if (state.error !== undefined) {
      document.getElementById(summaryId)?.focus()
    }
  }, [state])

  return (
    <Card aria-labelledby="land-kop">
      <Heading id="land-kop" level={2}>
        Land van de club
      </Heading>
      <Text appearance="meta">
        {country === null || state.saved !== undefined
          ? 'Een land dat je hier kiest, blijft staan: de import verandert het niet. Kies Onbekend om het weg te halen, dan vult de import het weer aan als Wikidata het land kent.'
          : `Nu: ${countries.find(({ code }) => code === country)?.label ?? country}, ${source ?? 'van de redactie'}. Een land dat je hier kiest, blijft staan: de import verandert het niet. Kies Onbekend om het weg te halen, dan vult de import het weer aan als Wikidata het land kent.`}
      </Text>
      <ErrorSummary
        errors={state.error === undefined ? [] : [{ id: fieldId, message: state.error }]}
        id={summaryId}
        level={3}
        tabIndex={-1}
      />
      <Form action={formAction}>
        <Field error={state.error} id={fieldId} label="Land" required={false}>
          <Select defaultValue={shown} key={shown} name="land">
            <Select.Option value="">Onbekend</Select.Option>
            {countries.map(({ code, label: text }) => (
              <Select.Option key={code} value={code}>
                {text}
              </Select.Option>
            ))}
          </Select>
        </Field>
        <Form.Buttons>
          <Button aria-label={`Opslaan: land van ${name}`} disabled={pending} icon="save" type="submit">
            Opslaan
          </Button>
        </Form.Buttons>
      </Form>
      <Text id={statusId} role="status">
        {state.saved === undefined
          ? null
          : state.saved === ''
            ? `Opgeslagen: ${name} heeft geen land meer.`
            : `Opgeslagen: ${name}, ${label ?? state.saved}.`}
      </Text>
    </Card>
  )
}
