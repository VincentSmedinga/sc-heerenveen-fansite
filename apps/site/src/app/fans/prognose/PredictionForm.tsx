'use client'

import type { ScoreField } from '@fansite/design-system'

import { Button, Disclosure, ErrorSummary, Form, Notice, ScoreGrid, Text } from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import {
  closedMessage,
  fieldId,
  matchField,
  predictionFields,
  type PredictionState,
  type PredictionValues,
  savedMessage,
} from '#src/fans/prediction'

import { savePredictionAction } from './actions'

// The form of the prediction: the four numbers in the ScoreGrid and one button. It is a client
// component only to show what the server says: the form is a plain POST that works without
// JavaScript, and with JavaScript the page doesn't reload. The notice is in the page from the
// start, empty, so a screen reader announces it when it fills. After an error the focus goes to
// the summary, whose links bring it to the fields.
export function PredictionForm({
  awayName,
  behindButton = false,
  homeName,
  matchId,
  saved,
}: {
  awayName: string
  /**
   * Puts the form behind the button Voorspellen, for the match under one that has begun.
   * After a submit the answer must show, also without JavaScript, so the fold is open then.
   */
  behindButton?: boolean
  homeName: string
  matchId: number
  /** What the supporter predicted before, or nothing. */
  saved: PredictionValues | undefined
}) {
  const [state, action] = useActionState<PredictionState, FormData>(savePredictionAction, {
    errors: {},
    values: saved ?? {},
  })
  const summaryId = `voorspelling-${matchId}-fouten`
  const noticeId = `voorspelling-${matchId}-melding`
  const ids = Object.fromEntries(predictionFields.map((field) => [field, fieldId(matchId, field)]))
  const summary = predictionFields.flatMap((field) => {
    const message = state.errors[field]

    return message === undefined ? [] : [{ id: fieldId(matchId, field), message }]
  })
  const hasPrediction = saved !== undefined || state.saved !== undefined
  const notice =
    state.saved === undefined
      ? state.failure === undefined
        ? undefined
        : closedMessage
      : savedMessage(state.values, state.saved.changed)

  useEffect(() => {
    if (summary.length > 0) {
      document.getElementById(summaryId)?.focus()
    } else if (state.failure !== undefined) {
      document.getElementById(noticeId)?.focus()
    }
    // Only a new answer of the server moves the focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const answered = summary.length > 0 || state.saved !== undefined || state.failure !== undefined
  const form = (
    <>
      <ErrorSummary errors={summary} id={summaryId} level={3} tabIndex={-1} title="Er ontbreekt nog iets" />
      <Notice id={noticeId} tabIndex={-1}>
        {notice}
      </Notice>
      <Form action={action}>
        <ScoreGrid
          awayName={awayName}
          defaultValues={state.values}
          errors={state.errors as Partial<Record<ScoreField, string>>}
          homeName={homeName}
          ids={ids}
          legend="Jouw voorspelling"
        />
        <Text>Na 90 minuten plus blessuretijd, ook in de beker.</Text>
        <Button name={matchField} type="submit" value={matchId}>
          {hasPrediction ? 'Wijziging opslaan' : 'Voorspelling opslaan'}
        </Button>
      </Form>
    </>
  )

  return behindButton ? (
    <Disclosure open={answered || undefined} summary="Voorspellen">
      {form}
    </Disclosure>
  ) : (
    form
  )
}
