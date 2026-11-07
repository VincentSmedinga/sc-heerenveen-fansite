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
  type InputTableColumn,
  type InputTableRow,
  Link,
  RadioGroup,
  Select,
  Text,
} from '@fansite/design-system'
import { createContext, type ReactNode, use, useActionState, useEffect, useState } from 'react'

import {
  addButtonValue,
  cardKindChoices,
  type FieldName,
  goalKindChoices,
  incidentKindChoices,
  listId,
  otherPlayer,
  playerChoices,
  playerLabel,
  playerOf,
  readReportValues,
  removeButtonValue,
  type ReportFormState,
  type ReportSquadPlayer,
  type ReportValues,
  roleChoices,
  type Row,
  rowFieldId,
  type RowKind,
  rowNames,
  type Side,
  sides,
  statusChoices,
} from '#src/beheer/report-fields'
import { errorOrder } from '#src/beheer/report-form'

const summaryId = 'fouten'

/** The `id` of the form, which the field and button in the sidebar name in their `form`. */
const formId = 'verslag'

/** What the form needs to know of the match to word its choices. */
export type ReportChoices = {
  /** The name of the opponent, as the headings have it. */
  opponent: string
  /** How soon what is saved shows on the site, as "binnen vijf minuten". */
  showDelay: string
  squad: readonly ReportSquadPlayer[]
}

type ReportFormContext = {
  choices: ReportChoices
  /** The values as the form has them now, which may be more than the server has seen. */
  current: ReportValues
  formAction: (formData: FormData) => void
  onChange: (form: HTMLFormElement) => void
  pending: boolean
  state: ReportFormState
  title: string
}

const ReportFormContext = createContext<ReportFormContext | undefined>(undefined)

/** The list of the errors of the last save, which gets the focus when there are any. */
export function ReportErrorSummary() {
  const { current, state, title } = useReportForm()
  const summary = errorOrder(current).flatMap((id) => {
    const message = state.errors[id]

    return message === undefined ? [] : [{ id, message }]
  })

  return <ErrorSummary errors={summary} id={summaryId} level={2} tabIndex={-1} title={title} />
}

/**
 * The cards of the form: the data of the report, and for each team the line-up and the bench,
 * the substitutions, the goals, the cards and the missed penalties. The first button in the
 * form is a hidden "Opslaan", so the Enter key in a field saves, and never removes the first
 * row. Every list is a table of fields, and every field and button of it names the row it
 * belongs to.
 *
 * The lists of players in the substitutions, the goals, the cards and the penalties follow the
 * line-up as it is typed: with JavaScript they change as the names come in, and without it
 * the server makes them again after each button and each save.
 */
