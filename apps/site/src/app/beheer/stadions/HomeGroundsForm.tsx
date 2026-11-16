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
  Select,
  Text,
} from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import {
  homeGroundFieldId,
  type HomeGroundFieldName,
  homeGroundFieldNames,
  homeGroundFormId,
  type HomeGroundFormState,
  type HomeGroundRowValues,
  homeGroundSummaryId,
} from '#src/beheer/home-ground-fields'

/** A stadium to choose from: its number and a label with its name now and its place. */
export type StadiumChoice = { id: number; label: string }

/**
 * The home grounds of a club: lines with a stadium, a start and a note. The first button is a
 * hidden "Opslaan", so Enter saves. Saving makes the grounds the editors', which the import
 * leaves alone. Every field and button of a line names the line. It is a plain POST that works
 * without JavaScript: the buttons that add or remove a line send the form to the server, which
 * answers with the form again.
 */
export function HomeGroundsForm({
  action,
  clubName,
  initial,
  stadiums,
}: {
  action: (previous: HomeGroundFormState, formData: FormData) => Promise<HomeGroundFormState>
  clubName: string
  initial: HomeGroundRowValues[]
  stadiums: readonly StadiumChoice[]
}) {
  const [state, formAction, pending] = useActionState(action, { errors: {}, values: initial })
  const { errors, values } = state

  useEffect(() => {
    const target = state.focus ?? (Object.keys(state.errors).length > 0 ? homeGroundSummaryId : undefined)

    if (target === undefined) {
      return
    }

    const element =
      target === 'thuis-toevoegen'
        ? document.querySelector<HTMLElement>(`#${homeGroundFormId} button[value="thuis-toevoegen"]`)
        : document.getElementById(target)

    element?.focus()
  }, [state])

  const order = [
    'thuisvelden',
    ...values.flatMap((_row, index) => homeGroundFieldNames.map((field) => homeGroundFieldId(index + 1, field))),
  ]
  const summary = order.flatMap((id) => {
    const message = errors[id]

    return message === undefined ? [] : [{ id, message }]
  })

  const rows: InputTableRow[] = values.map((row, index) => {
    const number = index + 1
    const id = (name: HomeGroundFieldName) => homeGroundFieldId(number, name)
    const chosen = stadiums.find((stadium) => String(stadium.id) === row.stadion)

    return {
      fields: [
        {
          control: (
            <Select defaultValue={row.stadion} key={row.stadion} name={id('stadion')}>
              <Select.Option value="">Kies een stadion</Select.Option>
              {stadiums.map((stadium) => (
                <Select.Option key={stadium.id} value={String(stadium.id)}>
                  {stadium.label}
                </Select.Option>
              ))}
            </Select>
          ),
          error: errors[id('stadion')],
          id: id('stadion'),
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
      header: chosen === undefined ? `Thuisveld ${number}` : `Thuisveld ${number}: ${chosen.label}`,
      mark: String(number),
      remove: { name: 'knop', value: `thuis-weghalen-${number}` },
    }
  })

  return (
    <Card aria-labelledby="thuisvelden-kop">
      <Heading id="thuisvelden-kop" level={2}>
        Thuisvelden
      </Heading>
      <Text appearance="meta">
        De stadions waar {clubName} thuis speelde, op volgorde. Een thuisveld begint met een seizoen, zoals 2019/20, of
        met een dag, niet met allebei. Alleen het eerste thuisveld mag zonder start. Sla je ze op, dan zijn ze van de
        redactie en laat de import ze staan. Staat het stadion er niet bij, maak het dan eerst aan bij Stadions.
      </Text>
      <ErrorSummary errors={summary} id={homeGroundSummaryId} level={3} tabIndex={-1} />
      {errors['thuisvelden'] === undefined ? null : (
        <Text className="hf-field-error" id="thuisvelden" tabIndex={-1}>
          <Text as="span" className="hf-visually-hidden">
            Fout:
          </Text>{' '}
          {errors['thuisvelden']}
        </Text>
      )}
      <Form action={formAction} id={homeGroundFormId}>
        <Button
          aria-hidden="true"
          className="hf-visually-hidden"
          name="knop"
          tabIndex={-1}
          type="submit"
          value="thuis-opslaan"
        >
          Opslaan
        </Button>
        <InputTable
          add={{ label: 'Thuisveld toevoegen', name: 'knop', value: 'thuis-toevoegen' }}
          caption={`Thuisvelden van ${clubName}`}
          columns={[
            { name: 'Stadion' },
            { hideOptional: true, name: 'Start: seizoen', required: false, width: 'natural' },
            { hideOptional: true, name: 'Start: dag', required: false, width: 'natural' },
            { hideOptional: true, line: 2, name: 'Toelichting', required: false },
          ]}
          empty={<Text>Deze club heeft nog geen thuisvelden. Voeg een thuisveld toe.</Text>}
          removeLabel="Weghalen"
          rows={rows}
        />
        <Button disabled={pending} icon="save" name="knop" type="submit" value="thuis-opslaan">
          Thuisvelden opslaan
        </Button>
      </Form>
    </Card>
  )
}
