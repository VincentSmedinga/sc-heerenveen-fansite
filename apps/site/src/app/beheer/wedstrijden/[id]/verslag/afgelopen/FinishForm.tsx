'use client'

import { Button, Card, ErrorSummary, Field, FieldGroup, Form, Heading, Input, Link, Text } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import type { FinishFormState } from '../actions'

/** The `id` of the list of errors, which gets the focus when the scores are wrong. */
const summaryId = 'afgelopen-fouten'

/**
 * The confirmation that ends a match: the score the goals of the report give, in two fields the
 * editor can change, and the button that writes it. The fields come in the order of the match,
 * the home club first, as the title has the clubs. A score that is wrong comes back as an error
 * at its field and in a list that gets the focus. Without JavaScript the server shows the same.
 */
export function FinishForm({
  action,
  cancelHref,
  counted,
  home,
  opponent,
}: {
  action: (previous: FinishFormState, formData: FormData) => Promise<FinishFormState>
  cancelHref: string
  /** The goals of the report for each team. */
  counted: { against: number; for: number }
  home: boolean
  opponent: string
}) {
  const [state, formAction, pending] = useActionState(action, {})
  const errors = state.errors ?? {}
  const fields = [
    { id: 'uitslag-wij', label: 'Doelpunten sc Heerenveen', value: counted.for },
    { id: 'uitslag-zij', label: `Doelpunten ${opponent}`, value: counted.against },
  ] as const
  const ordered = home ? fields : [fields[1], fields[0]]
  const summary = ordered.flatMap((field) => {
    const message = errors[field.id]

    return message === undefined ? [] : [{ id: field.id, message }]
  })

  useEffect(() => {
    if (state.errors !== undefined) {
      document.getElementById(summaryId)?.focus()
    }
  }, [state])

  return (
    <>
      <ErrorSummary errors={summary} id={summaryId} level={2} tabIndex={-1} />
      <Card aria-labelledby="afgelopen-kop">
        <Heading id="afgelopen-kop" level={2}>
          Is de wedstrijd afgelopen?
        </Heading>
        <Text>
          De stand komt uit de doelpunten van het verslag dat is bewaard. Klopt het niet, pas de stand dan aan.
        </Text>
        <Form action={formAction}>
          <FieldGroup legend="Eindstand" separator="–">
            {ordered.map((field) => (
              <Field error={errors[field.id]} id={field.id} key={field.id} label={field.label}>
                <Input
                  autoComplete="off"
                  defaultValue={state.values?.[field.id] ?? String(field.value)}
                  inputMode="numeric"
                  name={field.id}
                  width="narrow"
                />
              </Field>
            ))}
          </FieldGroup>
          <Text>
            De wedstrijd is daarna gespeeld en telt mee in de cijfers. Het verslag blijft bezig, tot je het klaar zet.
            Verlenging en strafschoppen vul je daarna in met het formulier van de wedstrijd.
          </Text>
          <Button disabled={pending} type="submit">
            Wedstrijd afgelopen
          </Button>
          <Text>
            <Link href={cancelHref}>Annuleren</Link>
          </Text>
        </Form>
      </Card>
    </>
  )
}