export function ReportFields() {
  const { choices, current, formAction, onChange, state } = useReportForm()
  const { errors, warnings } = state
  const club = (side: Side) => (side === 'wij' ? 'sc Heerenveen' : choices.opponent)
  const players = (side: Side, prefix = false) => playerChoices(current, side, choices.squad, prefix)
  const playerOptions = (list: readonly { label: string; value: string }[], selected = '', extra?: string) => (
    <>
      <Select.Option value="">Kies een speler</Select.Option>
      {list.map((player) => (
        <Select.Option key={player.value} value={player.value}>
          {player.label}
        </Select.Option>
      ))}
      {extra === undefined || list.some((player) => player.value === selected) ? null : (
        <Select.Option value={selected}>{extra}</Select.Option>
      )}
    </>
  )
  const text = (kind: RowKind, side: Side, number: number, field: FieldName, row: Row, narrow = false) => ({
    control: (
      <Input
        autoComplete="off"
        defaultValue={row[field] ?? ''}
        inputMode={narrow ? 'numeric' : undefined}
        name={rowFieldId(kind, side, number, field)}
      />
    ),
    error: errors[rowFieldId(kind, side, number, field)],
    id: rowFieldId(kind, side, number, field),
  })
  const choice = (
    kind: RowKind,
    side: Side,
    number: number,
    field: FieldName,
    row: Row,
    options: ReactNode,
    width: 'default' | 'natural' = 'default',
  ) => ({
    control: (
      <Select defaultValue={row[field] ?? ''} name={rowFieldId(kind, side, number, field)} width={width}>
        {options}
      </Select>
    ),
    error: errors[rowFieldId(kind, side, number, field)],
    id: rowFieldId(kind, side, number, field),
  })
  const fixed = (list: readonly { label: string; value: string }[]) =>
    list.map((item) => (
      <Select.Option key={item.value} value={item.value}>
        {item.label}
      </Select.Option>
    ))
  const minutes: InputTableColumn[] = [
    { name: 'Minuut', width: 'narrow' },
    { hideOptional: true, name: 'Blessuretijd', required: false, width: 'narrow' },
  ]
  const clock = (kind: RowKind, side: Side, number: number, row: Row) => [
    text(kind, side, number, 'minuut', row, true),
    text(kind, side, number, 'extra', row, true),
  ]

  const table = (
    kind: RowKind,
    side: Side,
    columns: InputTableColumn[],
    fieldsOf: (row: Row, number: number) => InputTableRow['fields'],
  ) => {
    const rows: InputTableRow[] = current[side][kind].map((row, index) => {
      const number = index + 1

      return {
        fields: fieldsOf(row, number),
        header: `${rowNames[kind]} ${number}`,
        mark: String(number),
        remove: { name: 'knop', value: removeButtonValue(kind, side, number) },
      }
    })

    return (
      <InputTable
        add={{ label: `${rowNames[kind]} toevoegen`, name: 'knop', value: addButtonValue(kind, side) }}
        caption={`${listTitles[kind]} van ${club(side)}`}
        columns={columns}
        empty={<Text>{emptyTexts[kind]}</Text>}
        removeLabel="Weghalen"
        rows={rows}
      />
    )
  }

  const card = (kind: RowKind, side: Side, hint: string, body: ReactNode) => (
    <Card aria-labelledby={listId(kind, side)} key={listId(kind, side)}>
      <Heading id={listId(kind, side)} level={2} tabIndex={-1}>
        {listTitles[kind]} van {club(side)}
      </Heading>
      <Text appearance="meta">{hint}</Text>
      {(warnings[listId(kind, side)] ?? []).map((warning) => (
        <Text key={warning}>
          <Text as="span" className="hf-visually-hidden">
            Let op:
          </Text>{' '}
          {warning}
        </Text>
      ))}
      {errors[listId(kind, side)] === undefined ? null : (
        <Text className="hf-field-error">
          <Text as="span" className="hf-visually-hidden">
            Fout:
          </Text>{' '}
          {errors[listId(kind, side)]}
        </Text>
      )}
      {body}
    </Card>
  )

  const cardsOf = (side: Side) => {
    const own = side === 'wij'
    const mine = players(side)

    return [
      card(
        'speler',
        side,
        own
          ? 'Kies een speler uit de selectie, of Andere speler als hij er niet in staat. Laat het rugnummer leeg voor het nummer van de selectie.'
          : 'Schrijf de naam van de speler zoals de bron hem schrijft. Een kant die niet af is, mag leeg blijven.',
        table(
          'speler',
          side,
          [
            { hideOptional: true, name: 'Rugnummer', required: false, width: 'narrow' },
            ...(own
              ? [{ name: 'Speler' }, { hideOptional: true, name: 'Naam van de andere speler', required: false }]
              : [{ name: 'Naam' }]),
            { name: 'Rol', width: 'natural' as const },
          ],
          (row, number) => [
            text('speler', side, number, 'rugnummer', row, true),
            ...(own
              ? [
                  choice(
                    'speler',
                    side,
                    number,
                    'keuze',
                    row,
                    <>
                      <Select.Option value="">Kies een speler</Select.Option>
                      {choices.squad.map((player) => (
                        <Select.Option key={player.id} value={String(player.id)}>
                          {playerLabel(player)}
                        </Select.Option>
                      ))}
                      <Select.Option value={otherPlayer}>Andere speler</Select.Option>
                    </>,
                  ),
                  { ...text('speler', side, number, 'naam', row), hidden: row.keuze !== otherPlayer },
                ]
              : [text('speler', side, number, 'naam', row)]),
            choice('speler', side, number, 'rol', row, fixed(roleChoices), 'natural'),
          ],
        ),
      ),
      card(
        'wissel',
        side,
        'Bij 45+1 vul je 45 in als minuut en 1 bij blessuretijd. Wie eruit gaat, staat op het veld; wie erin komt, zat op de bank.',
        table('wissel', side, [...minutes, { line: 2, name: 'Eruit' }, { line: 2, name: 'Erin' }], (row, number) => [
          ...clock('wissel', side, number, row),
          choice('wissel', side, number, 'eruit', row, playerOptions(mine)),
          choice('wissel', side, number, 'erin', row, playerOptions(mine)),
        ]),
      ),
      card(
        'doelpunt',
        side,
        own
          ? 'Het team dat het doelpunt krijgt. Een eigen doelpunt van de tegenstander kies je bij de speler van de tegenstander. Staat de scorer niet in de lijst, schrijf dan zijn naam.'
          : 'Het team dat het doelpunt krijgt. Een eigen doelpunt van sc Heerenveen kies je bij de speler van sc Heerenveen. Staat de scorer niet in de lijst, schrijf dan zijn naam.',
        table(
          'doelpunt',
          side,
          [
            ...minutes,
            { name: 'Soort', width: 'natural' },
            { line: 2, name: 'Speler', required: false },
            { hideOptional: true, line: 2, name: 'Assist', required: false },
            { hideOptional: true, line: 2, name: 'Andere naam', required: false },
          ],
          (row, number) => {
            const scoring = row.soort === 'eigen' ? (side === 'wij' ? 'zij' : 'wij') : side
            // A scorer chosen on the other side stays a choice, so nothing is lost when the
            // of the goal changes.
            const named = (value: string) => {
              const [of, place] = value.split('-') as [Side, string]
              const found = sides.includes(of) ? current[of].speler[Number(place) - 1] : undefined
              const player = found === undefined ? undefined : playerOf(found, of, choices.squad)

              return player === undefined ? undefined : playerLabel(player)
            }
            const scorerSide: Side = (row.speler ?? '').startsWith('zij-')
              ? 'zij'
              : (row.speler ?? '').startsWith('wij-')
                ? 'wij'
                : scoring
            const assistList = players(scorerSide, true)

            return [
              ...clock('doelpunt', side, number, row),
              choice('doelpunt', side, number, 'soort', row, fixed(goalKindChoices), 'natural'),
              choice(
                'doelpunt',
                side,
                number,
                'speler',
                row,
                playerOptions(players(scoring, true), row.speler, named(row.speler ?? '')),
              ),
              choice(
                'doelpunt',
                side,
                number,
                'assist',
                row,
                playerOptions(assistList, row.assist, named(row.assist ?? '')),
              ),
              text('doelpunt', side, number, 'naam', row),
            ]
          },
        ),
      ),
      card(
        'kaart',
        side,
        'Een tweede gele kaart is een geel-rode kaart. Die komt na precies één gele kaart van dezelfde speler.',
        table(
          'kaart',
          side,
          [...minutes, { name: 'Soort', width: 'natural' }, { line: 2, name: 'Speler' }],
          (row, number) => [
            ...clock('kaart', side, number, row),
            choice('kaart', side, number, 'soort', row, fixed(cardKindChoices), 'natural'),
            choice('kaart', side, number, 'speler', row, playerOptions(mine)),
          ],
        ),
      ),
      card(
        'strafschop',
        side,
        'Een strafschop die niet is gescoord. De speler is degene die hem nam.',
        table(
          'strafschop',
          side,
          [...minutes, { name: 'Soort', width: 'natural' }, { line: 2, name: 'Speler' }],
          (row, number) => [
            ...clock('strafschop', side, number, row),
            choice('strafschop', side, number, 'soort', row, fixed(incidentKindChoices), 'natural'),
            choice('strafschop', side, number, 'speler', row, playerOptions(mine)),
          ],
        ),
      ),
    ]
  }

  return (
    <Form action={formAction} id={formId} key={state.version} onChange={(event) => onChange(event.currentTarget)}>
      {/* The first button decides what Enter does: it saves. It is not on the screen. */}
      <Button aria-hidden="true" className="hf-visually-hidden" name="knop" tabIndex={-1} type="submit" value="opslaan">
        Opslaan
      </Button>
      <Card aria-labelledby="gegevens-kop">
        <Heading id="gegevens-kop" level={2}>
          Gegevens
        </Heading>
        <Field
          error={errors.bron}
          hideOptional
          hint="Schrijf de naam van wat je overtypt, zoals wedstrijdformulier of uitzending: nooit tekst van een verslag en geen hele tabellen van een site met statistieken."
          id="bron"
          label="Bron"
          required={false}
        >
          <Input autoComplete="off" defaultValue={current.bron} name="bron" />
        </Field>
        <Field
          error={errors.status}
          hint="Klaar kan alleen als de regels geen fout vinden. Anders blijft het verslag bezig."
          id="status"
          label="Status"
        >
          <Select defaultValue={current.status} name="status" width="natural">
            {fixed(statusChoices)}
          </Select>
        </Field>
        <RadioGroup
          error={errors.tegenstander}
          hint={`Dan telt alles van ${choices.opponent} mee: elf spelers, de bank en wie scoorde.`}
          id="tegenstander"
          legend="Is de kant van de tegenstander ook af?"
          name="tegenstander"
          options={[
            { label: 'Nee', value: 'nee' },
            { label: 'Ja', value: 'ja' },
          ]}
          value={current.tegenstander}
        />
      </Card>
      {sides.flatMap((side) => cardsOf(side))}
    </Form>
  )
}

