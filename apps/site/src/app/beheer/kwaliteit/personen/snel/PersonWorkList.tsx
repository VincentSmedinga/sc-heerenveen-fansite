'use client'

import { Button, Card, ErrorSummary, Field, Filter, Form, Heading, Link, Select, Text } from '@fansite/design-system'
import { type CSSProperties, useActionState, useEffect, useRef, useState, useSyncExternalStore } from 'react'

import type { CountryChoice } from '#src/beheer/countries'
import type { PersonFact } from '#src/beheer/person-facts'

import { positionChoices } from '#src/beheer/player-fields'

import type { PersonFactState } from './actions'

/** A person of the list, as the page hands it to the browser. */
export type PersonRow = {
  id: number
  name: string
  /** The seasons in words, "2019/20 tot en met 2021/22"; nothing for a person in no squad. */
  seasons?: string
  /** The address of the Wikipedia article, for a person who has one. */
  wikipedia?: string
}

type Props = {
  /** The action that saves a choice: `submitPersonFact`. */
  action: (
    personId: number,
    fact: PersonFact,
    previous: PersonFactState,
    formData: FormData,
  ) => Promise<PersonFactState>
  /** The countries to choose from in the list Land: those of our persons, and the others. */
  countries: { others: readonly CountryChoice[]; ours: readonly CountryChoice[] }
  /** Which list this is. */
  fact: PersonFact
  /** The address of each list, for the filter and for the link that loads the list again. */
  paths: Record<PersonFact, string>
  /** The persons of this part of the list. */
  rows: readonly PersonRow[]
  /** How many persons each list holds in all. */
  totals: Record<PersonFact, number>
}

const words: Record<PersonFact, { empty: string; many: string; one: string }> = {
  land: {
    empty: 'Er is niets meer te doen: elke persoon heeft een land.',
    many: 'personen zonder land',
    one: 'persoon zonder land',
  },
  linie: {
    empty: 'Er is niets meer te doen: elke persoon heeft een linie.',
    many: 'personen zonder linie',
    one: 'persoon zonder linie',
  },
}

// The admin is compact, with buttons and fields of 36 pixels. This list is made for a thumb on
// a phone, so its buttons and fields get the standard height of 44 pixels back.
const touch = { '--hf-size-control': '2.75rem' } as CSSProperties

const subscribeNothing = () => () => {}
const statusId = 'personen-stand'
const headingId = (id: number) => `persoon-${id}-kop`

/**
 * The work list that gives persons a line or a country (issue 1053). Every person is a card
 * with a form of its own: four buttons for the line, or a list of countries and a button. A
 * choice saves that row only and takes it out of the list; the others keep what the editor
 * chose in them. The line above the list says what was saved and how many are left, for a
 * screen reader too, and the focus goes to the next person. "Sla over" puts a person at the
 * end of the list; the person is back in place when the page loads again. Every button and
 * list names its person. Without JavaScript a choice is a plain POST that shows the list again.
 */
export function PersonWorkList({ action, countries, fact, paths, rows, totals }: Props) {
  const hydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  )
  const [order, setOrder] = useState(() => rows.map(({ id }) => id))
  const [saved, setSaved] = useState(0)
  const [message, setMessage] = useState('')
  const focus = useRef<number | undefined>(undefined)
  const byId = new Map(rows.map((row) => [row.id, row]))
  const left = totals[fact] - saved

  // After a choice the row is gone, and the focus with it: it goes to the next person, or to
  // the line that says what was saved when there is none.
  useEffect(() => {
    if (focus.current === undefined) {
      return
    }

    ;(document.getElementById(headingId(focus.current)) ?? document.getElementById(statusId))?.focus()
    focus.current = undefined
  }, [order])

  const next = (id: number) => order[order.indexOf(id) + 1] ?? order.find((other) => other !== id) ?? 0

  return (
    <>
      <Filter
        items={(['linie', 'land'] as const).map((list) => ({
          current: list === fact,
          href: paths[list],
          label: `Zonder ${list} (${list === fact ? left : totals[list]})`,
        }))}
        label="Kies een lijst"
      />
      <Text id={statusId} role="status" tabIndex={-1}>
        {message === '' ? null : `${message} `}
        {left === 0 ? words[fact].empty : `Nog ${left} ${left === 1 ? words[fact].one : words[fact].many}.`}
      </Text>
      {order.map((id) => {
        const row = byId.get(id)

        return row === undefined ? null : (
          <PersonCard
            action={action}
            countries={countries}
            fact={fact}
            key={id}
            onSaved={(text) => {
              focus.current = next(id)
              setMessage(text)
              setSaved((total) => total + 1)
              setOrder((ids) => ids.filter((other) => other !== id))
            }}
            onSkip={
              hydrated && order.length > 1
                ? () => {
                    focus.current = next(id)
                    setMessage(`${row.name} staat nu onderaan de lijst.`)
                    setOrder((ids) => [...ids.filter((other) => other !== id), id])
                  }
                : undefined
            }
            row={row}
          />
        )
      })}
      {order.length === 0 && left > 0 ? (
        <Text>
          Dit deel van de lijst is klaar. <Link href={paths[fact]}>Toon de volgende personen</Link>
        </Text>
      ) : null}
    </>
  )
}

