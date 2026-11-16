'use client'

import type { ClubWikidataSource } from '@fansite/db/schema'

import { Button, Card, ErrorSummary, Field, Form, Heading, Input, Link, Tag, Text } from '@fansite/design-system'
import { useActionState, useEffect, useRef } from 'react'

import type { ClubWikidataState } from '#src/beheer/club-wikidata'

const summaryId = 'wikidata-fouten'
const fieldId = 'wikidata'

/**
 * The Wikidata number of a club: a field and a button. With a number, the import reads the item
 * of the club for its country and its home grounds; an empty field takes the number away. An
 * error is at the field and in the list of errors, which gets the focus; what was saved is said
 * in a line with a role, for a screen reader too. It is a plain POST that works without
 * JavaScript.
 */
export function ClubWikidataForm({
  action,
  clubName,
  number,
  source,
}: {
  action: (previous: ClubWikidataState, formData: FormData) => Promise<ClubWikidataState>
  clubName: string
  /** The number the club has now, if any. */
  number: null | string
  /** Where the number came from. `name`: the import found it by the name of the club. */
  source: ClubWikidataSource | null
}) {
  const [state, formAction, pending] = useActionState<ClubWikidataState, FormData>(action, {})
  const told = useRef(state)

  useEffect(() => {
    if (told.current === state) {
      return
    }

    told.current = state

    if (state.error !== undefined) {
      document.getElementById(summaryId)?.focus()
    }
  }, [state])

  const shown = state.value ?? number ?? ''

  return (
    <Card aria-labelledby="wikidata-kop">
      <Heading id="wikidata-kop" level={2}>
        Wikidata-nummer
      </Heading>
      <Text appearance="meta">
        Met een nummer leest de import de gegevens van de club bij Wikidata, ook zijn thuisvelden. Zonder nummer zoekt
        de import één keer een artikel op Wikipedia met precies de naam van de club. Vindt hij niet precies één club,
        dan blijft het veld leeg en vult de redactie het in. Maak het veld leeg om het nummer weg te halen: de import
        zoekt dan niet opnieuw.
      </Text>
      {number !== null && source === 'name' ? (
        <Text>
          <Tag>Op naam gevonden</Tag> De import vond dit nummer met de naam van de club en niemand heeft het nagekeken.{' '}
          <Link href={`https://www.wikidata.org/wiki/${number}`}>Bekijk {number} bij Wikidata</Link>. Klopt het niet?
          Verander het nummer of maak het veld leeg: de import verandert het daarna niet meer.
        </Text>
      ) : null}
      <ErrorSummary
        errors={state.error === undefined ? [] : [{ id: fieldId, message: state.error }]}
        id={summaryId}
        level={3}
        tabIndex={-1}
      />
      <Form action={formAction}>
        <Field
          error={state.error}
          hint="Het nummer van het item, zoals Q1234."
          id={fieldId}
          label="Wikidata-nummer"
          required={false}
        >
          <Input
            autoComplete="off"
            autoCorrect="off"
            defaultValue={shown}
            key={shown}
            name="wikidata"
            width="natural"
          />
        </Field>
        <Form.Buttons>
          <Button aria-label={`Opslaan: Wikidata-nummer van ${clubName}`} disabled={pending} icon="save" type="submit">
            Opslaan
          </Button>
        </Form.Buttons>
      </Form>
      <Text id="wikidata-stand" role="status">
        {state.saved === undefined
          ? null
          : state.saved === ''
            ? `Opgeslagen: ${clubName} heeft geen Wikidata-nummer meer.`
            : `Opgeslagen: ${clubName}, ${state.saved}. De import leest de club bij zijn volgende run.`}
      </Text>
    </Card>
  )
}