/**
 * The state of the form of a report, shared by the three parts of the page: the list of errors
 * (`ReportErrorSummary`), the cards with the fields (`ReportFields`) and the save panel in the
 * sidebar (`ReportSavePanel`). They sit in two columns of the page, so the page puts them in
 * this provider, and the field and button of the sidebar belong to the form by its `id` (the
 * `form` attribute). The form is a plain POST that works without JavaScript: the provider is a
 * client component only to show what the server says.
 */
export function ReportFormProvider({
  action,
  children,
  choices,
  initial,
  title,
}: {
  action: (previous: ReportFormState, formData: FormData) => Promise<ReportFormState>
  children: ReactNode
  choices: ReportChoices
  initial: ReportFormState
  /** The title of the list of errors on the page as it opens. */
  title: string
}) {
  const [state, formAction, pending] = useActionState(action, initial)
  const [live, setLive] = useState<{ for: ReportFormState; values: ReportValues }>()
  // What the form said before the server answered is only good until the server answers.
  const current = live?.for === state ? live.values : state.values

  // After a button the editor must land somewhere sensible. A save with errors goes to the list
  // of errors, and a row that is added or removed to the row that took its place. The page
  // as it
  // opens keeps its errors in view without taking the focus.
  useEffect(() => {
    if (state.version === 0) {
      return
    }

    const target = state.focus ?? (Object.keys(state.errors).length > 0 ? summaryId : undefined)

    if (target !== undefined) {
      document.getElementById(target)?.focus()
    }
  }, [state])

  return (
    <ReportFormContext
      value={{
        choices,
        current,
        formAction,
        onChange: (form) => setLive({ for: state, values: readReportValues(new FormData(form)) }),
        pending,
        // The headline of the errors is the one of the page as it opens, the plain one after.
        state,
        title: state.version === 0 ? title : 'Er is iets mis',
      }}
    >
      {children}
    </ReportFormContext>
  )
}

