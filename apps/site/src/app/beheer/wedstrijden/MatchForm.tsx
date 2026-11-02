'use client'

import {
  Button,
  Card,
  ErrorSummary,
  Field,
  FieldGroup,
  Form,
  Heading,
  Input,
  InputTable,
  type InputTableRow,
  Link,
  Select,
  Text,
} from '@fansite/design-system'
import { createContext, type ReactNode, use, useActionState, useEffect } from 'react'

import {
  addGoalId,
  goalFieldId,
  goalFieldNames,
  type MatchFieldName,
  matchFieldNames,
  type MatchFormState,
  type MatchValues,
  otherPlayer,
} from '../../../beheer/match-fields'

const summaryId = 'fouten'

/** The `id` of the form, which the fields and buttons in the sidebar name in their `form`. */
const formId = 'wedstrijd'

const ours = 'sc Heerenveen'

/** The statuses, the kinds of goal and the squad, as the form words them. */
export type MatchFormChoices = {
  goalKinds: readonly { label: string; value: string }[]
  /** Whether sc Heerenveen plays at home: clubs and scores follow the order of the match. */
  home: boolean
  /** Whether the competition has extra time: the cup and the play-offs. */
  knockout: boolean
  opponent: string
  squad: readonly { id: number; name: string }[]
  statuses: readonly { label: string; value: string }[]
}

type MatchFormContext = {
  choices: MatchFormChoices
  formAction: (formData: FormData) => void
  pending: boolean
  state: MatchFormState
}

const MatchFormContext = createContext<MatchFormContext | undefined>(undefined)

/** The list of the errors of the last save, which gets the focus when there are any. */
export function MatchErrorSummary() {
  const { state } = useMatchForm()
  const { errors, values } = state
  const order = [
    ...matchFieldNames,
    'doelpunten',
    ...values.doelpunten.flatMap((_goal, index) => goalFieldNames.map((field) => goalFieldId(index + 1, field))),
    'reden',
  ]
  const summary = order.flatMap((id) => {
    const message = errors[id]

    return message === undefined ? [] : [{ id, message }]
  })

  return <ErrorSummary errors={summary} id={summaryId} level={2} tabIndex={-1} />
}

/**
 * The cards of the form: the kick-off, the result and the goals, each with its own heading. The
 * first button in the form is a hidden "Opslaan", so the Enter key in a field saves, and never
 * removes the first goal. The goals are a table of fields, and every field and button of it
 * names the goal it belongs to.
 */
