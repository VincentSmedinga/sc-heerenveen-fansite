'use client'

import {
  Button,
  Card,
  Disclosure,
  ErrorSummary,
  Field,
  Form,
  Heading,
  Input,
  List,
  RadioGroup,
  Select,
  Text,
} from '@fansite/design-system'
import { createContext, type ReactNode, use, useActionState, useEffect, useState } from 'react'

import type { LiveEventInput, LiveEventRow, LiveKind, LivePlayer } from '#src/beheer/live-report'

import { cardKindChoices, goalKindChoices } from '#src/beheer/report-fields'

import type { LiveFormState, LiveRemoveState } from './actions'

// The forms of the quick screen (#907): one for each kind of event, and the list of the events
// with "Haal weg". Every form is a post, so it works without JavaScript. With JavaScript, the
// fields are empty again after a save, the focus is back on the first field, and a line with
// `role="status"` says what was added.

const emptyState: LiveFormState = { version: 0 }

/** Where the removal of an event is told: its form is gone by then, so the screen says it. */
const StatusContext = createContext<(message: string) => void>(() => {})

/** The `id` of a field of a form, as the errors of the server name it. */
const fieldId = (kind: LiveKind, field: string) => `live-${kind}-${field}`

/** The form of one kind of event: the side, the players and the minute. */
export function LiveEventForm({
  action,
  kind,
  opponent,
  players,
  title,
}: {
  action: (previous: LiveFormState, formData: FormData) => Promise<LiveFormState>
  kind: LiveKind
  opponent: string
  players: readonly LivePlayer[]
  title: string
}) {
  const [state, formAction, pending] = useActionState(action, emptyState)
  const errors = state.errors ?? {}
  const values = state.values ?? {}
  const summaryId = `live-${kind}-fouten`
  const headingId = `live-${kind}-kop`
  const order = ['kant', 'speler', 'naam', 'assist', 'soort', 'eruit', 'erin', 'minuut', 'extra'] as const
  const summary = order.flatMap((field) => {
    const message = errors[fieldId(kind, field)]

    return message === undefined ? [] : [{ id: fieldId(kind, field), message }]
  })

  useEffect(() => {
    if (state.version === 0) {
      return
    }
    if (state.saved !== undefined) {
      // The next event starts where this one did.
      document.getElementById(fieldId(kind, 'kant'))?.focus()
    } else if (state.errors !== undefined) {
      document.getElementById(summaryId)?.focus()
    }
  }, [kind, state, summaryId])

  const both = new Set(players.map((player) => player.ours)).size > 1
  const choose = (id: string, label: string, list: readonly LivePlayer[], hint?: string, required = true) => (
    <Field
      error={errors[fieldId(kind, id)]}
      {...(hint === undefined ? {} : { hint })}
      id={fieldId(kind, id)}
      label={label}
      required={required}
    >
      <Select defaultValue={values[id as keyof LiveEventInput] ?? ''} name={id}>
        <Select.Option value="">{required ? 'Kies een speler' : 'Geen'}</Select.Option>
        {list.map((player) => (
          <Select.Option key={player.id} value={String(player.id)}>
            {both ? `${player.ours ? 'sc Heerenveen' : opponent}: ${player.label}` : player.label}
          </Select.Option>
        ))}
      </Select>
    </Field>
  )

  const onPitch = players.filter((player) => player.onPitch)
  const bench = players.filter((player) => player.bench)

  return (
    <>
      <ErrorSummary errors={summary} id={summaryId} level={2} tabIndex={-1} />
      <Card aria-labelledby={headingId}>
        <Heading id={headingId} level={2}>
          {title}
        </Heading>
        {/* Outside the form, which is made anew after a save, so a screen reader hears it. */}
        <Text appearance="meta" role="status">
          {state.saved ?? ''}
        </Text>
        <Form action={formAction} key={state.version}>
          <RadioGroup
            error={errors[fieldId(kind, 'kant')]}
            id={fieldId(kind, 'kant')}
            legend={kind === 'doelpunt' ? 'Wie scoorde?' : 'Welke kant?'}
            name="kant"
            options={[
              { label: 'sc Heerenveen', value: 'wij' },
              { label: opponent, value: 'zij' },
            ]}
            {...(values.kant === undefined ? {} : { value: values.kant })}
          />
          <Field error={errors[fieldId(kind, 'minuut')]} id={fieldId(kind, 'minuut')} label="Minuut">
            <Input
              autoComplete="off"
              defaultValue={values.minuut ?? ''}
              inputMode="numeric"
              name="minuut"
              width="narrow"
            />
          </Field>
          <Field
            error={errors[fieldId(kind, 'extra')]}
            hideOptional
            hint="Alleen als de minuut 45, 90, 105 of 120 is."
            id={fieldId(kind, 'extra')}
            label="Blessuretijd in minuten"
            required={false}
          >
            <Input
              autoComplete="off"
              defaultValue={values.extra ?? ''}
              inputMode="numeric"
              name="extra"
              width="narrow"
            />
          </Field>
          {kind === 'doelpunt' ? (
            <>
              {choose('speler', 'Speler die scoorde', players, undefined, false)}
              <Field
                error={errors[fieldId(kind, 'naam')]}
                hideOptional
                hint="Alleen voor een speler die niet in de lijst staat, zoals een speler van de tegenstander."
                id={fieldId(kind, 'naam')}
                label="Naam van de speler"
                required={false}
              >
                <Input autoComplete="off" defaultValue={values.naam ?? ''} name="naam" />
              </Field>
              {choose('assist', 'Assist', players, undefined, false)}
              <Field error={errors[fieldId(kind, 'soort')]} id={fieldId(kind, 'soort')} label="Soort doelpunt">
                <Select defaultValue={values.soort ?? 'gewoon'} name="soort" width="natural">
                  {goalKindChoices.map((choice) => (
                    <Select.Option key={choice.value} value={choice.value}>
                      {choice.label}
                    </Select.Option>
                  ))}
                </Select>
              </Field>
            </>
          ) : kind === 'kaart' ? (
            <>
              {choose('speler', 'Speler', players)}
              <RadioGroup
                error={errors[fieldId(kind, 'soort')]}
                id={fieldId(kind, 'soort')}
                legend="Soort kaart"
                name="soort"
                options={cardKindChoices}
                {...(values.soort === undefined ? {} : { value: values.soort })}
              />
            </>
          ) : (
            <>
              {choose('eruit', 'Speler die eruit gaat', onPitch)}
              {choose('erin', 'Speler die erin komt', bench)}
            </>
          )}
          <Button disabled={pending} type="submit">
            {title} opslaan
          </Button>
        </Form>
      </Card>
    </>
  )
}