function PersonCard({
  action,
  countries,
  fact,
  onSaved,
  onSkip,
  row,
}: Pick<Props, 'action' | 'countries' | 'fact'> & {
  onSaved: (message: string) => void
  onSkip: (() => void) | undefined
  row: PersonRow
}) {
  const [state, formAction, pending] = useActionState<PersonFactState, FormData>(action.bind(null, row.id, fact), {})
  const summaryId = `persoon-${row.id}-fouten`
  // What the link in the list of errors leads to: the list of countries, or the first button.
  const controlId = `persoon-${row.id}-${fact}`
  const told = useRef(state)

  useEffect(() => {
    if (told.current === state) {
      return
    }

    told.current = state

    if (state.error !== undefined) {
      document.getElementById(summaryId)?.focus()
    } else if (state.saved !== undefined) {
      const label =
        fact === 'linie'
          ? positionChoices.find(({ value }) => value === state.saved)?.label.toLowerCase()
          : [...countries.ours, ...countries.others].find(({ code }) => code === state.saved)?.label

      onSaved(`Opgeslagen: ${row.name}, ${label ?? state.saved}.`)
    }
  }, [countries, fact, onSaved, row.name, state, summaryId])

  return (
    <Card aria-labelledby={headingId(row.id)} style={touch}>
      <Heading id={headingId(row.id)} level={2} tabIndex={-1}>
        {row.name}
      </Heading>
      <Text appearance="meta">
        {row.seasons ?? 'In geen selectie'}
        {row.wikipedia === undefined ? null : (
          <>
            {' · '}
            <Link href={row.wikipedia}>
              Wikipedia{' '}
              <Text as="span" className="hf-visually-hidden">
                over {row.name}
              </Text>
            </Link>
          </>
        )}
      </Text>
      <ErrorSummary
        errors={state.error === undefined ? [] : [{ id: controlId, message: state.error }]}
        id={summaryId}
        level={3}
        tabIndex={-1}
      />
      <Form action={formAction}>
        {fact === 'land' ? (
          <Field error={state.error} id={controlId} label={`Land van ${row.name}`}>
            {/* The value is the key: a server answer resets the list, React keeps it. */}
            <Select defaultValue={state.land ?? ''} key={state.land ?? ''} name="land">
              <Select.Option value="">Kies een land</Select.Option>
              <Select.Group label="Landen van onze spelers">
                {countries.ours.map(({ code, label }) => (
                  <Select.Option key={code} value={code}>
                    {label}
                  </Select.Option>
                ))}
              </Select.Group>
              <Select.Group label="Andere landen">
                {countries.others.map(({ code, label }) => (
                  <Select.Option key={code} value={code}>
                    {label}
                  </Select.Option>
                ))}
              </Select.Group>
            </Select>
          </Field>
        ) : null}
        <Form.Buttons>
          {fact === 'linie' ? (
            positionChoices.map(({ label, value }, index) => (
              <Button
                aria-label={`${label} voor ${row.name}`}
                disabled={pending}
                id={index === 0 ? controlId : undefined}
                key={value}
                name="linie"
                type="submit"
                value={value}
              >
                {label}
              </Button>
            ))
          ) : (
            <Button aria-label={`Sla op: land van ${row.name}`} disabled={pending} type="submit">
              Sla op
            </Button>
          )}
          {onSkip === undefined ? null : (
            <Button appearance="soft" aria-label={`Sla over: ${row.name}`} onClick={onSkip} type="button">
              Sla over
            </Button>
          )}
        </Form.Buttons>
      </Form>
    </Card>
  )
}
