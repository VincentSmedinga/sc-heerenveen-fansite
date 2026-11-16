'use client'

import {
  Button,
  Card,
  ErrorSummary,
  Field,
  Form,
  Heading,
  Input,
  InputTable,
  type InputTableRow,
  Link,
  Strong,
  Text,
} from '@fansite/design-system'
import { useActionState, useEffect, useState } from 'react'

import { groundFormId, type GroundFormState, groundSummaryId, type GroundValues } from '#src/beheer/ground-fields'
import { readCoordinates } from '#src/beheer/ground-form'
import { inNetherlands } from '#src/beheer/pdok'
import { addRowId, stadiumFieldId, type StadiumFieldName, stadiumFieldNames } from '#src/beheer/stadium-fields'

const statusId = 'adres-stand'

/**
 * The form of a stadium: the place and the coordinates, the address with the button that looks
 * it up, and the lines of names. The first button in the form is a hidden "Opslaan", so the
 * Enter key in a field saves, and never removes the first line. Every field and button of a
 * name names the line it belongs to.
 *
 * The button for the address is off, with a line that says why, when the coordinates are not
 * both there or lie outside the Netherlands. The server checks them again. What PDOK finds is a
 * proposal in the fields: nothing is saved until the editor chooses Opslaan.
 *
 * It is a plain POST that works without JavaScript: the component is a client component only to
 * show what the server says and to switch the address button.
 */
