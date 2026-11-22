'use client'

import {
  Button,
  Card,
  Disclosure,
  ErrorSummary,
  Field,
  FieldGroup,
  Form,
  Heading,
  Input,
  List,
  RadioGroup,
  Select,
  Text,
} from '@fansite/design-system'
import { squadAt } from '@fansite/shared/match-report'
import {
  createContext,
  type ReactNode,
  use,
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import type { LiveEventInput, LiveEventRow, LiveKind, LiveMoves, LivePlayer } from '#src/beheer/live-report'

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
  moves = { cards: [], substitutions: [] },
  opponent,
  players,
  title,
}: {
  action: (previous: LiveFormState, formData: FormData) => Promise<LiveFormState>
  kind: LiveKind
  /** The substitutions and cards so far, for the lists of a substitution. */
  moves?: LiveMoves
  opponent: string
  players: readonly LivePlayer[]
  title: string
}) {
  const [state, formAction, pending] = useActionState(action, emptyState)
  const errors = state.errors ?? {}
  const values = state.values ?? {}
  const scripted = useScripted()
  // The side, the minute and the two players of a substitution are kept here, so the lists can
  // follow them. After a save, or an error, they start again from what the server sent back.
  const [seen, setSeen] = useState(state.version)
  const [side, setSide] = useState(values.kant ?? '')
  const [minute, setMinute] = useState(values.minuut ?? '')
  const [extra, setExtra] = useState(values.extra ?? '')
  const [out, setOut] = useState(values.eruit ?? '')
  const [entering, setEntering] = useState(values.erin ?? '')
  const [cleared, setCleared] = useState('')
  if (seen !== state.version) {
    setSeen(state.version)
    setSide(values.kant ?? '')
    setMinute(values.minuut ?? '')
    setExtra(values.extra ?? '')
    setOut(values.eruit ?? '')
    setEntering(values.erin ?? '')
    setCleared('')
  }
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
  const option = (player: LivePlayer, plain: boolean) => (
    <Select.Option key={player.id} value={String(player.id)}>
      {both && !plain ? `${player.ours ? 'sc Heerenveen' : opponent}: ${player.label}` : player.label}
    </Select.Option>
  )
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
        {list.map((player) => option(player, false))}
      </Select>
    </Field>
  )

  // The lists of a substitution. Without JavaScript every player of both teams is in them and
  // the server refuses what cannot be. With JavaScript they hold the players of the chosen team
  // who can go off or come on at this minute (the rule of the server, `squadAt`). A player who
  // is chosen and no longer fits stays, with a note, so nothing disappears quietly.
  const teamName = side === 'wij' ? 'sc Heerenveen' : opponent
  const team = side === '' ? [] : players.filter((player) => player.ours === (side === 'wij'))
  const minuteNumber = /^\d{1,3}$/u.test(minute.trim()) ? Number(minute.trim()) : Infinity
  const extraNumber = stoppageMinutes.has(minuteNumber) && /^\d{1,2}$/u.test(extra.trim()) ? Number(extra.trim()) : 0
  const squad = squadAt(
    {
      bench: team.filter((player) => !player.starter).map((player) => player.id),
      cards: moves.cards,
      starters: team.filter((player) => player.starter).map((player) => player.id),
      substitutions: moves.substitutions,
    },
    { at: minuteNumber + extraNumber / 100 },
  )
  const wissel = (
    id: 'erin' | 'eruit',
    label: string,
    fits: ReadonlySet<number>,
    note: string,
    hint: string,
    chosen: string,
    choose: (value: string) => void,
  ) => {
    const list = team.filter((player) => fits.has(player.id))
    const stays = team.find((player) => String(player.id) === chosen && !fits.has(player.id))
    const empty = !scripted
      ? undefined
      : side === ''
        ? 'Kies eerst voor wie'
        : team.length === 0
          ? `Niemand van ${teamName} in het verslag`
          : undefined

    return (
      <Field
        error={errors[fieldId(kind, id)]}
        hint={
          scripted
            ? hint
            : 'Alle spelers van beide teams staan in de lijst. Bij het opslaan controleert de site of de wissel kan.'
        }
        id={fieldId(kind, id)}
        label={label}
      >
        {scripted ? (
          <Select
            name={id}
            onChange={(event) => {
              choose(event.currentTarget.value)
              // A new choice ends the line about the players that were cleared.
              setCleared('')
            }}
            value={chosen}
          >
            <Select.Option value="">{empty ?? 'Kies een speler'}</Select.Option>
            {list.map((player) => option(player, true))}
            {stays === undefined ? null : (
              <Select.Option value={String(stays.id)}>
                {stays.label} ({note})
              </Select.Option>
            )}
          </Select>
        ) : (
          <Select defaultValue={values[id] ?? ''} name={id}>
            <Select.Option value="">Kies een speler</Select.Option>
            {players
              .filter((player) => (id === 'eruit' ? player.onPitch : player.bench))
              .map((player) => option(player, false))}
          </Select>
        )}
      </Field>
    )
  }

  return (
    <>
      <ErrorSummary errors={summary} id={summaryId} level={2} tabIndex={-1} />
      <Card aria-labelledby={headingId}>
        <Heading id={headingId} level={2}>
          {title}
        </Heading>
        {/* Outside the form, which is made anew after a save, so a screen reader hears it. */}
        <Text appearance="meta" role="status">
          {cleared || (state.saved ?? '')}
        </Text>
        <Form action={formAction} key={state.version}>
          <RadioGroup
            error={errors[fieldId(kind, 'kant')]}
            id={fieldId(kind, 'kant')}
            legend="Voor wie"
            name="kant"
            onChange={(event) => {
              const next = event.target instanceof HTMLInputElement ? event.target.value : side

              if (kind === 'wissel' && next !== side) {
                if (out !== '' || entering !== '') {
                  setCleared('Spelers gewist: je koos een andere kant.')
                } else {
                  setCleared('')
                }
                setOut('')
                setEntering('')
              }
              setSide(next)
            }}
            options={[
              { label: 'sc Heerenveen', value: 'wij' },
              { label: opponent, value: 'zij' },
            ]}
            {...(values.kant === undefined ? {} : { value: values.kant })}
          />
          <MomentFields
            extra={extra}
            extraError={errors[fieldId(kind, 'extra')]}
            extraId={fieldId(kind, 'extra')}
            minute={minute}
            minuteError={errors[fieldId(kind, 'minuut')]}
            minuteId={fieldId(kind, 'minuut')}
            setExtra={setExtra}
            setMinute={setMinute}
          />
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
                options={cardKindChoices.filter((choice) => choice.value !== 'geel-rood')}
                {...(values.soort === undefined ? {} : { value: values.soort })}
              />
            </>
          ) : (
            <>
              {wissel(
                'eruit',
                'Speler die eruit gaat',
                squad.onPitch,
                'staat dan niet op het veld',
                `Alleen spelers van ${side === '' ? 'het gekozen team' : teamName} die op deze minuut op het veld staan.`,
                out,
                setOut,
              )}
              {wissel(
                'erin',
                'Speler die erin komt',
                squad.bench,
                'zit dan niet op de bank',
                `Alleen spelers van ${side === '' ? 'het gekozen team' : teamName} die op de bank zitten en niet al erin komen.`,
                entering,
                setEntering,
              )}
            </>
          )}
          <Button disabled={pending} icon="save" type="submit">
            {title} opslaan
          </Button>
        </Form>
      </Card>
    </>
  )
}

