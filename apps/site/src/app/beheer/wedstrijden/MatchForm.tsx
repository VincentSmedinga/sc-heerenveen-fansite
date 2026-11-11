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
  List,
  RadioGroup,
  Select,
  Text,
} from '@fansite/design-system'
import { useRouter } from 'next/navigation'
import {
  type ChangeEvent,
  createContext,
  type ReactNode,
  use,
  useActionState,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  addGoalId,
  emptyGoal,
  goalFieldId,
  type GoalFieldName,
  goalFieldNames,
  goalTotalOf,
  type GoalValues,
  isUntouchedGoal,
  type MatchFieldName,
  matchFieldNames,
  type MatchFormState,
  type MatchValues,
  type ScorerForm,
  scorerFormOf,
} from '#src/beheer/match-fields'

const summaryId = 'fouten'

/** The `id` of the form, which the fields and buttons in the sidebar name in their `form`. */
const formId = 'wedstrijd'

const ours = 'sc Heerenveen'

/** The statuses, the kinds of goal and the squad, as the form words them. */
export type MatchFormChoices = {
  /**
   * Where an editor adds a player the squad misses, for the season of the match (issue 1021).
   * The address names the match, so the form of the player leads back to it.
   */
  addPlayer?: undefined | { href: string; season: string }
  goalKinds: readonly { label: string; value: string }[]
  /** Whether sc Heerenveen plays at home: clubs and scores follow the order of the match. */
  home: boolean
  /** Whether the competition has extra time: the cup and the play-offs. */
  knockout: boolean
  opponent: string
  /**
   * The match has a report, and the goals are the report's: the form shows them in words with a
   * link to the report, and has no fields for them.
   */
  report?: undefined | { goals: readonly string[]; href: string }
  /** How soon what is saved shows on the site, as "binnen vijf minuten". */
  showDelay: string
  squad: readonly { id: number; name: string }[]
  statuses: readonly { label: string; value: string }[]
  /** Whether the time may stay empty: a match of the old fansite's archive has a day only. */
  timeOptional: boolean
}

type MatchFormContext = {
  choices: MatchFormChoices
  formAction: (formData: FormData) => void
  pending: boolean
  state: MatchFormState
}

const MatchFormContext = createContext<MatchFormContext | undefined>(undefined)

/** What the form knows before the server answers: how many goals it has and who scored. */
type LiveGoals = { count: number; for: MatchFormState; scorers: ScorerForm[] }

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
 *
 * With JavaScript the goals follow the form while it is filled in: a new end result gives as
 * many goals as it adds up to, and the team and the kind of a goal decide which field asks for
 * the scorer (see `scorerFormOf`). The field that does not ask stays in the page, hidden and
 * not sent, so a mistake does not wipe it. Without JavaScript the server shows the same after
 * each button, because it has the same rules.
 *
 * A player the squad misses is added in a new tab, so what is filled in here stays (issue
 * 1021). Each time the editor comes back to this tab, the page asks the server for the squad
 * again: the new player is in the list of every goal, and the fields keep what was typed.
 */