export function MatchFields() {
  const { choices, formAction, state } = useMatchForm()
  const { errors, values } = state
  const velden = values.velden
  // The two sides in the order of the match, as the title has the clubs.
  const sides = choices.home ? (['wij', 'zij'] as const) : (['zij', 'wij'] as const)
  const club = (side: 'wij' | 'zij') => (side === 'wij' ? ours : choices.opponent)

  // A select that is already on the page ignores a new `defaultValue`, and React resets the
  // form after every action, so a select that keeps its own value would fall back to the first
  // one. Its key is its value, so it comes back with what the server returned.
  const field = (name: MatchFieldName) => ({ defaultValue: velden[name], name })
  const score = (prefix: 'na90' | 'strafschoppen' | 'uitslag') =>
    sides.map((side) => (
      <Field
        error={errors[`${prefix}-${side}`]}
        id={`${prefix}-${side}`}
        key={side}
        label={club(side)}
        required={false}
      >
        <Input {...field(`${prefix}-${side}`)} autoComplete="off" inputMode="numeric" />
      </Field>
    ))

  const rows: InputTableRow[] = values.doelpunten.map((goal, index) => {
    const number = index + 1
    const id = (name: (typeof goalFieldNames)[number]) => goalFieldId(number, name)

    return {
      fields: [
        {
          control: (
            <Select defaultValue={goal.kant} key={goal.kant} name={id('kant')}>
              <Select.Option value="">Kies een team</Select.Option>
              {sides.map((side) => (
                <Select.Option key={side} value={side}>
                  {club(side)}
                </Select.Option>
              ))}
            </Select>
          ),
          error: errors[id('kant')],
          id: id('kant'),
        },
        {
          control: (
            <Input
              autoComplete="off"
              defaultValue={goal.minuut}
              inputMode="numeric"
              key={goal.minuut}
              name={id('minuut')}
            />
          ),
          error: errors[id('minuut')],
          id: id('minuut'),
        },
        {
          control: (
            <Input
              autoComplete="off"
              defaultValue={goal.extra}
              inputMode="numeric"
              key={goal.extra}
              name={id('extra')}
            />
          ),
          error: errors[id('extra')],
          id: id('extra'),
        },
        {
          control: (
            <Select defaultValue={goal.soort} key={goal.soort} name={id('soort')}>
              {choices.goalKinds.map((kind) => (
                <Select.Option key={kind.value} value={kind.value}>
                  {kind.label}
                </Select.Option>
              ))}
            </Select>
          ),
          error: errors[id('soort')],
          id: id('soort'),
        },
        {
          control: (
            <Select defaultValue={goal.speler} key={goal.speler} name={id('speler')}>
              <Select.Option value="">Kies een speler</Select.Option>
              {choices.squad.map((player) => (
                <Select.Option key={player.id} value={String(player.id)}>
                  {player.name}
                </Select.Option>
              ))}
              <Select.Option value={otherPlayer}>Andere speler</Select.Option>
            </Select>
          ),
          error: errors[id('speler')],
          id: id('speler'),
        },
        {
          control: <Input autoComplete="off" defaultValue={goal.naam} key={goal.naam} name={id('naam')} />,
          error: errors[id('naam')],
          id: id('naam'),
        },
      ],
      header: `Doelpunt ${number}`,
      remove: { name: 'knop', value: `doelpunt-weghalen-${number}` },
    }
  })

  return (
    <Form action={formAction} id={formId}>
      {/* The first button decides what Enter does: it saves. It is not on the screen. */}
      <Button aria-hidden="true" className="hf-visually-hidden" name="knop" tabIndex={-1} type="submit" value="opslaan">
        Opslaan
      </Button>
      <Card aria-labelledby="aftrap-kop">
        <Heading id="aftrap-kop" level={2}>
          Aftrap
        </Heading>
        <FieldGroup legend="Datum en tijd">
          <Field
            error={errors['aftrap-datum']}
            hint="Is alleen het weekend bekend, vul dan de eerste dag in."
            id="aftrap-datum"
            label="Datum"
          >
            <Input {...field('aftrap-datum')} type="date" />
          </Field>
          <Field
            error={errors['aftrap-tijd']}
            hint="Zoals 20:00. Laat leeg als de tijd nog niet bekend is."
            id="aftrap-tijd"
            label="Tijd"
            required={false}
          >
            <Input {...field('aftrap-tijd')} type="time" />
          </Field>
          <Field
            error={errors['aftrap-tekst']}
            hint="Alleen als de tijd niet bekend is, zoals 12-14 februari 2027."
            id="aftrap-tekst"
            label="Weekend of dag zonder tijd"
            required={false}
          >
            <Input {...field('aftrap-tekst')} autoComplete="off" />
          </Field>
        </FieldGroup>
      </Card>
      <Card aria-labelledby="uitslag-kop">
        <Heading id="uitslag-kop" level={2}>
          Uitslag
        </Heading>
        <Field error={errors.status} id="status" label="Status">
          <Select {...field('status')} key={velden.status}>
            {choices.statuses.map((status) => (
              <Select.Option key={status.value} value={status.value}>
                {status.label}
              </Select.Option>
            ))}
          </Select>
        </Field>
        <FieldGroup
          hint="Met verlenging erbij, zonder strafschoppen. Alleen bij een gespeelde wedstrijd."
          legend="Eindstand"
          separator="-"
        >
          {score('uitslag')}
        </FieldGroup>
      </Card>
      {choices.knockout ? (
        <Card aria-labelledby="verlenging-kop">
          <Heading id="verlenging-kop" level={2}>
            Verlenging en strafschoppen
          </Heading>
          <Field error={errors.verlenging} id="verlenging" label="Was er verlenging?">
            <Select {...field('verlenging')} key={velden.verlenging}>
              <Select.Option value="nee">Nee</Select.Option>
              <Select.Option value="ja">Ja</Select.Option>
            </Select>
          </Field>
          <FieldGroup
            hint="Alleen bij verlenging, en alleen als je de stand weet: voor allebei de teams of voor geen van beide."
            legend="Stand na 90 minuten"
            separator="-"
          >
            {score('na90')}
          </FieldGroup>
          <FieldGroup
            hint="Alleen als de stand na verlenging gelijk was: voor allebei de teams of voor geen van beide."
            legend="Strafschoppen"
            separator="-"
          >
            {score('strafschoppen')}
          </FieldGroup>
        </Card>
      ) : null}
      <Card aria-labelledby="doelpunten">
        <Heading id="doelpunten" level={2} tabIndex={-1}>
          Doelpunten
        </Heading>
        <Text appearance="meta">
          Kies bij Team het team dat het doelpunt krijgt, ook bij een eigen doelpunt. Bij 45+1 vul je 45 in als minuut
          en 1 bij blessuretijd. Kies bij een speler van de tegenstander Andere speler, en schrijf zijn naam bij Andere
          speler zoals Wikipedia hem schrijft. De doelpunten moeten optellen tot de eindstand.
        </Text>
        {errors.doelpunten === undefined ? null : (
          <Text className="hf-field-error">
            <Text as="span" className="hf-visually-hidden">
              Fout:
            </Text>{' '}
            {errors.doelpunten}
          </Text>
        )}
        <InputTable
          add={{ label: 'Doelpunt toevoegen', name: 'knop', value: 'doelpunt-toevoegen' }}
          caption="Doelpunten"
          columns={[
            { name: 'Team' },
            { name: 'Minuut', width: 'narrow' },
            { name: 'Blessuretijd', required: false, width: 'narrow' },
            { name: 'Soort' },
            { name: 'Speler' },
            { name: 'Andere speler', required: false },
          ]}
          empty={
            <Text>
              Er zijn geen doelpunten. Een uitslag zonder doelpunten mag; voeg ze toe als je de doelpuntenmakers weet.
            </Text>
          }
          removeLabel="Weghalen"
          rows={rows}
        />
      </Card>
    </Form>
  )
}

