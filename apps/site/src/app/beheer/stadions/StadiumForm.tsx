'use client'

import {
  Button,
  Card,
  ErrorSummary,
  Form,
  Heading,
  Input,
  InputTable,
  type InputTableRow,
  Strong,
  Text,
} from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import {
  addRowId,
  stadiumFieldId,
  type StadiumFieldName,
  stadiumFieldNames,
  stadiumFormId,
  type StadiumFormState,
  type StadiumRowValues,
  stadiumSummaryId,
} from '#src/beheer/stadium-fields'

/**
 * The form of the stadiums of a club: the list of the errors and a card with the lines. The
 * first button in the form is a hidden "Opslaan", so the Enter key in a field saves, and never
 * removes the first line. The save button and "Overnemen" are in the sidebar of the page and
 * belong to this form by its `id` (the `form` attribute). Every field and button of a line
 * names the line it belongs to, with the name of its stadium.
 *
 * It is a plain POST that works without JavaScript: the component is a client component only to
 * show what the server says. Adding and removing a line, and taking Wikipedia over, are buttons
 * that send the form to the server, which answers with the form again and saves nothing.
 */
export function StadiumForm({
  action,
  initial,
}: {
  action: (previous: StadiumFormState, formData: FormData) => Promise<StadiumFormState>
  initial: StadiumRowValues[]
}) {
  const [state, formAction] = useActionState(action, { errors: {}, values: initial })
  const { errors, values } = state

  // After a button the editor must land somewhere sensible. A save with errors goes to the list
  // of errors, and a line that is added or removed to the line that took its place. The button
  // that adds a line is in the table, which has no `id` to give it.
  useEffect(() => {
    const target = state.focus ?? (Object.keys(state.errors).length > 0 ? stadiumSummaryId : undefined)

    if (target === undefined) {
      return
    }

    const element =
      target === addRowId
        ? document.querySelector<HTMLElement>(`#${stadiumFormId} button[value="regel-toevoegen"]`)
        : document.getElementById(target)

    element?.focus()
  }, [state])

  const order = [
    'regels',
    ...values.flatMap((_row, index) => stadiumFieldNames.map((field) => stadiumFieldId(index + 1, field))),
  ]
  const summary = order.flatMap((id) => {
    const message = errors[id]

    return message === undefined ? [] : [{ id, message }]
  })

  const rows: InputTableRow[] = values.map((row, index) => {
    const number = index + 1
    const id = (name: StadiumFieldName) => stadiumFieldId(number, name)

    return {
      fields: [
        {
          control: <Input autoComplete="off" defaultValue={row.naam} key={row.naam} name={id('naam')} />,
          error: errors[id('naam')],
          id: id('naam'),
        },
        {
          control: (
            <Input
              autoComplete="off"
              defaultValue={row.seizoen}
              key={row.seizoen}
              name={id('seizoen')}
              width="natural"
            />
          ),
          error: errors[id('seizoen')],
          id: id('seizoen'),
        },
        {
          control: <Input defaultValue={row.dag} key={row.dag} name={id('dag')} type="date" width="natural" />,
          error: errors[id('dag')],
          id: id('dag'),
        },
        {
          control: (
            <Input autoComplete="off" defaultValue={row.toelichting} key={row.toelichting} name={id('toelichting')} />
          ),
          error: errors[id('toelichting')],
          id: id('toelichting'),
        },
      ],
      header: row.naam === '' ? `Regel ${number}` : `Regel ${number}: ${row.naam}`,
      mark: String(number),
      remove: { name: 'knop', value: `regel-weghalen-${number}` },
    }
  })

  return (
    <>
      <ErrorSummary errors={summary} id={stadiumSummaryId} level={2} tabIndex={-1} />
      <Form action={formAction} id={stadiumFormId}>
        {/* The first button decides what Enter does: it saves. It is not on the screen. */}
        <Button
          aria-hidden="true"
          className="hf-visually-hidden"
          name="knop"
          tabIndex={-1}
          type="submit"
          value="opslaan"
        >
          Opslaan
        </Button>
        <Card aria-labelledby="regels-kop">
          <Heading id="regels-kop" level={2} tabIndex={-1}>
            Namen van het stadion
          </Heading>
          <Text appearance="meta">
            De eerste naam staat bovenaan. Een naam begint met een seizoen, zoals 2019/20, of met een dag, niet met
            allebei. De vorige naam eindigt waar de volgende begint. Alleen de eerste naam mag zonder start.
          </Text>
          <Text appearance="meta">
            <Strong>Toelichting.</Strong> Schrijf in eigen woorden. Komt het niet van Wikipedia, noem dan de bron in de
            zin.
          </Text>
          {errors['regels'] === undefined ? null : (
            <Text className="hf-field-error">
              <Text as="span" className="hf-visually-hidden">
                Fout:
              </Text>{' '}
              {errors['regels']}
            </Text>
          )}
          <InputTable
            add={{ label: 'Regel toevoegen', name: 'knop', value: 'regel-toevoegen' }}
            caption="Namen van het stadion"
            columns={[
              { name: 'Naam' },
              { hideOptional: true, name: 'Start: seizoen', required: false, width: 'natural' },
              { hideOptional: true, name: 'Start: dag', required: false, width: 'natural' },
              { hideOptional: true, line: 2, name: 'Toelichting', required: false },
            ]}
            empty={<Text>Er zijn nog geen regels. Voeg een regel toe, of neem de namen van Wikipedia over.</Text>}
            removeLabel="Weghalen"
            rows={rows}
          />
        </Card>
      </Form>
    </>
  )
}