/** The events of the report from the last to the first, each with "Haal weg" and a question. */
export function LiveEvents({
  events,
}: {
  /** Each event with the action that takes it away, bound on the server to its row. */
  events: readonly (LiveEventRow & { action: (previous: LiveRemoveState) => Promise<LiveRemoveState> })[]
}) {
  if (events.length === 0) {
    return <Text>Nog geen gebeurtenissen.</Text>
  }

  return (
    <List>
      {events.map((event) => (
        <List.Item key={`${event.kind}-${event.id}`}>
          <LiveEvent action={event.action} event={event} />
        </List.Item>
      ))}
    </List>
  )
}

/** Holds the line that says what was done, and shows it where a screen reader finds it. */
export function LiveStatusProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')

  return (
    <StatusContext value={setMessage}>
      <Text appearance="meta" role="status">
        {message}
      </Text>
      {children}
    </StatusContext>
  )
}

function LiveEvent({
  action,
  event,
}: {
  action: (previous: LiveRemoveState) => Promise<LiveRemoveState>
  event: LiveEventRow
}) {
  const [state, formAction, pending] = useActionState(action, {})
  const announce = use(StatusContext)

  useEffect(() => {
    if (state.removed !== undefined) {
      announce(state.removed)
    }
  }, [announce, state])

  return (
    <>
      <Text as="span">{event.text}</Text>
      <Disclosure open={state.error === undefined ? undefined : true} summary={`Haal weg: ${event.text}`}>
        {state.error === undefined ? null : <Text role="alert">Fout: {state.error}</Text>}
        <Text>Weet je zeker dat je dit weghaalt? Het komt in het logboek.</Text>
        <Form action={formAction}>
          <Button appearance="danger" disabled={pending} type="submit">
            Ja, haal weg
            <Text as="span" className="hf-visually-hidden">
              {' '}
              {event.text}
            </Text>
          </Button>
        </Form>
      </Disclosure>
    </>
  )
}