export function MatchFields() {
  const { choices, formAction, state } = useMatchForm()
  const [live, setLive] = useState<LiveGoals>()
  const router = useRouter()
  const addingPlayer = useRef(false)

  useEffect(() => {
    const refresh = () => {
      // Every return after the link asks again: the editor may look back here before the
      // player is saved in the other tab.
      if (addingPlayer.current) {
        router.refresh()
      }
    }

    window.addEventListener('focus', refresh)

    return () => {
      window.removeEventListener('focus', refresh)
    }
  }, [router])

  const { errors, values } = state
  const velden = values.velden
  // What the form said before the server answered is only good until the server answers.
  const current = live?.for === state ? live : undefined
  const goals = Array.from(
    { length: current?.count ?? values.doelpunten.length },
    (_nothing, index) => values.doelpunten[index] ?? emptyGoal,
  )
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
        hideOptional
        id={`${prefix}-${side}`}
        key={side}
        label={club(side)}
        required={false}
      >
        <Input {...field(`${prefix}-${side}`)} autoComplete="off" inputMode="numeric" width="narrow" />
      </Field>
    ))

  // The form tells how many goals it has and who scored, from what is in it now. The goals only
  // change with the end result: a goal that was added with the button stays.
  const follow = (event: ChangeEvent<HTMLFormElement>) => {
    if (choices.report !== undefined) {
      return
    }

    const { elements } = event.currentTarget
    const read = (name: string) => {
      const element = elements.namedItem(name)

      return element !== null && 'value' in element ? element.value.trim() : ''
    }
    const goalOf = (number: number) =>
      Object.fromEntries(goalFieldNames.map((name) => [name, read(goalFieldId(number, name))])) as GoalValues
    const total =
      event.target instanceof HTMLInputElement && /^uitslag-(?:wij|zij)$/u.test(event.target.name)
        ? goalTotalOf({ 'uitslag-wij': read('uitslag-wij'), 'uitslag-zij': read('uitslag-zij') })
        : undefined
    let count = goals.length

    if (total !== undefined) {
      count = Math.max(count, total)

      // Goals that nobody filled in go, from the end. One that has something in it never does.
      while (count > total && isUntouchedGoal(goalOf(count))) {
        count -= 1
      }
    }

    setLive({
      count,
      for: state,
      scorers: Array.from({ length: count }, (_nothing, index) => {
        const goal = goalOf(index + 1)

        return scorerFormOf(goal.kant, goal.soort)
      }),
    })
  }

  const rows: InputTableRow[] = goals.map((goal, index) => {
    const number = index + 1
    const id = (name: GoalFieldName) => goalFieldId(number, name)
    const scorer = current?.scorers[index] ?? scorerFormOf(goal.kant, goal.soort)

    return {
      fields: [
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
            <Select defaultValue={goal.soort} key={goal.soort} name={id('soort')} width="natural">
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
          group: (legend) => (
            <RadioGroup
              error={errors[id('kant')]}
              id={id('kant')}
              key={goal.kant}
              legend={legend}
              name={id('kant')}
              options={sides.map((side) => ({ label: club(side), value: side }))}
              value={goal.kant}
            />
          ),
          id: id('kant'),
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
            </Select>
          ),
          error: errors[id('speler')],
          hidden: scorer !== 'squad',
          id: id('speler'),
        },
        {
          control: <Input autoComplete="off" defaultValue={goal.naam} key={goal.naam} name={id('naam')} />,
          error: errors[id('naam')],
          hidden: scorer !== 'name',
          id: id('naam'),
        },
      ],
      header: `Doelpunt ${number}`,
      mark: String(number),
      remove: { name: 'knop', value: `doelpunt-weghalen-${number}` },
    }
  })

  return (
    <Form action={formAction} id={formId} onChange={follow}>
      {/* The first button decides what Enter does: it saves. It is not on the screen. */}
      <Button aria-hidden="true" className="hf-visually-hidden" name="knop" tabIndex={-1} type="submit" value="opslaan">
        Opslaan
      </Button>
      <Card aria-labelledby="aftrap-kop">
        <Heading id="aftrap-kop" level={2}>
          Aftrap
        </Heading>
        <FieldGroup
          legend={
            <Text as="span" className="hf-visually-hidden">
              Datum en tijd
            </Text>
          }
        >
          <Field
            error={errors['aftrap-datum']}
            hint="Is alleen het weekend bekend? Vul de eerste dag in."
            id="aftrap-datum"
            label="Datum"
          >
            <Input {...field('aftrap-datum')} type="date" width="natural" />
          </Field>
          <Field
            error={errors['aftrap-tijd']}
            hideOptional
            {...(choices.timeOptional
              ? { hint: 'Staat de tijd niet bij de sc Heerenveen Fansite? Laat hem dan leeg.' }
              : {})}
            id="aftrap-tijd"
            label="Tijd"
            required={false}
          >
            <Input {...field('aftrap-tijd')} type="time" width="natural" />
          </Field>
          <Field
            error={errors['aftrap-tekst']}
            hideOptional
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
          <Select {...field('status')} key={velden.status} width="natural">
            {choices.statuses.map((status) => (
              <Select.Option key={status.value} value={status.value}>
                {status.label}
              </Select.Option>
            ))}
          </Select>
        </Field>
        <FieldGroup hint="Met verlenging, zonder strafschoppen." legend="Eindstand" separator="-">
          {score('uitslag')}
        </FieldGroup>
      </Card>
      {choices.knockout ? (
        <Card aria-labelledby="verlenging-kop">
          <Heading id="verlenging-kop" level={2}>
            Verlenging en strafschoppen
          </Heading>
          <RadioGroup
            error={errors.verlenging}
            id="verlenging"
            key={velden.verlenging}
            legend="Was er verlenging?"
            name="verlenging"
            options={[
              { label: 'Nee', value: 'nee' },
              { label: 'Ja', value: 'ja' },
            ]}
            value={velden.verlenging}
          />
          <FieldGroup
            hint="Alleen bij verlenging, voor allebei de teams of voor geen van beide."
            legend="Stand na 90 minuten"
            separator="-"
          >
            {score('na90')}
          </FieldGroup>
          <FieldGroup
            hint="Alleen bij een gelijke stand na verlenging, voor allebei de teams of voor geen van beide."
            legend="Strafschoppen"
            separator="-"
          >
            {score('strafschoppen')}
          </FieldGroup>
        </Card>
      ) : null}
      <Card aria-labelledby="gegevens-kop">
        <Heading id="gegevens-kop" level={2}>
          Gegevens
        </Heading>
        <Field
          error={errors.toeschouwers}
          hideOptional
          hint="Alleen bij een gespeelde wedstrijd. Een wedstrijd zonder publiek heeft 0."
          id="toeschouwers"
          label="Toeschouwers"
          required={false}
        >
          <Input {...field('toeschouwers')} autoComplete="off" inputMode="numeric" width="narrow" />
        </Field>
        <Field error={errors.scheidsrechter} hideOptional id="scheidsrechter" label="Scheidsrechter" required={false}>
          <Input {...field('scheidsrechter')} autoComplete="off" />
        </Field>
        <Field error={errors.stadion} hideOptional id="stadion" label="Stadion" required={false}>
          <Input {...field('stadion')} autoComplete="off" autoCorrect="off" />
        </Field>
        <Field
          error={errors.opmerking}
          hideOptional
          hint="Een feit voor de bezoeker, zoals Begon later door file."
          id="opmerking"
          label="Opmerking"
          required={false}
        >
          <Input {...field('opmerking')} autoComplete="off" />
        </Field>
      </Card>
      {choices.report === undefined ? null : (
        <Card aria-labelledby="doelpunten">
          <Heading id="doelpunten" level={2} tabIndex={-1}>
            Doelpunten
          </Heading>
          <Text>
            De doelpunten van deze wedstrijd staan in het verslag. Pas ze daar aan:{' '}
            <Link href={choices.report.href}>naar het verslag</Link>.
          </Text>
          {choices.report.goals.length === 0 ? (
            <Text>Er zijn geen doelpunten.</Text>
          ) : (
            <List role="list">
              {choices.report.goals.map((goal) => (
                <List.Item key={goal}>
                  <Text>{goal}</Text>
                </List.Item>
              ))}
            </List>
          )}
        </Card>
      )}
      {choices.report !== undefined ? null : (
        <Card aria-labelledby="doelpunten">
          <Heading id="doelpunten" level={2} tabIndex={-1}>
            Doelpunten
          </Heading>
          <Text appearance="meta">
            Team is het team dat het doelpunt krijgt, ook bij een eigen doelpunt. Bij 45+1 vul je 45 in als minuut en 1
            bij blessuretijd. Weet niemand de minuut, laat hem dan leeg. Schrijf de naam van een speler van de
            tegenstander zoals Wikipedia hem schrijft.
          </Text>
          {choices.addPlayer === undefined ? null : (
            <Text>
              <Link
                href={choices.addPlayer.href}
                onClick={() => {
                  addingPlayer.current = true
                }}
                target="_blank"
              >
                De speler staat er niet in? Voeg hem toe aan de selectie van {choices.addPlayer.season} (opent in een
                nieuw tabblad)
              </Link>
            </Text>
          )}
          {/* The end result changes the goals by itself, so a screen reader is told. */}
          <Text className="hf-visually-hidden" role="status">
            {current === undefined || current.count === values.doelpunten.length ? '' : describeCount(current.count)}
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
              { name: 'Minuut', width: 'narrow' },
              { hideOptional: true, name: 'Blessuretijd', required: false, width: 'narrow' },
              { name: 'Soort', width: 'natural' },
              { line: 2, name: 'Team', width: 'natural' },
              { line: 2, name: 'Speler' },
              { line: 2, name: 'Andere speler' },
            ]}
            empty={<Text>Er zijn geen doelpunten. Dat mag, ook bij een uitslag.</Text>}
            removeLabel="Weghalen"
            rows={rows}
          />
        </Card>
      )}
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
 * The save panel for the sidebar: the reason and "Opslaan" in a card, and "Annuleren" in a cell
 * of its own under it. Under the button it would be too close to be a target of its own at the
 * size of the compact admin (WCAG 2.5.8). Its field and button belong to the form of the cards
 * by its `id`, so they save it, with or without JavaScript.
 */
export function MatchSavePanel({ cancelHref }: { cancelHref: string }) {
  const { choices, pending, state } = useMatchForm()

  return (
    <>
      <Card aria-labelledby="opslaan-kop">
        <Heading id="opslaan-kop" level={2}>
          Opslaan
        </Heading>
        <Text appearance="meta">Staat {choices.showDelay} op de site.</Text>
        <Field error={state.errors.reden} hint="Komt in het logboek, hoogstens 300 tekens." id="reden" label="Reden">
          <Input autoComplete="off" defaultValue={state.values.reden} form={formId} name="reden" />
        </Field>
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

/** What a screen reader hears when the form changes the number of goals by itself. */
function describeCount(count: number) {
  return `Het formulier heeft nu ${count === 0 ? 'geen doelpunten' : count === 1 ? '1 doelpunt' : `${count} doelpunten`}.`
}

function useMatchForm() {
  const context = use(MatchFormContext)

  if (context === undefined) {
    throw new Error('This part of the form of a match must be inside a MatchFormProvider.')
  }

  return context
}