/**
 * The state of the form of a match, shared by the three parts of the page: the list of errors
 * (`MatchErrorSummary`), the cards with the fields (`MatchFields`) and the save panel in the
 * sidebar (`MatchSavePanel`). They sit in two columns of the page, so the page puts them in
 * this provider, and the field and button of the sidebar belong to the form by its `id` (the
 * `form` attribute). The form is a plain POST that works without JavaScript: the provider is a
 * client component only to show what the server says. Adding or removing a goal is a button
 * that sends the form to the server, which answers with the form again.
 */
export function MatchFormProvider({
  action,
  children,
  choices,
  initial,
}: {
  action: (previous: MatchFormState, formData: FormData) => Promise<MatchFormState>
  children: ReactNode
  choices: MatchFormChoices
  initial: MatchValues
}) {
  const [state, formAction, pending] = useActionState(action, { errors: {}, values: initial })

  // After a button the editor must land somewhere sensible. A save with errors goes to the list
  // of errors, and a goal that is added or removed to the goal that took its place. The button
  // that adds a goal is in the table of the goals, which has no `id` to give it.
  useEffect(() => {
    const target = state.focus ?? (Object.keys(state.errors).length > 0 ? summaryId : undefined)

    if (target === undefined) {
      return
    }

    const element =
      target === addGoalId
        ? document.querySelector<HTMLElement>(`#${formId} button[value="doelpunt-toevoegen"]`)
        : document.getElementById(target)

    element?.focus()
  }, [state])

  return <MatchFormContext value={{ choices, formAction, pending, state }}>{children}</MatchFormContext>
}

/**
 * The save panel for the sidebar: the reason, "Opslaan" and "Annuleren". Its field and button
 * belong to the form of the cards by its `id`, so they save it, with or without JavaScript.
 */
export function MatchSavePanel({ cancelHref }: { cancelHref: string }) {
  const { pending, state } = useMatchForm()

  return (
    <Card aria-labelledby="opslaan-kop">
      <Heading id="opslaan-kop" level={2}>
        Opslaan
      </Heading>
      <Text appearance="meta">Wat je opslaat, staat meteen op de site.</Text>
      <Field
        error={state.errors.reden}
        hint="Waarom vul je dit in of pas je het aan? Komt in het logboek, hoogstens 300 tekens."
        id="reden"
        label="Reden"
      >
        <Input autoComplete="off" defaultValue={state.values.reden} form={formId} name="reden" />
      </Field>
      <Button disabled={pending} form={formId} name="knop" type="submit" value="opslaan">
        Opslaan
      </Button>
      <Text>
        <Link href={cancelHref}>Annuleren</Link>
      </Text>
    </Card>
  )
}

function useMatchForm() {
  const context = use(MatchFormContext)

  if (context === undefined) {
    throw new Error('This part of the form of a match must be inside a MatchFormProvider.')
  }

  return context
}
