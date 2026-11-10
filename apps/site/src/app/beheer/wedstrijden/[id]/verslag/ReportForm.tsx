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
  Notice,
  RadioGroup,
  Select,
  Text,
} from '@fansite/design-system'
import { formationChoices } from '@fansite/shared/match-report'
import {
  createContext,
  type ReactNode,
  use,
  useActionState,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'

import {
  canonicalValues,
  clearDraft,
  clearDraftAfterSave,
  draftDueAfterSave,
  parseDraft,
  readDraftText,
  saveDraft,
} from '#src/beheer/report-draft'
import {
  addButtonValue,
  cardKindChoices,
  clearTakenPlayers,
  type FieldName,
  formationId,
  formationOwnId,
  goalKindChoices,
  incidentKindChoices,
  isEmptyLineUp,
  listId,
  otherFormation,
  otherPlayer,
  playerChoices,
  playerLabel,
  playerOf,
  playersOnPitch,
  previousLineUpButtonValue,
  readReportValues,
  removeButtonValue,
  type ReportFormState,
  type ReportSquadPlayer,
  type ReportValues,
  roleChoices,
  roleChoicesForRow,
  type Row,
  rowFieldId,
  type RowKind,
  rowNames,
  shootoutOutcomeChoices,
  type Side,
  sides,
  squadChoicesForRow,
  statusChoices,
} from '#src/beheer/report-fields'
import { errorOrder } from '#src/beheer/report-form'
import { type ChangedRow, changedRowOf, type ReportPreviewMatch } from '#src/beheer/report-preview'

const summaryId = 'fouten'

/** The `id` of the hint under the list Rol, and under the list Eruit, of a team. */
const roleHintId = (side: Side) => `rol-hint-${side}`
const outHintId = (side: Side) => `eruit-hint-${side}`

/** The `id` of the form, which the field and button in the sidebar name in their `form`. */
const formId = 'verslag'

/** What the form needs to know of the match to word its choices. */
export type ReportChoices = {
  /** The address of the form of the match, where the result of the shoot-out is filled in. */
  matchHref: string
  /**
   * The number of the match, for the input the browser keeps (`report-draft.ts`). Leave it out
   * for a screen that keeps nothing, such as the one that reads a pasted text.
   */
  matchId?: number
  /** The name of the opponent, as the headings have it. */
  opponent: string
  /**
   * What the preview needs of the match. Leave it out for a screen that has no preview, such as
   * the one that reads a pasted text.
   */
  preview?: ReportPreviewMatch
  /**
   * The match whose line-up of ours the button can take over, as `Opponent, 3 november 2025`.
   * Leave it out when there is none, and the button is not there.
   */
  previousLineUp?: string | undefined
  /**
   * The result of the shoot-out of the match, from the form of the match: `null` when it has
   * none. The kicks of the series are only asked for with a result.
   */
  series: null | { against: number; for: number }
  /** How soon what is saved shows on the site, as "binnen vijf minuten". */
  showDelay: string
  squad: readonly ReportSquadPlayer[]
}

type ReportFormContext = {
  /**
   * The values the page opened with, which is what the server has. The input the browser keeps
   * is kept when it differs from them, and not when the server answered a button with it.
   */
  baseline: ReportValues
  /** The row of an event that the last change was in, for the frame in the preview. */
  changed: ChangedRow | undefined
  choices: ReportChoices
  /** The values as the form has them now, which may be more than the server has seen. */
  current: ReportValues
  formAction: (formData: FormData) => void
  /** What the form did by itself with the last change, for a screen reader. */
  notice: string
  onChange: (form: HTMLFormElement, target: EventTarget) => void
  pending: boolean
  /** Puts values in the form, as the server's answer does after a button. */
  restore: (values: ReportValues) => void
  /** How often values were put in the form, so it is made anew with them. */
  restored: number
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

const draftNoticeId = 'bewaarde-invoer'

/**
 * The note above the form when the browser holds input that the server does not have, such as
 * after a save that failed: Herstel puts it in the form, Weggooien takes it away, and nothing
 * changes without one of the two. It is a status, so a screen reader reads it without the focus
 * moving. The focus only moves, to the note, after a choice, since the button is gone then.
 * With `savedAt` (the page after a save that worked, with the moment of that save) the input is
 * taken away once for that save, and nothing shows until then.
 * Without JavaScript it draws nothing.
 */
export function ReportDraftNotice({ savedAt }: { savedAt?: number | undefined }) {
  const { baseline, choices, restore } = useReportForm()
  const matchId = choices.matchId
  const [handled, setHandled] = useState<'discarded' | 'restored'>()
  // What the browser held when the page opened: the note is about that, not about what the
  // editor types on this page (which is kept for the next time). It shows after hydrating, so
  // the HTML of the server and the first render of the browser are the same.
  const [opened] = useState(() =>
    typeof window === 'undefined' ||
    matchId === undefined ||
    (savedAt !== undefined && draftDueAfterSave(matchId, savedAt))
      ? null
      : readDraftText(matchId),
  )
  const shown = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )
  const text = shown ? opened : null
  const draft = useMemo(() => parseDraft(text), [text])
  const differs = draft !== undefined && canonicalValues(draft.values) !== canonicalValues(baseline)

  useEffect(() => {
    if (savedAt !== undefined && matchId !== undefined) {
      clearDraftAfterSave(matchId, savedAt)
    }
  }, [matchId, savedAt])

  const choose = (choice: 'discarded' | 'restored') => {
    if (draft !== undefined && matchId !== undefined) {
      if (choice === 'restored') {
        restore(draft.values)
      } else {
        clearDraft(matchId)
      }

      setHandled(choice)
      document.getElementById(draftNoticeId)?.focus()
    }
  }
  const message =
    handled === 'restored'
      ? 'De bewaarde invoer staat weer in het formulier. Sla het verslag op om hem te houden.'
      : handled === 'discarded'
        ? 'De bewaarde invoer is weggegooid.'
        : differs
          ? `Dit apparaat bewaarde invoer van ${new Date(draft.savedAt).toLocaleString('nl-NL', { dateStyle: 'long', timeStyle: 'short' })} die niet is opgeslagen.`
          : ''

  return (
    <>
      <Notice id={draftNoticeId} tabIndex={-1}>
        {message}
      </Notice>
      {handled === undefined && differs ? (
        <>
          <Button onClick={() => choose('restored')} type="button">
            Herstel
          </Button>{' '}
          <Button appearance="soft" onClick={() => choose('discarded')} type="button">
            Weggooien
          </Button>
        </>
      ) : null}
    </>
  )
}

/**
 * The cards of the form: the data of the report, and for each team the line-up and the bench,
 * the substitutions, the goals, the cards, the missed penalties and the shoot-out. The first
 * button in the form is a hidden "Opslaan", so the Enter key in a field saves, and never
 * removes the first row. Every list is a table of fields, and every field and button of it
 * names the row it belongs to.
 *
 * The lists of players in the substitutions, the goals, the cards and the penalties follow the
 * line-up as it is typed: with JavaScript they change as the names come in, and without it
 * the server makes them again after each button and each save.
 */
export function ReportFields() {
  const { baseline, choices, current, formAction, notice, onChange, restored, state } = useReportForm()
  const { errors, warnings } = state
  // Whether the page is live in the browser: the server and a page without JavaScript say no.
  const live = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )
  const club = (side: Side) => (side === 'wij' ? 'sc Heerenveen' : choices.opponent)
  const seriesShown = choices.series !== null || current.wij.serie.length + current.zij.serie.length > 0
  const players = (side: Side, prefix = false, bench = false) =>
    playerChoices(current, side, choices.squad, prefix, bench)
  const playerOptions = (
    list: readonly { label: string; value: string }[],
    selected = '',
    extra?: string,
    placeholder = 'Kies een speler',
  ) => (
    <>
      <Select.Option value="">{placeholder}</Select.Option>
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
    describedBy?: string,
  ) => ({
    control: (
      <Select
        aria-describedby={describedBy}
        defaultValue={row[field] ?? ''}
        name={rowFieldId(kind, side, number, field)}
        width={width}
      >
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

  // The field for a formation of his own is only shown with the choice Anders. Without
  // JavaScript the page can not change it, so before the page is live it is always there.
  const formationFields = (side: Side) => (
    <>
      <Field
        error={errors[formationId(side)]}
        hideOptional
        hint="Kies een van de gebruikelijke formaties, of Anders voor een eigen formatie. Een formatie mag ontbreken."
        id={formationId(side)}
        label={`Formatie van ${club(side)}`}
        required={false}
      >
        <Select defaultValue={current.formatie[side].keuze} name={formationId(side)} width="natural">
          <Select.Option value="">Geen formatie</Select.Option>
          {formationChoices.map((formation) => (
            <Select.Option key={formation} value={formation}>
              {formation}
            </Select.Option>
          ))}
          <Select.Option value={otherFormation}>Anders</Select.Option>
        </Select>
      </Field>
      <Field
        error={errors[formationOwnId(side)]}
        hidden={live && current.formatie[side].keuze !== otherFormation}
        hideOptional
        hint="Getallen met een koppelteken ertussen, zoals 4-1-2-1-2. Samen zijn het er tien: de veldspelers, zonder de keeper. Dit veld telt alleen bij de keuze Anders."
        id={formationOwnId(side)}
        label={`Eigen formatie van ${club(side)}`}
        required={false}
      >
        <Input autoComplete="off" defaultValue={current.formatie[side].eigen} name={formationOwnId(side)} />
      </Field>
    </>
  )
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
      {kind === 'speler' ? formationFields(side) : null}
      {body}
    </Card>
  )

  const cardsOf = (side: Side) => {
    const own = side === 'wij'
    const mine = players(side)
    const kickOutcomes = (
      <>
        <Select.Option value="">Kies de uitkomst</Select.Option>
        {fixed(shootoutOutcomeChoices)}
      </>
    )
    const seriesHint = (ours: boolean) =>
      choices.series === null
        ? 'Elk schot van de serie, in de volgorde van de rondes.'
        : `Elk schot van ${club(ours ? 'wij' : 'zij')} in de serie, in de volgorde van de rondes. Het aantal schoten dat raak is, moet de uitslag van de serie geven: ${choices.series.for}–${choices.series.against}.${ours ? '' : ' Laat de speler leeg als je hem niet kent en zijn kant niet af is.'}`
    // A substitute comes from the bench.
    const bench = players(side, false, true)

    return [
      card(
        'speler',
        side,
        own
          ? 'Kies een speler uit de selectie, of Andere speler als hij er niet in staat. Laat het rugnummer leeg voor het nummer van de selectie, of als de speler geen rugnummer had.'
          : 'Schrijf de naam van de speler zoals de bron hem schrijft. Het rugnummer mag leeg blijven. Een kant die niet af is, mag leeg blijven.',
        <>
          {own ? (
            <>
              {/* Empty until the line-up was taken over, then it names the match. */}
              <Notice>{state.takenFrom === undefined ? '' : `Opstelling overgenomen van ${state.takenFrom}.`}</Notice>
              {choices.previousLineUp !== undefined && isEmptyLineUp(current) ? (
                <Button appearance="soft" name="knop" type="submit" value={previousLineUpButtonValue}>
                  Opstelling van de vorige wedstrijd overnemen
                </Button>
              ) : null}
            </>
          ) : null}
          <Text appearance="meta" id={roleHintId(side)}>
            Een team heeft één aanvoerder. Zodra een speler Basis en aanvoerder heeft, staat die keuze niet meer bij de
            anderen van {club(side)}.
          </Text>
          {table(
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
                        {squadChoicesForRow(current, number - 1, choices.squad).map((player) => (
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
              choice(
                'speler',
                side,
                number,
                'rol',
                row,
                // Without JavaScript every role is there: the server refuses a second captain.
                fixed(live ? roleChoicesForRow(current, side, number - 1) : roleChoices),
                'natural',
                roleHintId(side),
              ),
            ],
          )}
        </>,
      ),
      card(
        'wissel',
        side,
        'Bij 45+1 vul je 45 in als minuut en 1 bij blessuretijd. Wie erin komt, zit op de bank: zet hem eerst bij Opstelling en bank met de rol Bank. Wie eruit gaat, staat op het veld.',
        <>
          {bench.length === 0 && current[side].wissel.length > 0 ? (
            <Text>
              Bij {club(side)} staat niemand met de rol Bank, dus de lijst Erin is leeg.{' '}
              <Link href={`#${listId('speler', side)}`}>Zet eerst een speler op de bank</Link>, bij Opstelling en bank.
            </Text>
          ) : null}
          <Text appearance="meta" id={outHintId(side)}>
            {live
              ? 'Eruit: alleen spelers die op dat moment op het veld staan.'
              : 'Eruit: alle spelers staan in de lijst. Bij het opslaan controleert de site of de speler op het veld stond.'}
          </Text>
          {table('wissel', side, [...minutes, { line: 2, name: 'Erin' }, { line: 2, name: 'Eruit' }], (row, number) => {
            // With JavaScript the list holds who is on the pitch at the moment of this row. The
            // player the row has now stays, with a note, so nothing disappears quietly.
            const pitch = live ? playersOnPitch(current, side, number - 1) : undefined
            const leaving = pitch === undefined ? mine : mine.filter((player) => pitch.has(player.value))
            const chosen = mine.find((player) => player.value === row.eruit)

            return [
              ...clock('wissel', side, number, row),
              choice(
                'wissel',
                side,
                number,
                'erin',
                row,
                playerOptions(
                  bench,
                  row.erin,
                  mine.find((player) => player.value === row.erin)?.label,
                  bench.length === 0 ? 'Niemand op de bank' : undefined,
                ),
              ),
              choice(
                'wissel',
                side,
                number,
                'eruit',
                row,
                playerOptions(
                  leaving,
                  row.eruit,
                  chosen === undefined ? undefined : `${chosen.label} (staat dan niet op het veld)`,
                ),
                'default',
                outHintId(side),
              ),
            ]
          })}
        </>,
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
            { hideOptional: true, line: 2, name: 'Speler', required: false },
            { hideOptional: true, line: 2, name: 'Assist', required: false },
            { hideOptional: true, line: 2, name: 'Andere naam', required: false },
          ],
          (row, number) => {
            const scoring = row.soort === 'eigen' ? (side === 'wij' ? 'zij' : 'wij') : side
            // A scorer chosen on the other side stays a choice, so nothing is lost when the
            // kind of the goal changes.
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
      // Only a match with a result of the shoot-out has the list, or a report that already
      // holds kicks, so they can be taken away. The other match says where to fill it in.
      ...(seriesShown
        ? [
            card(
              'serie',
              side,
              `${seriesHint(own)} De eerste rij is ronde 1.`,
              table(
                'serie',
                side,
                [
                  { hideOptional: true, name: 'Speler', required: own || current.tegenstander === 'ja' },
                  { name: 'Uitkomst', width: 'natural' },
                ],
                (row, number) => [
                  choice(
                    'serie',
                    side,
                    number,
                    'speler',
                    row,
                    playerOptions(
                      mine,
                      '',
                      undefined,
                      own || current.tegenstander === 'ja' ? 'Kies een speler' : 'Onbekende speler',
                    ),
                  ),
                  choice('serie', side, number, 'uitkomst', row, kickOutcomes, 'natural'),
                ],
              ),
            ),
          ]
        : own
          ? [
              <Card aria-labelledby="serie-uitleg" key="serie-uitleg">
                <Heading id="serie-uitleg" level={2} tabIndex={-1}>
                  {listTitles.serie}
                </Heading>
                <Text>
                  Deze wedstrijd heeft geen uitslag van een strafschoppenserie.{' '}
                  <Link href={choices.matchHref}>Vul die uitslag in bij de wedstrijd</Link>, dan kun je hier de schoten
                  invullen.
                </Text>
              </Card>,
            ]
          : []),
    ]
  }

  return (
    <Form
      action={formAction}
      id={formId}
      key={`${state.version}-${restored}`}
      onBlur={(event) => {
        // Leaving a field keeps the input in the browser, so a save that fails costs nothing.
        if (choices.matchId !== undefined) {
          saveDraft(choices.matchId, readReportValues(new FormData(event.currentTarget)), baseline)
        }
      }}
      onChange={(event) => onChange(event.currentTarget, event.target)}
    >
      {/* The first button decides what Enter does: it saves. It is not on the screen. */}
      <Button aria-hidden="true" className="hf-visually-hidden" name="knop" tabIndex={-1} type="submit" value="opslaan">
        Opslaan
      </Button>
      {/* A player chosen in a place leaves his other place: a screen reader is told. */}
      <Text className="hf-visually-hidden" role="status">
        {notice}
      </Text>
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

  return (
    <ReportFormShell choices={choices} formAction={formAction} pending={pending} state={state} title={title}>
      {children}
    </ReportFormShell>
  )
}

/**
 * The same, for a screen that keeps the state of the form in a state of its own, such as the
 * screen that reads a pasted text: it has one action and one `useActionState`, so what the
 * server answers after a post without JavaScript reaches the form it belongs to. The shell
 * only shares what it is given.
 */
export function ReportFormShell({
  children,
  choices,
  formAction,
  pending,
  state,
  title,
}: {
  children: ReactNode
  choices: ReportChoices
  formAction: (formData: FormData) => void
  pending: boolean
  state: ReportFormState
  /** The title of the list of errors on the page as it opens. */
  title: string
}) {
  const [restored, setRestored] = useState(0)
  const [baseline] = useState(state.values)
  const [live, setLive] = useState<{
    changed: ChangedRow | undefined
    for: ReportFormState
    notice: string
    values: ReportValues
  }>()
  // What the form said before the server answered is only good until the server answers.
  const current = live?.for === state ? live.values : state.values

  // What the server answers to a button is input that is not saved yet, such as a row that was
  // added or the line-up of the previous match, so the browser keeps it like typed input. The
  // note about input that was kept is about what was there when the page opened, so it does not
  // show for this.
  useEffect(() => {
    if (state.version > 0 && choices.matchId !== undefined) {
      saveDraft(choices.matchId, state.values, baseline)
    }
  }, [baseline, choices.matchId, state])

  // After a button the editor must land somewhere sensible. A save with errors goes to the list
  // of errors, and a row that is added or removed to the row that took its place. The page
  // as it opens keeps its errors in view without taking the focus.
  useEffect(() => {
    if (state.version === 0) {
      return
    }

    const target = state.focus ?? (Object.keys(state.errors).length > 0 ? summaryId : undefined)

    if (target !== undefined) {
      // The list of the kicks is gone when its last row was removed from a match without a
      // result of the series: the focus goes to the card that says where to fill it in.
      const found =
        document.getElementById(target) ??
        (target.startsWith('serie-') ? document.getElementById('serie-uitleg') : null)

      found?.focus()
    }
  }, [state])

  return (
    <ReportFormContext
      value={{
        baseline,
        changed: live?.for === state ? live.changed : undefined,
        choices,
        current,
        formAction,
        notice: live?.for === state ? live.notice : '',
        onChange: (form, target) => {
          // A player chosen in a place gives up the other place he held: he is in the report
          // once. The form says so before the server does, which does the same on a save.
          const chosen = target instanceof HTMLSelectElement ? /^speler-wij-(\d+)-keuze$/u.exec(target.name) : null

          let told = ''

          if (chosen !== null) {
            const taken = clearTakenPlayers(readReportValues(new FormData(form)), Number(chosen[1]))

            for (const number of taken) {
              const other = form.elements.namedItem(rowFieldId('speler', 'wij', number, 'keuze'))

              if (other instanceof HTMLSelectElement) {
                other.value = ''
              }
            }

            if (taken.length > 0 && target instanceof HTMLSelectElement) {
              const role = form.elements.namedItem(rowFieldId('speler', 'wij', Number(chosen[1]), 'rol'))
              const where =
                role instanceof HTMLSelectElement && role.value === 'bank' ? 'op de bank' : 'in de opstelling'
              const player = target.selectedOptions[0]?.text ?? 'De speler'

              told = `${player} staat nu ${where}. Zijn andere plaats in het verslag is leeg gemaakt.`
            }
          }

          setLive({
            changed: target instanceof HTMLElement && 'name' in target ? changedRowOf(String(target.name)) : undefined,
            for: state,
            notice: told,
            values: readReportValues(new FormData(form)),
          })
        },
        pending,
        restore: (restoredValues) => {
          setLive({ changed: undefined, for: state, notice: '', values: restoredValues })
          setRestored((count) => count + 1)
        },
        restored,
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
  serie: 'Strafschoppenserie',
  speler: 'Opstelling en bank',
  strafschop: 'Gemiste strafschoppen',
  wissel: 'Wissels',
}

const emptyTexts: Record<RowKind, string> = {
  doelpunt: 'Geen doelpunten. Dat mag, ook bij een uitslag.',
  kaart: 'Geen kaarten.',
  serie: 'Geen schoten.',
  speler: 'Nog geen spelers.',
  strafschop: 'Geen gemiste strafschoppen.',
  wissel: 'Geen wissels.',
}

export function useReportForm() {
  const context = use(ReportFormContext)

  if (context === undefined) {
    throw new Error('This part of the form of a report must be inside a ReportFormProvider.')
  }

  return context
}