/**
 * The save panel for the sidebar: "Opslaan" in a card, and "Annuleren" in a cell of its own
 * under it. The button belongs to the form of the cards by its `id`, so it saves, with or
 * without JavaScript.
 */
export function ReportSavePanel({ cancelHref }: { cancelHref: string }) {
  const { choices, pending } = useReportForm()

  return (
    <>
      <Card aria-labelledby="opslaan-kop">
        <Heading id="opslaan-kop" level={2}>
          Opslaan
        </Heading>
        <Text appearance="meta">Staat {choices.showDelay} op de site.</Text>
        <Button disabled={pending} form={formId} icon="save" name="knop" type="submit" value="opslaan">
          Opslaan
        </Button>
      </Card>
      <Text>
        <Link href={cancelHref}>Annuleren</Link>
      </Text>
    </>
  )
}

const listTitles: Record<RowKind, string> = {
  doelpunt: 'Doelpunten',
  kaart: 'Kaarten',
  speler: 'Opstelling en bank',
  strafschop: 'Gemiste strafschoppen',
  wissel: 'Wissels',
}

const emptyTexts: Record<RowKind, string> = {
  doelpunt: 'Geen doelpunten. Dat mag, ook bij een uitslag.',
  kaart: 'Geen kaarten.',
  speler: 'Nog geen spelers.',
  strafschop: 'Geen gemiste strafschoppen.',
  wissel: 'Geen wissels.',
}

function useReportForm() {
  const context = use(ReportFormContext)

  if (context === undefined) {
    throw new Error('This part of the form of a report must be inside a ReportFormProvider.')
  }

  return context
}
