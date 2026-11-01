'use client'

import { Button, Card, ErrorSummary, Field, Form, Heading, Input, Select, Text } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

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

/** The statuses, the kinds of goal and the squad, as the form words them. */
export type MatchFormChoices = {
  goalKinds: readonly { label: string; value: string }[]
  /** Whether the competition has extra time: the cup and the play-offs. */
  knockout: boolean
  opponent: string
  squad: readonly { id: number; name: string }[]
  statuses: readonly { label: string; value: string }[]
}

/**
 * The form to fill in a match or to correct one. It is a client component only to show what the
 * server says: the form is a plain POST that works without JavaScript, and adding or removing a
 * goal is a button that sends the form to the server, which answers with the form again. The
 * first button in the form is a hidden "Opslaan", so the Enter key in a field saves, and never
 * removes the first goal. The goals are numbered as the editor counts them, and every button
 * says which goal it is for.
 */
export function MatchForm({
  action,
  choices,
  initial,
}: {
  action: (previous: MatchFormState, formData: FormData) => Promise<MatchFormState>
  choices: MatchFormChoices
  initial: MatchValues
}) {
  const [state, formAction, pending] = useActionState(action, { errors: {}, values: initial })
  const { errors, values } = state
  const velden = values.velden
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

  // After a button the editor must land somewhere sensible. A save with errors goes to the list
  // of errors, and a goal that is added or removed to the goal that took its place.
  useEffect(() => {
    const target = state.focus ?? (Object.keys(state.errors).length > 0 ? summaryId : undefined)

    if (target !== undefined) {
      document.getElementById(target)?.focus()
    }
  }, [state])

  // A select that is already on the page ignores a new `defaultValue`, and React resets the
  // form after every action, so a select that keeps its own value would fall back to the first
  // one. Its key is its value, so it comes back with what the server returned. The rows of the
  // goals have a key of their values for the same reason.
  const field = (name: MatchFieldName) => ({ defaultValue: velden[name], name })

  return (
    <>
      <ErrorSummary errors={summary} id={summaryId} level={2} tabIndex={-1} />
      <Form action={formAction}>
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
        <Card aria-labelledby="aftrap-kop">
          <Heading id="aftrap-kop" level={2}>
            Aftrap
          </Heading>
          <Field
            error={errors['aftrap-datum']}
            hint="Dag van de wedstrijd, als jjjj-mm-dd. Is alleen het weekend bekend, vul dan de eerste dag in."
            id="aftrap-datum"
            label="Datum"
          >
            <Input {...field('aftrap-datum')} type="date" />
          </Field>
          <Field
            error={errors['aftrap-tijd']}
            hint="Aanvangstijd op de klok in Nederland, zoals 20:00. Is de tijd nog niet bekend, laat het dan leeg."
            id="aftrap-tijd"
            label="Tijd"
            required={false}
          >
            <Input {...field('aftrap-tijd')} type="time" />
          </Field>
          <Field
            error={errors['aftrap-tekst']}
            hint="Alleen als de tijd niet bekend is: wanneer de wedstrijd is, zoals 12-14 februari 2027."
            id="aftrap-tekst"
            label="Weekend of dag zonder tijd"
            required={false}
          >
            <Input {...field('aftrap-tekst')} autoComplete="off" />
          </Field>
        </Card>
        <Card aria-labelledby="uitslag-kop">
          <Heading id="uitslag-kop" level={2}>
            Status en uitslag
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
          <Field
            error={errors['uitslag-wij']}
            hint="Alleen bij een gespeelde wedstrijd. Met verlenging erbij, zonder strafschoppen."
            id="uitslag-wij"
            label="Doelpunten sc Heerenveen"
            required={false}
          >
            <Input {...field('uitslag-wij')} autoComplete="off" inputMode="numeric" />
          </Field>
          <Field
            error={errors['uitslag-zij']}
            id="uitslag-zij"
            label={`Doelpunten ${choices.opponent}`}
            required={false}
          >
            <Input {...field('uitslag-zij')} autoComplete="off" inputMode="numeric" />
          </Field>
          {choices.knockout ? (
            <>
              <Field error={errors.verlenging} id="verlenging" label="Verlenging">
                <Select {...field('verlenging')} key={velden.verlenging}>
                  <Select.Option value="nee">Nee</Select.Option>
                  <Select.Option value="ja">Ja</Select.Option>
                </Select>
              </Field>
              <Field
                error={errors['na90-wij']}
                hint="Alleen bij verlenging, en alleen als je de stand weet: voor allebei de teams of voor geen van beide."
                id="na90-wij"
                label="Stand na 90 minuten, sc Heerenveen"
                required={false}
              >
                <Input {...field('na90-wij')} autoComplete="off" inputMode="numeric" />
              </Field>
              <Field
                error={errors['na90-zij']}
                id="na90-zij"
                label={`Stand na 90 minuten, ${choices.opponent}`}
                required={false}
              >
                <Input {...field('na90-zij')} autoComplete="off" inputMode="numeric" />
              </Field>
              <Field
                error={errors['strafschoppen-wij']}
                hint="Alleen als de stand na verlenging gelijk was: voor allebei de teams of voor geen van beide."
                id="strafschoppen-wij"
                label="Strafschoppen sc Heerenveen"
                required={false}
              >
                <Input {...field('strafschoppen-wij')} autoComplete="off" inputMode="numeric" />
              </Field>
              <Field
                error={errors['strafschoppen-zij']}
                id="strafschoppen-zij"
                label={`Strafschoppen ${choices.opponent}`}
                required={false}
              >
                <Input {...field('strafschoppen-zij')} autoComplete="off" inputMode="numeric" />
              </Field>
            </>
          ) : null}
        </Card>
        <Card aria-labelledby="doelpunten">
          <Heading id="doelpunten" level={2} tabIndex={-1}>
            Doelpunten
          </Heading>
          {errors.doelpunten === undefined ? null : (
            <Text className="hf-field-error">
              <Text as="span" className="hf-visually-hidden">
                Fout:
              </Text>{' '}
              {errors.doelpunten}
            </Text>
          )}
          {values.doelpunten.length === 0 ? (
            <Text>
              Er zijn geen doelpunten. Een uitslag zonder doelpunten mag; voeg ze toe als je de doelpuntenmakers weet.
            </Text>
          ) : null}
          {values.doelpunten.map((goal, index) => {
            const number = index + 1
            const id = (name: (typeof goalFieldNames)[number]) => goalFieldId(number, name)

            return (
              <Card
                aria-labelledby={`${id('kant')}-kop`}
                key={`${number}:${Object.values(goal).join('|')}`}
                surface="soft"
              >
                <Heading id={`${id('kant')}-kop`} level={3}>
                  Doelpunt {number}
                </Heading>
                <Field
                  error={errors[id('kant')]}
                  hint="Het team dat het doelpunt krijgt, ook bij een eigen doelpunt."
                  id={id('kant')}
                  label={`Voor welk team, doelpunt ${number}`}
                >
                  <Select defaultValue={goal.kant} name={id('kant')}>
                    <Select.Option value="">Kies een team</Select.Option>
                    <Select.Option value="wij">sc Heerenveen</Select.Option>
                    <Select.Option value="zij">{choices.opponent}</Select.Option>
                  </Select>
                </Field>
                <Field error={errors[id('minuut')]} id={id('minuut')} label={`Minuut, doelpunt ${number}`}>
                  <Input autoComplete="off" defaultValue={goal.minuut} inputMode="numeric" name={id('minuut')} />
                </Field>
                <Field
                  error={errors[id('extra')]}
                  hint="Bij 45+1 vul je 45 in de minuut in en 1 hier."
                  id={id('extra')}
                  label={`Blessuretijd in minuten, doelpunt ${number}`}
                  required={false}
                >
                  <Input autoComplete="off" defaultValue={goal.extra} inputMode="numeric" name={id('extra')} />
                </Field>
                <Field error={errors[id('soort')]} id={id('soort')} label={`Soort, doelpunt ${number}`}>
                  <Select defaultValue={goal.soort} name={id('soort')}>
                    {choices.goalKinds.map((kind) => (
                      <Select.Option key={kind.value} value={kind.value}>
                        {kind.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Field>
                <Field
                  error={errors[id('speler')]}
                  hint="Een speler van sc Heerenveen kies je uit de selectie. Maakte een speler van de tegenstander het doelpunt, kies dan Andere speler."
                  id={id('speler')}
                  label={`Speler, doelpunt ${number}`}
                >
                  <Select defaultValue={goal.speler} name={id('speler')}>
                    <Select.Option value="">Kies een speler</Select.Option>
                    {choices.squad.map((player) => (
                      <Select.Option key={player.id} value={String(player.id)}>
                        {player.name}
                      </Select.Option>
                    ))}
                    <Select.Option value={otherPlayer}>Andere speler</Select.Option>
                  </Select>
                </Field>
                <Field
                  error={errors[id('naam')]}
                  hint="Alleen voor een speler van de tegenstander, zoals Wikipedia hem schrijft."
                  id={id('naam')}
                  label={`Naam van de andere speler, doelpunt ${number}`}
                  required={false}
                >
                  <Input autoComplete="off" defaultValue={goal.naam} name={id('naam')} />
                </Field>
                <Button
                  appearance="soft"
                  disabled={pending}
                  name="knop"
                  type="submit"
                  value={`doelpunt-weghalen-${number}`}
                >
                  Doelpunt {number} weghalen
                </Button>
              </Card>
            )
          })}
          <Button
            appearance="soft"
            disabled={pending}
            id={addGoalId}
            name="knop"
            type="submit"
            value="doelpunt-toevoegen"
          >
            Doelpunt toevoegen
          </Button>
        </Card>
        <Card aria-labelledby="reden-kop">
          <Heading id="reden-kop" level={2}>
            Logboek
          </Heading>
          <Field
            error={errors.reden}
            hint="Waarom vul je dit in of pas je het aan? Komt in het logboek, hoogstens 300 tekens."
            id="reden"
            label="Reden"
          >
            <Input autoComplete="off" defaultValue={values.reden} name="reden" />
          </Field>
        </Card>
        <Button disabled={pending} name="knop" type="submit" value="opslaan">
          Opslaan
        </Button>
      </Form>
    </>
  )
}