/** The minutes that have added time, as `checkReportForm` allows. */
const stoppageMinutes = new Set([45, 90, 105, 120])

/** Whether the page runs JavaScript: false on the server and in the first render. */
const useScripted = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

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

/**
 * Holds the line that says what was done, and shows it where a screen reader finds it. When the
 * list has fewer events than before, one was taken away: the button that was pressed is gone,
 * and Next puts the focus at the top of the page when it makes the page anew. This effect runs
 * after that and moves the focus to the heading of the list (WCAG 2.4.3).
 */
export function LiveStatusProvider({ children, eventCount }: { children: ReactNode; eventCount: number }) {
  const [message, setMessage] = useState('')
  const previous = useRef(eventCount)

  useEffect(() => {
    if (eventCount < previous.current) {
      document.getElementById('gebeurtenissen-kop')?.focus()
    }
    previous.current = eventCount
  }, [eventCount])

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
  // The action stays the server action itself, so the form also works without JavaScript.
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

/**
 * The minute and, next to it, the added time. With JavaScript the added time is only there when
 * the minute is 45, 90, 105 or 120, and it comes and goes while the editor types: the field of
 * the minute keeps the focus, and the added time keeps its label. A field that is gone is not
 * sent and has lost its value. Without JavaScript, and with an error on it, it is always there.
 */
function MomentFields({
  extra,
  extraError,
  extraId,
  minute,
  minuteError,
  minuteId,
  setExtra,
  setMinute,
}: {
  extra: string
  extraError: string | undefined
  extraId: string
  minute: string
  minuteError: string | undefined
  minuteId: string
  setExtra: (value: string) => void
  setMinute: (value: string) => void
}) {
  const scripted = useScripted()
  const showExtra = !scripted || extraError !== undefined || stoppageMinutes.has(Number(minute.trim() || Number.NaN))

  return (
    <FieldGroup legend="Moment">
      <Field error={minuteError} id={minuteId} label="Minuut">
        <Input
          autoComplete="off"
          inputMode="numeric"
          name="minuut"
          onChange={(event) => {
            const next = event.currentTarget.value

            setMinute(next)
            // The added time of a minute that has none is gone, and has lost its value.
            if (!stoppageMinutes.has(Number(next.trim() || Number.NaN))) {
              setExtra('')
            }
          }}
          value={minute}
          width="narrow"
        />
      </Field>
      {showExtra ? (
        <Field error={extraError} id={extraId} label="Blessuretijd" required={false}>
          <Input
            autoComplete="off"
            inputMode="numeric"
            name="extra"
            onChange={(event) => {
              setExtra(event.currentTarget.value)
            }}
            value={extra}
            width="narrow"
          />
        </Field>
      ) : null}
    </FieldGroup>
  )
}