export function GroundForm({
  action,
  cancelHref,
  initial,
}: {
  action: (previous: GroundFormState, formData: FormData) => Promise<GroundFormState>
  /** Where "Annuleren" goes. */
  cancelHref: string
  initial: GroundValues
}) {
  const [state, formAction, pending] = useActionState(action, { errors: {}, values: initial })
  const { errors, values } = state
  // What was typed in the coordinates since the server last answered. An answer replaces it, so
  // a proposal or a form the server sends back wins over what was typed before.
  const [typed, setTyped] = useState<{ breedtegraad: string; lengtegraad: string; of: GroundFormState }>()
  const coordinates = typed?.of === state ? typed : state.values

  useEffect(() => {
    const target = state.focus ?? (Object.keys(state.errors).length > 0 ? groundSummaryId : undefined)

    if (target === undefined) {
      return
    }

    const element =
      target === addRowId
        ? document.querySelector<HTMLElement>(`#${groundFormId} button[value="regel-toevoegen"]`)
        : document.getElementById(target)

    element?.focus()
  }, [state])

  const point = readCoordinates(coordinates)
  const canLookUp = point !== undefined && inNetherlands(point.latitude, point.longitude)
  const why =
    point === undefined
      ? 'Vul eerst de breedtegraad en de lengtegraad in.'
      : 'De coördinaten liggen buiten Nederland, en PDOK kent alleen adressen in Nederland. Vul het adres met de hand in.'

  const order = [
    'plaats',
    'breedtegraad',
    'lengtegraad',
    'straat',
    'postcode',
    'regels',
    ...values.rows.flatMap((_row, index) => stadiumFieldNames.map((field) => stadiumFieldId(index + 1, field))),
  ]
  const summary = order.flatMap((id) => {
    const message = errors[id]

    return message === undefined ? [] : [{ id, message }]
  })

  const rows: InputTableRow[] = values.rows.map((row, index) => {
    const number = index + 1
    const id = (name: StadiumFieldName) => stadiumFieldId(number, name)

    return {
      fields: [
        {
          control: (
            <Input autoComplete="off" autoCorrect="off" defaultValue={row.naam} key={row.naam} name={id('naam')} />
          ),
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
      <ErrorSummary errors={summary} id={groundSummaryId} level={2} tabIndex={-1} />
      <Form action={formAction} id={groundFormId}>
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
        <Card aria-labelledby="plaats-kop">
          <Heading id="plaats-kop" level={2}>
            Plaats en coördinaten
          </Heading>
          <Text appearance="meta">
            Verander je de plaats of de coördinaten, dan zijn ze van de redactie en laat de import ze staan. Leeg maken
            kan ook.
          </Text>
          <Field error={errors['plaats']} id="plaats" label="Plaats" required={false}>
            <Input autoComplete="off" defaultValue={values.plaats} key={`plaats-${values.plaats}`} name="plaats" />
          </Field>
          <Field
            error={errors['breedtegraad']}
            hint="In graden, zoals 52,9605."
            id="breedtegraad"
            label="Breedtegraad"
            required={false}
          >
            <Input
              autoComplete="off"
              defaultValue={values.breedtegraad}
              inputMode="decimal"
              key={`breedte-${values.breedtegraad}`}
              name="breedtegraad"
              onChange={(event) => setTyped({ ...coordinates, breedtegraad: event.target.value.trim(), of: state })}
              width="natural"
            />
          </Field>
          <Field
            error={errors['lengtegraad']}
            hint="In graden, zoals 5,9396."
            id="lengtegraad"
            label="Lengtegraad"
            required={false}
          >
            <Input
              autoComplete="off"
              defaultValue={values.lengtegraad}
              inputMode="decimal"
              key={`lengte-${values.lengtegraad}`}
              name="lengtegraad"
              onChange={(event) => setTyped({ ...coordinates, lengtegraad: event.target.value.trim(), of: state })}
              width="natural"
            />
          </Field>
        </Card>
        <Card aria-labelledby="adres-kop">
          <Heading id="adres-kop" level={2}>
            Adres
          </Heading>
          <Text appearance="meta">
            Het adres is altijd van de redactie. De knop vraagt PDOK, de dienst van de overheid voor adressen, om het
            dichtstbijzijnde adres bij de coördinaten. Alleen de coördinaten gaan mee, en alleen vanaf de server van
            deze site. Wat PDOK vindt, is een voorstel: het is pas bewaard als je Opslaan kiest.
          </Text>
          <Button
            appearance="soft"
            aria-describedby={canLookUp ? statusId : `${statusId} adres-uit`}
            disabled={!canLookUp || pending}
            name="knop"
            type="submit"
            value="adres-invullen"
          >
            Vul het adres in vanaf de coördinaten
          </Button>
          {canLookUp ? null : (
            <Text appearance="meta" id="adres-uit">
              {why}
            </Text>
          )}
          <Text id={statusId} role="status">
            {state.notice}
          </Text>
          <Field error={errors['straat']} hint="Met het huisnummer." id="straat" label="Straat" required={false}>
            <Input autoComplete="off" defaultValue={values.straat} key={`straat-${values.straat}`} name="straat" />
          </Field>
          <Field error={errors['postcode']} id="postcode" label="Postcode" required={false}>
            <Input
              autoComplete="off"
              defaultValue={values.postcode}
              key={`postcode-${values.postcode}`}
              name="postcode"
              width="natural"
            />
          </Field>
        </Card>
        <Card aria-labelledby="regels-kop">
          <Heading id="regels-kop" level={2} tabIndex={-1}>
            Namen van het stadion
          </Heading>
          <Text appearance="meta">
            De eerste naam staat bovenaan. Een naam begint met een seizoen, zoals 2019/20, of met een dag, niet met
            allebei. De vorige naam eindigt waar de volgende begint. Alleen de eerste naam mag zonder start. Een naam
            hoeft niet uniek te zijn: twee stadions kunnen op andere perioden dezelfde naam hebben.
          </Text>
          <Text appearance="meta">
            <Strong>Toelichting.</Strong> Schrijf in eigen woorden. Komt het niet van Wikipedia, noem dan de bron in de
            zin.
          </Text>
          {errors['regels'] === undefined ? null : (
            <Text className="hf-field-error" id="regels" tabIndex={-1}>
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
            empty={<Text>Er zijn nog geen regels. Voeg een regel toe.</Text>}
            removeLabel="Weghalen"
            rows={rows}
          />
        </Card>
        <Button disabled={pending} icon="save" name="knop" type="submit" value="opslaan">
          Opslaan
        </Button>
        <Text>
          <Link href={cancelHref}>Annuleren</Link>
        </Text>
      </Form>
    </>
  )
}
