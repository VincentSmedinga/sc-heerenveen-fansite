'use client'

import { Button, Card, ErrorSummary, Field, Form, Heading, Link, Select, Text } from '@fansite/design-system'
import { type CSSProperties, useActionState, useEffect, useRef, useState } from 'react'

import type { CountryChoice } from '#src/beheer/countries'

import type { ClubCountryState } from './actions'

/** A club of the list, as the page hands it to the browser. */
export type ClubRow = {
  /** Whether sc Heerenveen played this club in a European competition. */
  europe: boolean
  name: string
  slug: string
}

type Props = {
  /** The action that saves a choice: `submitClubCountryFromList`. */
  action: (slug: string, previous: ClubCountryState, formData: FormData) => Promise<ClubCountryState>
  /** The countries to choose from, by their Dutch name. */
  countries: readonly CountryChoice[]
  /** The address of the list, for the link that loads it again. */
  path: string
  /** The clubs of this part of the list. */
  rows: readonly ClubRow[]
  /** How many clubs have no country in all, and how many of them played in Europe. */
  totals: { europe: number; total: number }
}

// The admin is compact, with buttons and fields of 36 pixels. This list is made for a thumb on
// a phone, so its buttons and fields get the standard height of 44 pixels back.
const touch = { '--hf-size-control': '2.75rem' } as CSSProperties

const statusId = 'clubs-stand'
const headingId = (slug: string) => `club-${slug}-kop`

/**
 * The work list that gives clubs a country. Every club is a card with a form of its own: a list
 * of countries and a button. A choice saves that club only and takes it out of the list; the
 * others keep what the editor chose in them. The line above the list says how many clubs still
 * have none, and how many of those played in Europe, and says what was saved, for a screen
 * reader too; the focus goes to the next club. Every list and button names its club. Without
 * JavaScript a choice is a plain POST that shows the list again.
 */
export function ClubCountryList({ action, countries, path, rows, totals }: Props) {
  const [order, setOrder] = useState(() => rows.map(({ slug }) => slug))
  const [saved, setSaved] = useState(0)
  const [savedEurope, setSavedEurope] = useState(0)
  const [message, setMessage] = useState('')
  const focus = useRef<string | undefined>(undefined)
  const bySlug = new Map(rows.map((row) => [row.slug, row]))
  const left = totals.total - saved
  const europeLeft = totals.europe - savedEurope

  // After a choice the card is gone, and the focus with it: it goes to the next club, or to the
  // line that says what was saved when there is none.
  useEffect(() => {
    if (focus.current === undefined) {
      return
    }

    ;(document.getElementById(headingId(focus.current)) ?? document.getElementById(statusId))?.focus()
    focus.current = undefined
  }, [order])

  const next = (slug: string) => order[order.indexOf(slug) + 1] ?? order.find((other) => other !== slug) ?? ''

  return (
    <>
      <Text id={statusId} role="status" tabIndex={-1}>
        {message === '' ? null : `${message} `}
        {left === 0
          ? 'Er is niets meer te doen: elke club heeft een land.'
          : `Nog ${left} ${left === 1 ? 'club' : 'clubs'} zonder land, ${europeLeft} van wedstrijden in Europa.`}
      </Text>
      {order.map((slug) => {
        const row = bySlug.get(slug)

        return row === undefined ? null : (
          <ClubCard
            action={action}
            countries={countries}
            key={slug}
            onSaved={(text) => {
              focus.current = next(slug)
              setMessage(text)
              setSaved((total) => total + 1)
              setSavedEurope((total) => total + (row.europe ? 1 : 0))
              setOrder((slugs) => slugs.filter((other) => other !== slug))
            }}
            row={row}
          />
        )
      })}
      {order.length === 0 && left > 0 ? (
        <Text>
          Dit deel van de lijst is klaar. <Link href={path}>Toon de volgende clubs</Link>
        </Text>
      ) : null}
    </>
  )
}

function ClubCard({
  action,
  countries,
  onSaved,
  row,
}: Pick<Props, 'action' | 'countries'> & { onSaved: (message: string) => void; row: ClubRow }) {
  const [state, formAction, pending] = useActionState<ClubCountryState, FormData>(action.bind(null, row.slug), {})
  const summaryId = `club-${row.slug}-fouten`
  // What the link in the list of errors leads to: the list of countries.
  const controlId = `club-${row.slug}-land`
  const told = useRef(state)

  useEffect(() => {
    if (told.current === state) {
      return
    }

    told.current = state

    if (state.error !== undefined) {
      document.getElementById(summaryId)?.focus()
    } else if (state.saved !== undefined) {
      onSaved(`Opgeslagen: ${row.name}, ${countries.find(({ code }) => code === state.saved)?.label ?? state.saved}.`)
    }
  }, [countries, onSaved, row.name, state, summaryId])

  return (
    <Card aria-labelledby={headingId(row.slug)} style={touch} surface="warm">
      <Heading id={headingId(row.slug)} level={2} tabIndex={-1}>
        {row.name}
      </Heading>
      <Text appearance="meta">{row.europe ? 'Speelde tegen ons in Europa' : 'Geen wedstrijd in Europa'}</Text>
      <ErrorSummary
        errors={state.error === undefined ? [] : [{ id: controlId, message: state.error }]}
        id={summaryId}
        level={3}
        tabIndex={-1}
      />
      <Form action={formAction}>
        <Field error={state.error} id={controlId} label={`Land van ${row.name}`}>
          {/* The value is the key: a server answer resets the list, React keeps it. */}
          <Select defaultValue={state.land ?? ''} key={state.land ?? ''} name="land">
            <Select.Option value="">Kies een land</Select.Option>
            {countries.map(({ code, label }) => (
              <Select.Option key={code} value={code}>
                {label}
              </Select.Option>
            ))}
          </Select>
        </Field>
        <Form.Buttons>
          <Button aria-label={`Sla op: land van ${row.name}`} disabled={pending} type="submit">
            Sla op
          </Button>
        </Form.Buttons>
      </Form>
    </Card>
  )
}
