'use client'

import { Button, ErrorSummary, Form, Notice, RatingScale, Text } from '@fansite/design-system'
import { type ChangeEvent, useActionState, useEffect, useState, useSyncExternalStore } from 'react'

import {
  closedMessage,
  counterText,
  gradeField,
  keptText,
  lateMessage,
  playerLine,
  ratingMatchField,
  type RatingPlayer,
  type RatingState,
  scaleId,
  summaryTitle,
} from '#src/fans/rating'

import { saveRatingsAction } from './actions'

// The form of the grades: a rating scale for each player and one button. It is a client
// component only to show what the server says and to count: the form is a plain POST that
// works without JavaScript, and then it has no counter. After an error the focus goes to the
// summary, whose links bring it to the scales. The notice is in the page from the start,
// empty, so a screen reader announces it when it fills.
export function RatingForm({
  matchId,
  players,
  saved,
}: {
  matchId: number
  players: readonly RatingPlayer[]
  /** The grades the supporter gave before, by the number of the appearance. */
  saved: Readonly<Record<number, string>>
}) {
  const [state, action] = useActionState<RatingState, FormData>(saveRatingsAction, {
    errors: {},
    values: saved,
  })
  // What the player has chosen since the last answer of the server: the number of grades that
  // are left. Until then it follows the grades the server has.
  const [counted, setCounted] = useState<undefined | { left: number; state: RatingState }>()
  const enhanced = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )
  const left = counted?.state === state ? counted.left : players.length - Object.keys(state.values).length
  const summary = players.flatMap((player) => {
    const message = state.errors[player.appearanceId]

    return message === undefined ? [] : [{ id: scaleId(player.appearanceId), message }]
  })
  const notice = state.failure === 'closed' ? closedMessage : state.failure === 'late' ? lateMessage : undefined

  useEffect(() => {
    if (summary.length > 0) {
      document.getElementById('cijfers-fouten')?.focus()
    } else if (state.failure !== undefined) {
      document.getElementById('cijfers-melding')?.focus()
    }
    // Only a new answer of the server moves the focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const choose = (event: ChangeEvent<HTMLFormElement>) => {
    const answered = new Set([...new FormData(event.currentTarget).keys()].filter((name) => /^cijfer-\d+$/.test(name)))

    setCounted({ left: players.length - answered.size, state })
  }

  return (
    <>
      <ErrorSummary errors={summary} id="cijfers-fouten" level={3} tabIndex={-1} title={summaryTitle(summary.length)} />
      {summary.length > 0 ? <Text>{keptText}</Text> : null}
      <Notice id="cijfers-melding" tabIndex={-1}>
        {notice}
      </Notice>
      <Form action={action} onChange={choose}>
        {players.map((player) => (
          <RatingScale
            aria-label={`Cijfer voor ${player.name}`}
            error={state.errors[player.appearanceId]}
            id={scaleId(player.appearanceId)}
            key={player.appearanceId}
            legend={player.name}
            line={playerLine(player)}
            name={gradeField(player.appearanceId)}
            required={false}
            value={state.values[player.appearanceId]}
          />
        ))}
        <Button name={ratingMatchField} type="submit" value={matchId}>
          Cijfers opslaan
        </Button>
        {enhanced ? (
          <Text appearance="meta" role="status">
            {counterText(left, players.length)}
          </Text>
        ) : null}
      </Form>
    </>
  )
}
